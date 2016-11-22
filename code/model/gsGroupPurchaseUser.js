/**
 * 团购活动（跨服）
 * User: peter.wang
 * Date: 14-12-1
 * Time: 上午11:00
 */
var async = require("async");
var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var mongoStats = require("../model/mongoStats");
var mail = require("../model/mail");
var gsData = require("../model/gsData");
var stats = require("../model/stats");
var activityData = require("../model/activityData");
var activityConfig = require("../model/activityConfig");

// 记录玩家购买数据
function addGroupPurchaseUser(userUid, issueId, number, callbackFn) {
    var insertSql = "INSERT INTO gsGroupPurchaseUser SET ?";
    var insertData = {"issueId": issueId, "userUid": userUid, "number": number, "addTime": jutil.now()};
    mysql.loginDBFromUserUid(userUid).query(insertSql, insertData, function (err, res) {
        if (err) callbackFn(err);
        else {
            redis.loginFromUserUid(userUid).s(_getGSRedisKey(issueId, "buyCount")).incrby(number, function (err, res) {//全服购买数
                if (err) callbackFn(err);
                else {
                    redis.loginFromUserUid(userUid).s(_getGSRedisKey(issueId, "buyCount")).get(function(err,res){// 更新当前购买量
                        gsData.updateGSDataInfo(userUid, gsData.GS_GROUPPURCHASE, issueId, {"data": res}, function (err, res) {});
                    })

                    redis.user(userUid).s(_getGSRedisKey(issueId, "userBuyCount")).incrby(number, function (err, res) {//用户购买数
                        if (err) callbackFn(err);
                        else callbackFn(null, 1);
                    })
                }
            })
        }
    });
}
// 获取用户收到的奖励状态
function getUserReceiveStatus(userUid, issueId, buyCount, boxRanks, callbackFn) {
    var forEachData = [];
    var rankIndex = 0;
    for (var rankCount in boxRanks) {
        rankIndex++;
        forEachData.push({"rankIndex": rankIndex, "rankCount": rankCount, "rankReward": boxRanks[rankCount]})
    }
    var userBuyStatus = {};
    async.forEach(forEachData, function (rank, forEachFn) {
        redis.user(userUid).s(_getGSRedisKey(issueId, rank["rankIndex"] + ":sendsuccess")).exists(function (err, res) {
            if (res == 1 && buyCount - 0 >= rank["rankCount"] - 0) {
                userBuyStatus[rank["rankCount"]] = 1;
            }
            else {
                userBuyStatus[rank["rankCount"]] = 0;
            }
            forEachFn(null);
        })
    }, function (err, res) {
        callbackFn(null, userBuyStatus);
    });
}
// 登录触发发放
function groupPurchaseSendLastReward(userUid,callbackFn) {
    var issueId = 0;
    var forEachData = [];
    var activityEtime = 0;
    var buyCount = 0;
    async.series([
        function(cb){
            redis.loginFromUserUid(userUid).s(_getGSRedisKey("issueId", "sendLastRewardIng:")).setnx(1,function(err,res) {
                if(res==0) cb("exit");//正在发
                else {
                    redis.loginFromUserUid(userUid).s(_getGSRedisKey("issueId", "sendLastRewardIng:")).expire(600);
                    cb(null);
                }
            })
        },
        function(cb){
            gsData.getActivityConfig(userUid, gsData.GS_GROUPPURCHASE, function (err, res) {
                if (err) cb(err);
                else {
                    activityEtime = res[5];

                    if(res[2]==undefined || res[2]["rank"]==undefined) cb("configError");
                    else {
                        var boxRanks = res[2]["rank"];
                        var rankIndex = 0;
                        for (var rankCount in boxRanks) {
                            rankIndex++;
                            forEachData.push({"rankIndex": rankIndex, "rankCount": rankCount, "rankReward": boxRanks[rankCount]})
                        }
                        cb(null);
                    }
                }
            })
        },
        function(cb){
            gsData.getGSDataStatus1(userUid, gsData.GS_GROUPPURCHASE, function (err, res) {
                issueId = res -0;
                if(issueId>0) {
                    cb(null);
                }else{
                    cb("noIssueId");
                }
            });
        },
        function(cb){// 判断是否进入登录触发
            redis.loginFromUserUid(userUid).s(_getGSRedisKey(issueId, "buyCount")).get(function(err,res){
                if(err) cb(err)
                else {
                    buyCount = res -0;
                    var i = 0;
                    for (var i in forEachData) {
                        if (buyCount - 0 > forEachData[i]["rankCount"] - 0) {
                            i++;
                        }
                    }
                    if(i>=forEachData.length || jutil.now()-0>activityEtime-0) {//所有触发点已过，或活动结束
                        cb(null);
                    }else{//还未过触发
                        cb("noTrigger");
                    }
                }
            })
        },
        function(cb) {//么么开始发
            async.forEachSeries(forEachData, function (rank, forEachFn) {
                if(buyCount-0>=rank["rankCount"]-0) {
                    _groupPurchaseRunSendRewardList(userUid, issueId, rank["rankIndex"], rank["rankCount"], rank["rankReward"]);
                }
                forEachFn(null);
            }, function (err, res) {
                cb(err);
            });
        },
        function(cb){
            if(jutil.now()-0>activityEtime-0) {//结束活动
                gsData.updateGSDataInfo(userUid, gsData.GS_GROUPPURCHASE, issueId, {"status": 2}, function (err, res) {
                    redis.loginFromUserUid(userUid).s( _getGSRedisKey("","IssueId")).del();// 活动结束，清除过期期号
                    cb(null)
                });
            }
        }
    ],function(err,res){
        callbackFn(err,res);
    })
}
/*
*发放奖励
* triggerType:触发类型 buy：购买 login:登录
*/
function groupPurchaseSendReward(userUid, issueId, buyCount, boxRanks, triggerType, callbackFn) {
    var forEachData = [];
    var rankIndex = 0;
    for (var rankCount in boxRanks) {
        rankIndex++;
        forEachData.push({"rankIndex": rankIndex, "rankCount": rankCount, "rankReward": boxRanks[rankCount]})
    }

    var triggerStatus = 0;  //0:当前玩家非触发人 1:当前玩家触发人
    async.series([
        function (cb) {
            if (triggerType == "login") {// 登录调用，发放最后一批奖励（即只执行给所有人发）
                cb(null)
            } else {                      // 购买触发，优先给触发者发
                async.forEachSeries(forEachData, function (rank, forEachFn) {
                    if (buyCount - 0 >= rank["rankCount"] - 0) {//rank["rankCount"]
                        _groupPurchaseRunSendRewardSim(userUid, issueId, rank["rankIndex"], rank["rankCount"], rank["rankReward"], function (err, res) {
                            if (err)  forEachFn(err);
                            else {
                                if (triggerStatus != 1)triggerStatus = res;
                                forEachFn(null);
                            }
                        });
                    } else {
                        forEachFn(null)
                    }
                }, function (err, res) {
                    cb(err, null);
                });
            }
        },
        function (cb) {// 给所有人发
            cb(null, null);
            if (triggerStatus == 1 || triggerType=="login") {// 购买触发、登录触发
                async.forEachSeries(forEachData, function (rank, forEachFn) {
                    if (buyCount - 0 >= rank["rankCount"] - 0) {
                        _groupPurchaseRunSendRewardList(userUid, issueId, rank["rankIndex"], rank["rankCount"], rank["rankReward"]);
                        forEachFn(null);
                    } else {
                        forEachFn(null)
                    }
                }, function (err, res) {
                });
            }
        }
    ], function (err, res) {
        callbackFn(err, null)
    })
}
// 单发：发放奖励
function _groupPurchaseRunSendRewardSim(userUid, issueId, rankIndex, rankCount, rankReward, callbackFn) {
    redis.loginFromUserUid(userUid).s(_getGSRedisKey(issueId, rankIndex + ":sendsuccess:sim")).setnx(1, function (err, res) {//确定触发人
        if (err) callbackFn(err);
        else if (res == 0) { //已经发放
            callbackFn(null, 0)
        } else {
            redis.user(userUid).s(_getGSRedisKey(issueId, rankIndex + ":sendsuccess")).setnx(1, function (err, res) {//锁定发放
                if (err) callbackFn(err);
                else if (res == 0) { //已经发放
                    callbackFn(null, 1)
                } else {
                    _sendMail(userUid, rankIndex, rankReward, function (err, res) {
                        if (err) {//发放失败
                            redis.loginFromUserUid(userUid).s(_getGSRedisKey(issueId, rankIndex + ":sendsuccess:sim")).del(function (err, res) {
                                redis.user(userUid).s(_getGSRedisKey(issueId, rankIndex + ":sendsuccess")).del();
                            })
                            callbackFn(null, 1)
                        } else {
                            callbackFn(null, 1)
                        }
                    })
                }
            });
        }
    })
}
// 批发：发放奖励
function _groupPurchaseRunSendRewardList(userUid, issueId, rankIndex, rankCount, rankReward) {
    redis.loginFromUserUid(userUid).s(_getGSRedisKey(issueId, rankIndex + ":sendsuccess:batch")).setnx(1, function (err, res) {
        if (err || res == 0) {//正在发
        } else {
            var userList = {};
            async.series([
                function (cb) {
                    var sql = "SELECT distinct userUid FROM `gsGroupPurchaseUser` WHERE issueId=" + mysql.escape(issueId);
                    mysql.loginDBFromUserUid(userUid).query(sql, function (err, res) {
                        userList = res;
                        cb(null);
                    })
                },
                function (cb) {
                    async.forEach(userList, function (itemUser, forEachFn) {
                        redis.user(itemUser["userUid"]).s(_getGSRedisKey(issueId, rankIndex + ":sendsuccess")).setnx(1, function (err, res) {
                            if (err || res == 0) {//已经发放
                            } else {
                                _sendMail(itemUser["userUid"], rankIndex, rankReward, function (err, res) {
                                    if (err) {// 发放失败
                                        redis.user(itemUser["userUid"]).s(_getGSRedisKey(issueId, rankIndex + ":sendsuccess")).del();
                                    }
                                });
                            }
                        });
                        forEachFn(null);
                    },function(err,res){
                        cb(null);
                    })
                }
            ], function (err, res) {// 已发完
                redis.loginFromUserUid(userUid).s(_getGSRedisKey(issueId, rankIndex + ":sendsuccess:batch")).del();
            })
        }
    })
}
// 发邮件
function _sendMail(userUid, rankIndex, rankReward, callbackFn){
    //TODO: 根据 rankIndex 分支
    stats.recordWithLevelIndex(rankIndex, [mongoStats.gsGroupPurchaseUser1, mongoStats.gsGroupPurchaseUser2, mongoStats.gsGroupPurchaseUser3], function (tag) {
        stats.events(userUid, "127.0.0.1", null, tag);
    });
    var configData = configManager.createConfig(userUid);
    var mailConfig = configData.getConfig("mail");
    var reward = JSON.stringify(rankReward);
    var message = jutil.formatString(mailConfig["groupPurchaseReward"], [rankIndex]);
    mail.addMail(userUid, -1, message, reward, mongoStats.GROUPPURCHASE_BOXREWARD, function (err, res) {
        callbackFn(err,res);
    });
}
/*
* rediskey
* */
function _getGSRedisKey(issueId,key){
    return gsData.getGSRedisKey(gsData.GS_GROUPPURCHASE,issueId,key);
}


exports.addGroupPurchaseUser = addGroupPurchaseUser;
exports.getUserReceiveStatus = getUserReceiveStatus;
exports.groupPurchaseSendReward = groupPurchaseSendReward;
exports.groupPurchaseSendLastReward = groupPurchaseSendLastReward;
exports.getGSRedisKey = _getGSRedisKey;