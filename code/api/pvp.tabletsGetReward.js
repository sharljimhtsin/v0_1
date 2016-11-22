/**
 * 神位争夺（跨服战）领奖励、领保箱
 * User: peter.wang
 * Date: 14-11-22
 * Time: 下午
 */

var async = require("async");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var gsData = require("../model/gsData");
var gsTabletsUser = require("../model/gsTabletsUser");
var stats = require("../model/stats");
var mongoStats = require("../model/mongoStats");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "type") == false) {
        response.echo("pvp.tabletsGetReward", jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var type = postData["type"];
    var getBox = (postData["getBox"] == undefined) ? "" : postData["getBox"];
    var issueId = 0;
    var userBattleInfo = {};
    var getReward = [];
    var rewardData = [];
    switch (type) {
        case 0: // 领保箱
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
                function (cb) {// 是否挑战者
                    gsTabletsUser.getTabletsUser(userUid, issueId, function (err, res) {
                        if (err) cb(err);
                        else if (res == null) cb("postError");
                        else {
                            userBattleInfo = res;
                            cb(null);
                        }
                    });
                },
                function (cb) { // 领取
                    gsData.getActivityConfig(userUid, gsData.GS_TABLETSCOMPETE, function (err, res) {
                        var activityConfig = res[2];
                        gsTabletsUser.userGetBoxStatus(userUid, activityConfig["winTimeReward"], function (err, res) {
                            if (err) cb(err);
                            else {
                                var getTime = 1;
                                for (var fTime in res) {
                                    if (res[fTime] - 0 == 0) {
                                        getTime = fTime;
                                        break;
                                    }
                                }
                                if (userBattleInfo["dailyWinTime"] - 0 >= getTime) {//可以领取
                                    var activityConfigure = require("../model/activityConfig");
                                    activityConfigure.getConfig(userUid, "tabletsCompete", function (err, res) {
                                        if (err || res[0] != true) {
                                            return;
                                        }
                                        stats.recordWithLevel(userBattleInfo["dailyWinTime"], res[2]["winTimeReward"], false, "", "", [mongoStats.tabletsGetReward1, mongoStats.tabletsGetReward2, mongoStats.tabletsGetReward3, mongoStats.tabletsGetReward4, mongoStats.tabletsGetReward5, mongoStats.tabletsGetReward6, mongoStats.tabletsGetReward7, mongoStats.tabletsGetReward8, mongoStats.tabletsGetReward9, mongoStats.tabletsGetReward10], function (tag) {
                                            stats.events(userUid, "127.0.0.1", null, tag);
                                        });
                                    });
                                    gsTabletsUser.getBoxReward(userUid, getTime, function (err, res) {
                                        if (err) cb(err);
                                        else {
                                            getReward = res["reward"];
                                            rewardData = res["resultData"];
                                            cb(null);
                                        }
                                    });
                                } else {
                                    cb("postError");
                                }
                            }
                        })
                    })
                }
            ], function (err, res) {
                if (err) {
                    response.echo("pvp.tabletsGetReward", jutil.errorInfo(err));
                    return;
                } else {
                    response.echo("pvp.tabletsGetReward", {
                        "type": type,
                        "getReward": getReward,
                        "rewardData": rewardData
                    });
                    return;
                }
            });
            break;
        case 1: // 领奖励
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
                function (cb) { // 领取
                    gsTabletsUser.getDailyReward(userUid, function (err, res) {
                        if (err) cb(err);
                        else {
                            getReward = res["reward"];
                            rewardData = res["resultData"];
                            cb(null);
                        }
                    });
                }
            ], function (err, res) {
                if (err) {
                    response.echo("pvp.tabletsGetReward", jutil.errorInfo(err));
                    return;
                } else {
                    response.echo("pvp.tabletsGetReward", {
                        "type": type,
                        "getReward": getReward,
                        "rewardData": rewardData
                    });
                    return;
                }
            });
            break;
        default :
            response.echo("pvp.tabletsGetReward", jutil.errorInfo("postError"));
            return;
    }
}

exports.start = start;