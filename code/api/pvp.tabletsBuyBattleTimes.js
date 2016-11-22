/**
 * 神位争夺（跨服战）购买挑战次数
 * User: peter.wang
 * Date: 14-11-22
 * Time: 下午
 */

var async = require("async");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var user = require("../model/user");
var gsData = require("../model/gsData");
var gsTabletsUser = require("../model/gsTabletsUser");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "count") == false) {
        response.echo("pvp.tabletsBuyBattleTimes", jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var count = postData["count"] - 0;

    if (count - 0 <= 0) {
        response.echo("pvp.tabletsBuyBattleTimes", jutil.errorInfo("postError"));
        return;
    }

    var configData  = configManager.createConfig(userUid);

    var issueId = 0;
    var activityConfig = {};
    var dailyBuyTime = 0;
    var challengeTimes = 0;
    var resultUserIngot = 0;
    async.series([
        function (cb) {// 开服时间
            gsTabletsUser.checkUserServerStatus(userUid, function (err, res) {
                if (err) cb(err);
                else if (res == 0) cb("postError");
                else {
                    cb(null);
                }
            });
        },
        function (cb) {// 是否活动中
            gsData.getCurIssueId(userUid, gsData.GS_TABLETSCOMPETE, function (err, res) {
                if (err) cb(err);
                else if (res == 0) cb("gpActivityEnd");
                else {
                    issueId = res;
                    cb(null);
                }
            });
        },
        function (cb) {
            gsData.getActivityConfig(userUid, gsData.GS_TABLETSCOMPETE, function (err, res) {
                if (err) cb(err);
                else {
                    activityConfig = res[2];
                    cb(null);
                }
            })
        },
        function (cb) {
            gsTabletsUser.getTabletsUser(userUid, issueId, function (err, res) {
                if (err) cb(err);
                else if(res==null) cb("postError");
                else {
                    challengeTimes = res["dailyBattleTime"] - 0;
                    dailyBuyTime = res["dailyBuyTime"] - 0 + count;
                    if (dailyBuyTime > activityConfig["maxBattleBuyTime"]) {
                        cb("noEnoughBuyTimes");
                    } else {
                        user.getUser(userUid, function (err, res) {
                            if (err) cb(err);
                            else {
                                var needIngot = (activityConfig["battleTimeCost"] - 0) * count;
                                resultUserIngot = res["ingot"] - 0 - needIngot;
                                if (resultUserIngot < 0) cb("ingotNotEnough");
                                else {
                                    var newIngot = {"ingot": resultUserIngot};
                                    user.updateUser(userUid, newIngot, function (err, res) {
                                        if (err) cb(err);
                                        else {
                                            cb(null);
                                            var mongoStats = require("../model/mongoStats");
                                            mongoStats.expendStats("ingot", userUid, '127.0.0.1', null, mongoStats.E_TABLETS_BUYTIME, needIngot);
                                        }
                                    });
                                }
                            }
                        })
                    }
                }
            })
        },
        function (cb) { // 更新
            var newValueData = {"dailyBuyTime": dailyBuyTime, "dailyTimeLastUpdateTime": jutil.now()}
            gsTabletsUser.updateTabletsUser(userUid, issueId, newValueData, function (err, res) {
                if (err) cb(err);
                else cb(null);
            })
        }
    ], function (err, res) {
        if (err) response.echo("pvp.tabletsBuyBattleTimes", jutil.errorInfo(err));
        else {
            var totalChallengeTimes = dailyBuyTime + (activityConfig["dailyBattleTime"] - 0);
            var newUserData = {"ingot":resultUserIngot};
            response.echo("pvp.tabletsBuyBattleTimes", {"newUserData": newUserData, "challengeTimes": challengeTimes, "totalChallengeTimes": totalChallengeTimes, "usedBattleBuyTime": dailyBuyTime});
        }
    });
}

exports.start = start;