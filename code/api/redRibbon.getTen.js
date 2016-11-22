/******************************************************************************
 * 军团宝藏
 * 10连抽
 * Create by MR.Luo.
 * Create at 14-7-17.
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

    var redRibbonConfig = null;     // 活动配置
    var sTime = 0;                  // 活动开始时间
    var eTime = 0;                  // 活动结束时间

    var userData = null;            // 用户数据

    var point = 0;                  // 后台点数
    var rwWord = null;                // 随机索引表
    var rIndexArr = [];

    var moneyType = null;           // 需要的货币类型
    var moneyCost = 0;              // 需要的货币数量

    var rwInfoArr = [];             // 奖励数据

    var gRes = {};
    var costArr = [];               // 消耗道具列表
    var rtnArr = [];                // 获得道具列表

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
                        moneyCost = redRibbonConfig["imeggaPay"] * 10;
                    } else { // 不能10连抽
                        cb("cannotGetTen");
                        return;
                    }

                    cb(null);
                }
            });
        },
        function(cb) { // 判断玩家货币是否足够
            if (userData["ingot"] < moneyCost) { // 伊美加币
                cb("noRMB");
                return;
            }
            cb(null);
        },
        function(cb) { // 计算奖品INDEX
            async.until(function(){ // 判断是否抽到10条
                return rwInfoArr.length == 10;
            }, function(ucb){

                // 特殊奖励抽取
                if (point >= redRibbonConfig["pointToGood"]) {
                    var prop = (point - redRibbonConfig["pointToGood"]) / (redRibbonConfig["pointGoodMax"] - redRibbonConfig["pointToGood"]);
                    if (prop != 0) {
                        var random = Math.random();
                        if (random >= 0 && random < prop) { // 抽到了特殊的
                            var goodContent = redRibbonConfig["goodContent"];
                            rIndexArr.push(8); // 特殊奖励
                            rwInfoArr.push(__randomItemFromArray(goodContent));
                            point = Math.max(0, point - redRibbonConfig["pointGoodReduce"]);
                            ucb(null);
                            return;
                        }
                    }
                }

                // 最后一天抽取
                // if (jutil.compTimeDay(jutil.now(), eTime)) {
                //     for (var i=1;i<=7;++i) { // 索引1-7
                //         if (!jutil.bitGet(rwWord, i-1)) {
                //             rIndexArr.push(i);
                //             rwInfoArr.push(__randomItemFromArray(redRibbonConfig["badContent"][i]));
                //             ucb(null);
                //             return;
                //         }
                //     }
                // }

                // 普通抽取
                var randomVal = Math.random();
                var badProb = redRibbonConfig["badProb"];
                var baseVal = 0;
                for (var key in badProb) {
                    if (badProb.hasOwnProperty(key)) {
                        if (randomVal >= baseVal && randomVal < (badProb[key] - 0 + baseVal)) {
                            rIndexArr.push(key);
                            rwInfoArr.push(__randomItemFromArray(redRibbonConfig["badContent"][key]));
                            ucb(null);
                            return;
                        }
                        baseVal += badProb[key] - 0;
                    }
                }

            }, function(err){
                if (err) cb(err);
                else cb(null);
            });
        },
        function(cb) { // 扣除货币
            if (moneyCost < 0) {
                cb("moneyCost is neg!");
                return;
            }

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
        },
        function(cb) { // 添加道具
            if (rwInfoArr.length <= 0) {
                cb("configError");
                return;
            }


            gRes["itemGetList"] = rwInfoArr; // 这次获取的道具信息

            async.eachSeries(Object.keys(rwInfoArr), function(key, esCb){
                var rwInfo = rwInfoArr[key];
                __rwHandler(userUid, rwInfo["id"], rwInfo["count"], function(err, res){
                    if (err) console.error(err);
                    else if (res) {
                        rtnArr.push(res);
                    }
                    esCb(null);
                });
            }, function(err){
                cb(null);
            });
        },
        function(cb) { // 更新数据
            point = point + redRibbonConfig["imeggaPointAdd"] * 10;

            redRibbon.updateDataTen(userUid, sTime, point, rIndexArr, function(err, res){
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
            response.echo("redRibbon.getTen", jutil.errorInfo(err));
        } else {
            gRes["costList"] = costArr;
            gRes["getList"] = rtnArr;
            gRes["rIdxArr"] = rIndexArr;
            response.echo("redRibbon.getTen", gRes);
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