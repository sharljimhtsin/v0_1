/**
 * 神位争夺（跨服战）进入挑战
 * User: peter.wang
 * Date: 14-11-21
 * Time: 上午10:50
 */

var async = require("async");
var redis = require("../alien/db/redis");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var user = require("../model/user");
var gsData = require("../model/gsData");
var gsTabletsUser = require("../model/gsTabletsUser");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "refresh") == false) {
        response.echo("pvp.tabletsInitBattle", jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];
    var refresh = postData["refresh"];

    var configData  = configManager.createConfig(userUid);

    var issueId = 0;
    var activityConfig = {};
    var returnValue = {};
    var matchUsers = [];
    async.series([
        function(cb){// 开服时间条件
            gsTabletsUser.checkUserServerStatus(userUid, function (err, res) {
                if (err) cb(err);
                else if (res == 0) cb("postError");
                else {
                    cb(null);
                }
            });
        },
        function(cb){// 是否活动中
            gsData.getCurIssueId(userUid, gsData.GS_TABLETSCOMPETE, function (err, res) {
                if (err) cb(err);
                else if (res == 0) cb("gpActivityEnd");
                else {
                    issueId = res;
                    cb(null);
                }
            });
        },
        function(cb){ // 活动配制
            gsData.getActivityConfig(userUid,gsData.GS_TABLETSCOMPETE,function(err,res){
                activityConfig = res[2];
                cb(null);
            })
        },
        function(cb) {
            switch (refresh) {
                case 0: // 首次进入
                    enterTablets(userUid, issueId, function (err, res) {
                        if (err) cb(err);
                        else {
                            matchUsers = res;
                            cb(null);
                        }
                    })
                    break;
                case 1: // 刷新
                    refreshTablets(userUid, issueId, activityConfig, function (err, res) {
                        if (err) cb(err);
                        else {
                            matchUsers = res;
                            cb(null);
                        }
                    })
                    break;
                default :
                    cb("postError");
                    break;
            }
        },
        function(cb){
            user.getUser(userUid, function (err, res) {
                if (err) cb(err)
                else {
                    returnValue["newUserData"] = {"ingot":res["ingot"]};
                    cb(null);
                }
            });
        },
        function(cb){ // 保箱领取状态
            gsTabletsUser.userGetBoxStatus(userUid, activityConfig["winTimeReward"], function(err,res){
                if(err) cb(err);
                else{
                    returnValue["userGetBoxStatus"] = res;
                    cb(null);
                }
            })
        },
        function(cb) {
            gsTabletsUser.getTabletsUser(userUid, issueId, function (err, res) {
                if (err) cb(err);
                else {
                    returnValue["refreshTimes"] = res["dailyRefreshTime"];
                    returnValue["challengeTimes"] = res["dailyBattleTime"];
                    returnValue["winTimes"] = res["dailyWinTime"];
                    returnValue["usedBattleBuyTime"] = res["dailyBuyTime"];
                    returnValue["totalChallengeTimes"] = (res["dailyBuyTime"] - 0) + (activityConfig["dailyBattleTime"] - 0);
                    returnValue["point"] = res["point"];
                    returnValue["list"] = matchUsers;
                    returnValue["freeRefreshTime"] = activityConfig["freeRefreshTime"];
                    returnValue["refreshCost"] = activityConfig["refreshCost"];
                    returnValue["maxBattleBuyTime"] = activityConfig["maxBattleBuyTime"];
                    returnValue["battleTimeCost"] = activityConfig["battleTimeCost"];
                    returnValue["winTimeReward"] = activityConfig["winTimeReward"];
                    cb(null);
                }
            })
        }
    ],function(err,res){
        if (err) {
            response.echo("pvp.tabletsInitBattle",  jutil.errorInfo(err));
        } else {
            response.echo("pvp.tabletsInitBattle",  returnValue);
        }
    })
}

function enterTablets(userUid, issueId, callbackFn) {
    redis.user(userUid).s(gsTabletsUser.getGSRedisKey(issueId, "rankMatchUsers")).getObj(function (err, res) {
        if (err) callbackFn(err);
        else if (res != null) {
            callbackFn(null, res);
        } else {
            gsTabletsUser.addTabletsUser(userUid, issueId, function (err, res) {
                if (err) callbackFn(err);
                else {
                    gsTabletsUser.getTwoMatchUsers(userUid, issueId, function (err, res) {
                        if (err) callbackFn(err);
                        else {
                            redis.user(userUid).s(gsTabletsUser.getGSRedisKey(issueId, "rankMatchUsers")).setObj(res);
                            //redis.user(userUid).s(gsTabletsUser.getGSRedisKey(issueId, "rankMatchUsers")).expire(604800);
                            callbackFn(null, res);
                        }
                    })
                }
            })
        }
    })
}

function refreshTablets(userUid, issueId, activityConfig, callbackFn) {
    var freeRefreshTime = activityConfig["freeRefreshTime"] - 0;
    var refreshCost = activityConfig["refreshCost"] - 0;
    var matchUsers = [];
    var dailyRefreshTime = 0;
    async.series([
        function (cb) {
            gsTabletsUser.getTabletsUser(userUid, issueId, function (err, res) { //付费or免费
                if (err) cb(err);
                else if(res==null) cb("postError");
                else {
                    if (freeRefreshTime > res["dailyRefreshTime"]) refreshCost = 0;
                    dailyRefreshTime = res["dailyRefreshTime"] - 0 + 1;
                    cb(null);
                }
            })
        },
        function (cb) {
            if (refreshCost == 0) cb(null);
            else{
                user.getUser(userUid, function (err, res) {// 扣费
                    if (err) cb(err);
                    else {
                        var resultUserIngot = res["ingot"] - 0 - refreshCost;
                        if(resultUserIngot<0) cb("ingotNotEnough");
                        else {
                            var newIngot = {"ingot": resultUserIngot};
                            user.updateUser(userUid, newIngot, function (err, res) {
                                if (err) cb(err);
                                else {
                                    var mongoStats = require("../model/mongoStats");
                                    mongoStats.expendStats("ingot", userUid, '127.0.0.1', null, mongoStats.E_TABLETS_REFRESH, refreshCost);
                                    cb(null);
                                }
                            });
                        }
                    }
                });
            }
        },
        function (cb) { // 刷新可挑战玩家
            gsTabletsUser.getTwoMatchUsers(userUid, issueId, function (err, res) {
                if (err) cb(err);
                else {
                    matchUsers = res;
                    redis.user(userUid).s(gsTabletsUser.getGSRedisKey(issueId, "rankMatchUsers")).setObj(res);
                    //redis.user(userUid).s(gsTabletsUser.getGSRedisKey(issueId, "rankMatchUsers")).expire(604800);
                    cb(null);
                }
            })
        },
        function (cb) { // 更新刷新次数
            var newValueData = {"dailyRefreshTime": dailyRefreshTime,"dailyTimeLastUpdateTime":jutil.now()}
            gsTabletsUser.updateTabletsUser(userUid, issueId, newValueData, function (err, res) {
                if (err) cb(err);
                else cb(null);
            })
        }
    ], function (err, res) {
        callbackFn(err,matchUsers);
    });
}

exports.start = start;