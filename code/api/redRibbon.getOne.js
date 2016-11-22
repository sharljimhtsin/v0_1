/******************************************************************************
 * 红缎带军团
 * 取宝一次
 * Create by MR.Luo.
 * Create at 14-7-11.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var user = require("../model/user");
var activityConfig = require("../model/activityConfig");
var mongoStats = require("../model/mongoStats");
var modelUtil = require("../model/modelUtil");
var redRibbon = require("../model/redRibbon");

exports.start = function(postData, response, query) {
    var userUid = query["userUid"];

    var redRibbonConfig = null; // 活动配置
    var sTime = 0; // 活动开始时间
    var eTime = 0; // 活动结束时间

    var userData = null; // 用户数据

    var point = 0; // 后台点数
    var rwWord = null; // 随机索引表
    var rIndex = null;

    var moneyType = null; // 需要的货币类型
    var moneyCost = 0; // 需要的货币数量

    var rwInfo = null; // 奖励数据

    var gRes = {};
    var costArr = [];
    var rtnArr = [];

    async.series([
        function(cb) { // 判断活动是否开放
            activityConfig.getConfig(userUid, redRibbon.ACTIVITY_CONFIG_NAME, function(err, res){
                if (err) cb(err);
                else {
                    if (res[0]) {
                        sTime = res[4];
                        eTime = res[5];
                        redRibbonConfig = res[3]; //静态配置
                        cb(null);
                    } else {
                        cb("notOpen");
                    }
                }
            });
        },
        function(cb) { // 获取用户数据
            user.getUser(userUid, function(err, res){
                if (err || res == null) cb("dbError");
                else {
                    userData = res;
                    cb(null);
                }
            });
        },
        function(cb) { // 获取数据
            redRibbon.getData(userUid, sTime, function(err, res){
                if (err) cb(err);
                else {
                    point = res["point"];
                    rwWord = res["rwWord"];

                    if (res["dayGetNum"] >= redRibbonConfig["zeniTime"]) {
                        moneyType = "ingot";
                        moneyCost = redRibbonConfig["imeggaPay"];
                    } else {
                        moneyType = "gold";
                        moneyCost = redRibbonConfig["zeniPay"];
                    }

                    cb(null);
                }
            });
        },
        function(cb) { // 判断玩家货币是否足够
            if (moneyType == "ingot") {
                if (userData["ingot"] < moneyCost) { // 伊美加币
                    cb("noRMB");
                    return;
                }
            } else {
                if (userData["gold"] < moneyCost) { // 索尼币
                    cb("noMoney");
                    return;
                }
            }
            cb(null);
        },
        function(cb) { // 计算奖品INDEX
            if (point >= redRibbonConfig["pointToGood"]) { // 判断能否抽取特殊奖励
                var prop = (point - redRibbonConfig["pointToGood"]) / (redRibbonConfig["pointGoodMax"] - redRibbonConfig["pointToGood"]);
                if (prop != 0) {
                    var random = Math.random();
                    if (random >= 0 && random < prop) { // 抽到了特殊的
                        var goodContent = redRibbonConfig["goodContent"];
                        rIndex = 8; // 特殊奖励
                        rwInfo = __randomItemFromArray(goodContent);
                        point = Math.max(0, point - redRibbonConfig["pointGoodReduce"]);
//                        console.log("redRibbon:抽到特殊奖励["+ rwInfo["id"] +"]，当前积分:" + point);
                        cb(null);
                        return;
                    }
                }
            }

            if (jutil.compTimeDay(jutil.now(), eTime)) { // 判断是否最后一天
                for (var i=1;i<=7;++i) {
                    if (!jutil.bitGet(rwWord, i-1)) {
                        rIndex = i;
                        rwInfo = __randomItemFromArray(redRibbonConfig["badContent"][i]);
//                        console.log("redRibbon:抽到奖励["+ rwInfo["id"] +"]");
                        cb(null);
                        return;
                    }
                }
            }

            var randomVal = Math.random();
            var badProb = redRibbonConfig["badProb"];
            var baseVal = 0;
            for (var key in badProb) {
                if (badProb.hasOwnProperty(key)) {
                    if (randomVal >= baseVal && randomVal < (badProb[key] - 0 + baseVal)) {
                        rIndex = key;
                        rwInfo = __randomItemFromArray(redRibbonConfig["badContent"][key]);
//                        console.log("redRibbon:抽到奖励["+ rwInfo["id"] +"]");
                        cb(null);
                        return;
                    }
                    baseVal += badProb[key] - 0;
                }
            }
            cb("noRandomReward");
        },
        function(cb) { // 扣除货币
            if (moneyCost < 0) {
                cb("moneyCost is neg!");
                return;
            }

            if (moneyType == "ingot") { // 扣除伊美加币
                var newIngotData = {"ingot":Math.max(userData["ingot"] * 1 - moneyCost * 1, 0)};
                user.updateUser(userUid, newIngotData, function(err, res) {
                    if (err) {
                        cb(err);
                    } else {
                        costArr.push(newIngotData);
                        mongoStats.expendStats("ingot", userUid, '127.0.0.1', null, mongoStats.E_REDRIBBON, moneyCost);
                        cb(null);
                    }
                });
            } else {
                var newGoldData = {"gold":Math.max(userData["gold"] * 1 - moneyCost * 1, 0)};
                user.updateUser(userUid, newGoldData, function(err, res) {
                    if (err) {
                        cb(err);
                    } else {
                        costArr.push(newGoldData);
                        cb(null);
                    }
                });
            }
        },
        function(cb) { // 添加道具
            if (!rwInfo) {
                cb("configError");
                return;
            }

            gRes["itemGet"] = rwInfo; // 这次获取的道具信息

            __rwHandler(userUid, rwInfo["id"], rwInfo["count"], function(err, res){
                if (err) console.error(err);
                else if (res) {
                    rtnArr.push(res);
                }
                cb(null);
            });
        },
        function(cb) { // 更新数据
            if (moneyType == "ingot") {
                point = point + redRibbonConfig["imeggaPointAdd"];
            } else {
                point = point + redRibbonConfig["zeniPointAdd"];
            }

            redRibbon.updateData(userUid, sTime, point, rIndex, function(err, res){
                if (err) console.error(err);
                else {
                    gRes["score"] = res["score"];
                    gRes["scoreMask"] = res["scoreMask"];
                    var dayGetNum = res["dayGetNum"];
                    if (dayGetNum >= redRibbonConfig["zeniTime"]) {
                        gRes["costType"] = "ingot"; // 消费类别
                        gRes["cost"] = redRibbonConfig["imeggaPay"];
                    } else {
                        gRes["costType"] = "gold";
                        gRes["cost"] = redRibbonConfig["zeniPay"];
                    }
                }
                cb(null);
            });
        }
    ], function(err){
        if (err) {
            response.echo("redRibbon.getOne", jutil.errorInfo(err));
        } else {
            gRes["costList"] = costArr;
            gRes["getList"] = rtnArr;
            gRes["rIdx"] = rIndex;
            response.echo("redRibbon.getOne", gRes);
        }
    });
};

function __randomItemFromArray(arr) {
    var randomIdx = Math.floor(Math.random() * arr.length);
    return arr[randomIdx];
}

function __rwHandler(userUid, id, count, cb) {
    mongoStats.dropStats(id, userUid, 0, null, mongoStats.RED_RIBBON, count);
    switch (id) {
        default:
            modelUtil.addDropItemToDB(id,count,userUid,0,1,function(err,res) {
                if (err) cb(err);
                else {
                    cb(null, res);
                }
            });
            break;
    }
}