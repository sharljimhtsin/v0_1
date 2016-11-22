/**
 * 参拜接口
 * User: liyuluan
 * Date: 13-11-18
 * Time: 下午4:05
 */

var userVariable = require("../model/userVariable");
var practice = require("../model/practice");
var async = require("async");
var jutil = require("../utils/jutil");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var vitality = require("../model/vitality");

/**
 * practice.daily
 *
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    var userUid = query["userUid"];
    var configData = configManager.createConfig(userUid);

    var dailyData = null;//参拜的数据
    var canReceive = false; //是否可领取

    var gRewardProb = null;//掉落组
    var gItemId = null;//掉落的物品ID
    var gCompletedDay = 0;//到当前已完成次数
    var gCompleteDay = 0;//需要完成总数
    var gDailyReceive = 0;//当前完整的参拜数
    var gNewBoxPoint = null;//写入新的boxPoint

    var rewardObj = null;

    async.series([
        function (cb) { //
            practice.getDailyData(userUid, function (err, res) {
                if (err) cb("dbError");
                else {
                    dailyData = res;
                    var dayData = dailyData["dayData"];
                    if (jutil.compTimeDay(dayData["lastTime"], jutil.now()) == true) { //如果上次参拜是今天，则忽略
                        cb("haveDaily");
                    } else if (jutil.compTimeDay(dayData["lastTime"], jutil.now() - 86400) == false) { //如果上次参数不是昨天， 则重置
                        canReceive = false;
                        gCompletedDay = 1;
                        gDailyReceive = dailyData["dailyReceive"] - 0;
                        gCompleteDay = dayData["completeDay"];
                        cb(null);
                    } else {
                        if (dayData["completedDay"] - 0 + 1 >= dayData["completeDay"]) { //已参拜数已够总需求,
                            canReceive = true;
                            gCompletedDay = 0;
                            gDailyReceive = dailyData["dailyReceive"] - 0 + 1;
                            var nextCompleteDay = [3, 6, 5, 5]; //为了少次数据访问，写死
                            gCompleteDay = (gDailyReceive >= nextCompleteDay.length) ? 5 : nextCompleteDay[gDailyReceive];
                            cb(null);
                        } else { //已参拜数未够总需求
                            canReceive = false;
                            gCompletedDay = dayData["completedDay"] - 0 + 1;
                            gDailyReceive = dailyData["dailyReceive"] - 0;
                            gCompleteDay = dayData["completeDay"];
                            cb(null);
                        }
                    }
                }
            });
        },
        function (cb) { //取掉落组数据
            if (canReceive == true) {
                var dailyConfig = configData.getConfig("growth")["daily"];
                var dailyGrowthConfig = dailyConfig["reward"];
                var dailyGrowthConfigItem = dailyGrowthConfig[dailyData["dailyIndex"]];
                var boxPointToGood = dailyConfig["boxPointToGood"] - 0; //到此点数，随机goodRewardProb组物品
                var boxPointReduce = dailyConfig["boxPointReduce"] - 0; //随机出goodRewardProb后扣掉的点数
                userVariable.getVariable(userUid, "boxPoint", function (err, res) {
                    if (err) cb("dbError");
                    else {
                        var currentBoxPoint = (res || 0) - 0;
                        if (currentBoxPoint >= boxPointToGood) {
                            if (Math.random() >= 0.5) {
                                gRewardProb = dailyGrowthConfigItem["goodRewardProb"];
                                gNewBoxPoint = currentBoxPoint - boxPointReduce;
                            } else {
                                gRewardProb = dailyGrowthConfigItem["badRewardProb"];
                            }
                        } else {
                            gRewardProb = dailyGrowthConfigItem["badRewardProb"];
                        }
                        cb(null);
                    }
                });
            } else {
                cb(null);
            }
        },
        function (cb) { //掉落数据
            if (canReceive == true) {
                var mRandom = Math.random();
                for (var key in gRewardProb) {
                    var mItem = gRewardProb[key];
                    if (mItem["minProb"] <= mRandom && mItem["maxProb"] > mRandom) {
                        gItemId = mItem["itemId"];
                        break;
                    }
                }
                cb(null);
            } else {
                cb(null);
            }
        },
        function (cb) { //写入掉落
            if (canReceive == true) {
                mongoStats.dropStats(gItemId, userUid, '127.0.0.1', null, mongoStats.PRACTICE_DAILY, 1);
                modelUtil.addDropItemToDB(gItemId, 1, userUid, 0, 1, function (err, res) {
                    if (err) cb("dbError");
                    else {
                        rewardObj = res;
                        cb(null);
                    }
                });
            } else {
                cb(null);
            }
        },
        function (cb) {//减掉botPoint
            if (canReceive == true && gNewBoxPoint !== null) {
                userVariable.setVariable(userUid, "boxPoint", gNewBoxPoint, function (err, res) {
                    cb(null);
                    if (err) console.error("practice.daily", userUid, gNewBoxPoint, err.stack);
                });
            } else {
                cb(null);
            }
        },
        function (cb) { //写入今天参拜值
            practice.setDailyData(userUid, gDailyReceive, gCompletedDay, jutil.now(), function (err, res) {
                cb(null);
                if (err) console.error(userUid, gDailyReceive, gCompletedDay, err.stack);
            });
        }
    ], function (err, res) {
        if (err) response.echo("practice.daily", jutil.errorInfo(err));
        else {
            vitality.vitality(userUid, "daily", {"completeCnt":1}, function(){});

            response.echo("practice.daily", {"completedDay": gCompletedDay,
                "completeDay": gCompleteDay,
                "lastTime": jutil.now(),
                "reward": gItemId,
                "rewardObj": rewardObj});
        }
    });
}

exports.start = start;