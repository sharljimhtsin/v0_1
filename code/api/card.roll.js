/**
 * 抽卡（练气）
 * User: liyuluan
 * Date: 13-11-22
 * Time: 下午4:13
 */
var jutil = require("../utils/jutil");
var user = require("../model/user");
var userVariable = require("../model/userVariable");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var card = require("../model/card");
var itemModel = require("../model/item");
var async = require("async");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");

/**
 * 参数：
 *      type 1 普通 2 十连抽
 * 返回：
 *       ｛"rewardSex":掉落的真元,"sex":玩家具有真元，"beauty":垃圾,"cardList":抽到的列表，"rollPosition"：{"value":位置,"time":时间},"userData":{"gold":金钱数}};
 *
 * PS.      如果金钱不够不会报错，会返回没有变化的数据 sex值为null
 *
 *
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    if (jutil.postCheck(postData, "type") == false ){
        response.echo("card.roll", jutil.errorInfo("postError"));
        return;
    }
    var type = postData["type"];
    var userUid = query["userUid"];
    if (type != 1 && type != 2 && type != 3) {
        response.echo("card.roll", jutil.errorInfo("postError"));
        return;
    }

    var configData = configManager.createConfig(userUid);
    var rollCardConfig = configData.getConfig("rollCard");


//    var sql = "DELETE FROM hero WHERE userUid=? AND heroUid IN(?)";
//    sql = mysql.getDB().format(sql,[userUid,heroUids]);

    var gUserData = null;//用户数据
    var gCardRollPos = 1;//卡片随机到位置
    var gFreeGold = 0; //可免费金钱
    var gRollRes = null;//抽卡结果

    var rCardList = null;//返回卡片列表
    var rNewUserGold = 0;//新的用户金钱数
    var rSex = null;
    var rNextTime = 0;//下一次的时间
    var userIP = '127.0.0.1';//response.response.socket.remoteAddress;

    async.series([
        function(cb) { //取用户数据
            user.getUser(userUid,function(err,res) {
                if (err || res == null) cb("dbError");
                else {
                    gUserData = res;
                    cb(null);
                }
            });
        },
        function(cb) { //取当前随机到的位置
            userVariable.getVariableTime(userUid,"cardRollPos", function(err, res) {
                if (err) cb("dbError");
                else if (res == null) {
                    gCardRollPos = 1;
                    gFreeGold = rollCardConfig["getGroup"][1]["cost"];
                } else {
                    gCardRollPos = res["value"];
                    var mTime = res["time"];
//                    var rollCD = rollCardConfig["getGroup"][gCardRollPos]["cd"] - 0;
                    if (jutil.now() >= mTime) {
                        gFreeGold = rollCardConfig["getGroup"][gCardRollPos]["cost"];
                    } else {
                        gFreeGold = 0;
                    }
                }
                cb(null);
            });
        },
        function(cb) { //进行随机
            var mCount = 1;
            if (type == 2) mCount = 10;
            else if (type == 3) mCount = 100;

            var mUserGold = gUserData["gold"];
            gRollRes = roll(gCardRollPos, mCount, rollCardConfig, mUserGold, gFreeGold);
            var mCardList = gRollRes[2];
            if (mCardList.length == 0) {
                cb(null);
            } else {
                var analytic = {};
                for (var i in mCardList) {
                    if(mCardList[i] > 170400 && mCardList[i] <= 170410){
                        if(!analytic.hasOwnProperty(mCardList[i]))
                            analytic[mCardList[i]] = 0;
                        analytic[mCardList[i]]++;
                    }
                }
                for(var i in analytic){
                    mongoStats.dropStats(i, userUid, userIP, gUserData, mongoStats.D_ROLL1, analytic[i]);
                }
                card.addCardList(userUid,mCardList,function(err,res) {
                    if (err) cb("dbError");
                    else {
                        rCardList = res;
                        cb (null);
                    }
                });
            }
        },
        function(cb) { //加真元（色情杂志）
            if (gRollRes[0] <= 0) {
                cb(null);
            } else {
                mongoStats.dropStats("151601", userUid, userIP, gUserData, mongoStats.D_ROLL1, gRollRes[0]);
                itemModel.updateItem(userUid,"151601",gRollRes[0],function(err,res) {
                    if (err) cb("dbError");
                    else {
                        rSex = res["number"];
                        cb(null);
                    }
                });
            }
        },
        function(cb) { //扣钱
            var mNeedGold = gRollRes[4]; //消耗的金币数
            var mBeautyGold = gRollRes[5]; //返还的金币数
            var mUserGold = gUserData["gold"]; //用户金币
            var mNewUserGold = mUserGold - mNeedGold + (mBeautyGold - 0);//
            rNewUserGold = mNewUserGold;
            mongoStats.expendStats("gold", userUid, userIP, gUserData, mongoStats.D_ROLL, mNeedGold - mBeautyGold);
            //TODO: 根据 type 分支
            stats.recordWithLevelIndex(type, [mongoStats.cardRoll1, mongoStats.cardRoll2], function (tag) {
                stats.events(userUid, "127.0.0.1", null, tag);
            });
            user.updateUser(userUid,{"gold":mNewUserGold}, function(err, res) {
                cb (null);
                if (err) console.error("card.roll", err.stack);
            });
        },
        function(cb) { //更新位置
            var mCurrentPos = gRollRes[3];

            var rollCD = configData.g("rollCard")("getGroup")(gCardRollPos)("cd")() - 0;
            rNextTime = jutil.now() + rollCD

            userVariable.setVariableTime(userUid,"cardRollPos",mCurrentPos, rNextTime, function(err,res) {
                cb(null);
                if (err) console.error("card.roll2", err.stack);
            });
        }
    ], function(err) {
        if (err) response.echo("card.roll",jutil.errorInfo(err));
        else {
            var resultData = {};
            resultData["rewardSex"] = gRollRes[0];
            resultData["sex"] = rSex;
            resultData["beauty"] = gRollRes[1];
            resultData["cardList"] = rCardList;
            resultData["rollPosition"] = {"value":gRollRes[3],"time":rNextTime};
            resultData["userData"] = {"gold":rNewUserGold};
            response.echo("card.roll",resultData);
        }
    });
}

/**
 * 随机出card列表
 * [真元掉落数量,垃圾次数,掉落的卡片列表,最后停留的位置,总共消耗金币,抽到垃圾返还的金钱数];
 *
 * @param startPos 开始位
 * @param count 随机次数
 * @param rollCardConfig 随机配置
 * @param userGold 用户钱数
 * @param freeGold 可以免费的钱数
 */
function roll(startPos, count, rollCardConfig, userGold, freeGold) {
    var needGold = 0 - freeGold;
    var currentPos = startPos;
    var getGroupConfig = rollCardConfig["getGroup"];
    var sexNumber = 0;
    var beautyNumber = 0;
    var cardList = [];

    for (var i = 0; i < count; i++) {
        var mItemConfig = getGroupConfig[currentPos];
        var cost = mItemConfig["cost"] - 0;
        if (needGold + cost > userGold) { //不够钱则退出
            break;
        }
        needGold += cost;
        var groupProbConfig = mItemConfig["getGroupProb"];
        var probRandom = Math.random();
        var probRandomRes = "beauty";
        for (var key in groupProbConfig) {
            var probItem = groupProbConfig[key];
            if (probRandom >= probItem["minProb"] && probRandom < probItem["maxProb"]) {
                probRandomRes = key;
                break;
            }
        }
        if (probRandomRes == "beauty") beautyNumber++;
        else if (probRandomRes == "sex") sexNumber++;
        else {
            var groupConfig = rollCardConfig["group"];
            var cardProbConfig = groupConfig[probRandomRes]["cardProb"];
            var cardRandom = Math.random();
            var cardRandomRes = null;
            for (var key in cardProbConfig) {
                var cardProbItem = cardProbConfig[key];
                if (cardRandom >= cardProbItem["minProb"] && cardRandom < cardProbItem["maxProb"]) {
                    cardRandomRes = key;
                    break;
                }
            }
            cardList.push(cardRandomRes);
        }

        var stepUpProb = mItemConfig["stepUpProb"] - 0;
        if (Math.random() < stepUpProb) {
            currentPos = currentPos - 0 + 1;
        } else {
            currentPos = 1;
        }
    }
    var beautyGold = beautyNumber * rollCardConfig["beautyCost"];// 抽到垃圾返还的金钱数
    return [sexNumber,beautyNumber,cardList,currentPos,needGold, beautyGold];
}



exports.start = start;