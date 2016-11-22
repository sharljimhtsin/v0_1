/******************************************************************************
 * 团购
 * Create by joseppe.
 * Create at 15-03-02.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var activityData = require("../model/activityData");
var bitUtil = require("../alien/db/bitUtil");
var stats = require("../model/stats");
var mongoStats = require("../model/mongoStats");
var mail = require("../model/mail");
var configManager = require("../config/configManager");
var gsData = require("../model/gsData");
var userVariable = require("../model/userVariable");

var GROUPPURCHASE = "groupPurchase";// 跨服团购
var GROUPPURCHASE2 = "groupPurchase2";// 跨服团购2
var GROUPPURCHASE3 = "groupPurchase3";// 跨服团购3

function getConfig(userUid, type, callbackFn, notOpen){
    notOpen = notOpen?1:0;
    activityConfig.getConfig(userUid,type,function(err,res){
        if(err || res ==null)callbackFn("CannotgetConfig");
        else{
            if(notOpen || res[0]){
                var sTime = res[4];
                var eTime = res[5];
                var activityArg = parseInt(res[1]);
                if(isNaN(activityArg))activityArg = 0;
                var currentConfig = null;
                if(activityArg == -1){
                    currentConfig = res[2]||res[3]["1"];
                } else{
                    currentConfig = res[3][activityArg]||res[3]["1"];
                }
                if(!currentConfig){
                    callbackFn("configError");
                }else{
                    callbackFn(null,[sTime,eTime,currentConfig]);
                }
            }else{
                callbackFn("notOpen");
            }
        }
    });
}

function addGroupPurchaseUser(userUid, type, number, callbackFn) {
    var key = "1";
    var isAll = 0;//0为不跨服，1为跨服（根据配置判断）
    var data = {"data":0,"status":0,"statusTime":0,"arg":""};
    var eTime = 0;
    var actType = activityData.PRACTICE_GROUPPURCHASE;
    var intoRank = 0;
    switch (type){
        case GROUPPURCHASE:
            actType = activityData.PRACTICE_GROUPPURCHASE;
            break;
        case GROUPPURCHASE2:
            actType = activityData.PRACTICE_GROUPPURCHASE2;
            break;
        case GROUPPURCHASE3:
            actType = activityData.PRACTICE_GROUPPURCHASE3;
            break;
    }
    async.series([
        // 获取活动配置数据
        function(cb) {
            getConfig(userUid, type, function(err, res){
                if (err || res == null) cb("CannotGetConfig");
                else {
                    data["dataTime"] = res[0];
                    eTime = res[1];
                    key = res[2]["key"];
                    isAll = parseInt(res[2]["isAll"]) || 0;
                    intoRank = res[2]["intoRank"]-0;
                    cb(null);
                }
            });
        },
        function(cb) {
            var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
            redis[rk](userUid).s(type+":buyCount:"+key).incrby(number,cb);//全服购买数
        },
        function(cb) {
            var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
            redis[rk](userUid).h(type+":userBuyCount:"+key).hincrby(userUid, number,cb);//用户购买数
        },
        function(cb) {
            activityData.getActivityData(userUid, actType, function(err, res){
                if(err)cb(err);
                else{
                    if(res != null && data["dataTime"] == res["dataTime"]){
                        data["data"] = res["data"]-0;
                    }
                    data["data"] += number;
                    cb(null);
                }
            });
        },
        function (cb) {
            var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
            if(type == GROUPPURCHASE3){
                if(data["data"] >= intoRank){
                    redis[rk](userUid).z(type + ":userBuyCountRank:" + key).add(data["data"], userUid, cb);//用户购买数
                }else{
                    cb(null);
                }
            }else{
                cb();
            }
        },
        function(cb){
            data["arg"] = key;
            activityData.updateActivityData(userUid, actType,data, cb);//单用户购买数
        }
    ], function(err,res){
        callbackFn(err,res);
    });
}

function groupPurchaseSendReward(userUid, buyCount, type, triggerType, callbackFn) {
    var forEachData = [];
    var rankIndex = 0;

    var triggerStatus = 0;  //0:当前玩家非触发人 1:当前玩家触发人
    var key = 0;
    var isAll = 0;
    var boxRanks = [];
    async.series([
        function (cb) {
            getConfig(userUid, type, function(err, res){
                if(err){
                    cb(err);
                } else {
                    key = res[2]["key"];
                    isAll = parseInt(res[2]["isAll"]);
                    boxRanks = res[2]["rank"];
                    cb(null);
                }
            });
        },
        function (cb) {
            var rankIndex = 0;
            for (var rankCount in boxRanks) {
                rankIndex++;
                forEachData.push({"rankIndex": rankIndex, "rankCount": rankCount, "rankReward": boxRanks[rankCount]})
            }
            cb(null);
        },
        function (cb) {
            if (triggerType == "login") {// 登录调用，发放最后一批奖励（即只执行给所有人发）
                cb(null)
            } else {                      // 购买触发，优先给触发者发
                async.forEachSeries(forEachData, function (rank, forEachFn) {
                    if (buyCount - 0 >= rank["rankCount"] - 0) {//rank["rankCount"]
                        groupPurchaseRunSendRewardSim(userUid, type, key, isAll, rank["rankIndex"], rank["rankReward"], function (err, res) {
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
                        groupPurchaseRunSendRewardList(userUid, type, key, isAll, rank["rankIndex"], rank["rankReward"]);
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

function groupPurchaseSendLastReward(userUid) {
    var types = [GROUPPURCHASE, GROUPPURCHASE2, GROUPPURCHASE3];
    async.eachSeries(types, function(type, eachCb){
        var issueId = 0;
        var forEachData = [];
        var eTime = 0;
        var buyCount = 0;
        var key = '1';
        var isAll = 0;
        async.series([
            function(cb){
                getConfig(userUid, type, function(err, res){
                    if(err){
                        cb(err);
                    } else {
                        eTime = res[1];
                        key = res[2]["key"];
                        isAll = parseInt(res[2]["isAll"]);
                        var boxRanks = res[2]["rank"];
                        var rankIndex = 0;
                        for (var rankCount in boxRanks) {
                            rankIndex++;
                            forEachData.push({"rankIndex": rankIndex, "rankCount": rankCount, "rankReward": boxRanks[rankCount]})
                        }
                        cb(null);
                    }
                });
            },
            function(cb){// 判断是否进入登录触发
                var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
                redis[rk](userUid).s(type+":buyCount:"+key).get(function(err, res){
                    if(err) cb(err)
                    else {
                        buyCount = res -0;
                        var i = 0;
                        for (var i in forEachData) {
                            if (buyCount - 0 > forEachData[i]["rankCount"] - 0) {
                                i++;
                            }
                        }
                        if(i>=forEachData.length || jutil.now() > eTime) {//所有触发点已过，或活动结束
                            cb(null);
                        }else{//还未过触发
                            cb("noTrigger");
                        }
                    }
                });
            },
            function(cb) {//么么开始发
                async.forEachSeries(forEachData, function (rank, forEachFn) {
                    if(buyCount-0>=rank["rankCount"]-0) {
                        groupPurchaseRunSendRewardList(userUid, type, key, isAll, rank["rankIndex"], rank["rankReward"]);
                    }
                    forEachFn(null);
                }, function (err, res) {
                    cb(err);
                });
            },
            function(cb){
                if(jutil.now()-0>eTime-0) {//结束活动
                    gsData.updateGSDataInfo(userUid, type, key, {"status": 2,"data": buyCount}, cb);
                }
            }
        ],function(err,res){
            eachCb(err,res);
        })
    });//, function(err, res){}
}

function groupPurchaseRunSendRewardSim(userUid, type, key, isAll, rankIndex, rankReward, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    redis[rk](userUid).s(type+":"+rankIndex+":sendsuccess:sim:"+key + jutil.now()).setnx(1, function (err, res) {//确定触发人
        if (err) callbackFn(err);
        else if (res == 0) { //已经发放
            callbackFn(null, 0)
        } else {
            redis.user(userUid).s(type+":"+rankIndex+":sendsuccess:"+key).setnx(1, function (err, res) {//锁定发放
                if (err) callbackFn(err);
                else if (res == 0) { //已经发放
                    callbackFn(null, 1)
                } else {
                    sendMail(userUid, rankIndex, rankReward, function (err, res) {
                        if (err) {//发放失败
                            redis[rk](userUid).s(type+":"+rankIndex+":sendsuccess:sim:"+key).del(function (err, res) {
                                redis.user(userUid).s(type+":"+rankIndex+":sendsuccess:"+key).del();
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

function groupPurchaseRunSendRewardList(userUid, type, key, isAll, rankIndex, rankReward) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    redis[rk](userUid).s(type+":"+rankIndex+":sendsuccess:batch:"+key).setnx(1, function (err, res) {
        if (err || res == 0) {//正在发
        } else {
            var userList = [];
            async.series([
                function (cb) {
                    redis[rk](userUid).h(type+":userBuyCount:"+key).getObj(function(err, res){
                        if(err || res == null){
                            cb("noUser");
                        } else {
                            for(var i in res)
                                userList.push(i);
                            cb(null);
                        }
                    });
                },
                function (cb) {
                    async.forEachSeries(userList, function (itemUserUid, forEachFn) {
                        redis.user(itemUserUid).s(type+":"+rankIndex+":sendsuccess:"+key).setnx(1, function (err, res) {
                            if (err || res == 0) {//已经发放
                                forEachFn(null);
                            } else {
                                sendMail(itemUserUid, rankIndex, rankReward, function (err, res) {
                                    if (err) {// 发放失败
                                        redis.user(itemUserUid).s(type+":"+rankIndex+":sendsuccess:"+key).del();
                                    }
                                    forEachFn(null);
                                });
                            }
                        });
                    },function(err,res){
                        cb(null);
                    })
                }
            ], function (err, res) {// 已发完
                redis[rk](userUid).s(type+":"+rankIndex+":sendsuccess:batch:"+key).del();
            })
        }
    })
}

function sendMail(userUid, rankIndex, rankReward, callbackFn) {
    stats.recordWithLevelIndex(rankIndex, [mongoStats.groupPurchaseUser1, mongoStats.groupPurchaseUser2, mongoStats.groupPurchaseUser3], function (tag) {
        switch (tag){
            case "0":
            default :
                stats.events(userUid,"127.0.0.1",null,mongoStats.P_GROUPPURCHASE3_3);//团购3第一档奖励领取次数
                break;
            case "1":
                stats.events(userUid,"127.0.0.1",null,mongoStats.P_GROUPPURCHASE3_4);//团购3第二档奖励领取次数
                break;
            case "2":
                stats.events(userUid,"127.0.0.1",null,mongoStats.P_GROUPPURCHASE3_5);//团购3第三档奖励领取次数
                break;
        }
        stats.events(userUid, "127.0.0.1", null, tag);
    });
    var configData = configManager.createConfig(userUid);
    var mailConfig;
    var lang;
    async.series([function (cb) {
        userVariable.getLanguage(userUid, function (err, res) {
            lang = res;
            cb(err);
        });
    }, function (cb) {
        var mailConfigDefault = configData.getConfig("mail");
        var mailConfigLocal = configData.getConfig("mail" + "_" + lang);
        if (mailConfigLocal) {
            mailConfig = mailConfigLocal;
        } else {
            mailConfig = mailConfigDefault;
        }
        cb();
    }], function (err, res) {
        var reward = JSON.stringify(rankReward);
        var message = jutil.formatString(mailConfig["groupPurchaseReward"], [rankIndex]);
        mail.addMail(userUid, -1, message, reward, mongoStats.GROUPPURCHASE_BOXREWARD, function (err, res) {
            callbackFn(err, res);
        });
    })
}

function getRankRewardStatus(userUid, eTime, key, callbackFn){
    redis.user(userUid).s("rankRewardStatus:" + activityData.PRACTICE_GROUPPURCHASE3 + key).get(function(err,res){
        if(err)callbackFn(err);
        else{
            var status = res == null ? 0 : res-0;
            callbackFn(err,status);
        }
    });
}
function setRankRewardStatus(userUid, key, callbackFn){
    redis.user(userUid).s("rankRewardStatus:" + activityData.PRACTICE_GROUPPURCHASE3 + key).set(2, callbackFn);
}

//function setExpire(userUid, userList,callbackFn) {
//    var aType = activityData.PRACTICE_GROUPPURCHASE3;
//    activityData.getActivityData(userUid, aType, function(err, res){
//        var returnData = {"data":0, "dataTime":0, "status":0, "statusTime":0,"arg":{}};
//        var key = res["arg"];
//        if(key == ''){
//            callbackFn(err,null);
//        }else{
//            var rk = "difficulty";
//            var type = 'groupPurchase3';
//            var redisClient = redis[rk](userUid);
//            redisClient.s(type+":buyCount:"+key).del();
//            redisClient.h(type+":userBuyCount:"+key).del();
//            redisClient.z(type+":userBuyCountRank:" + key).del();
//            var rankList = ["1","2","3"];
//            async.forEachSeries(rankList, function (rankIndex, forFn) {
//                async.forEachSeries(userList, function (itemUserUid, forEachFn) {
//                    async.series([function(cb){
//                        redis.user(itemUserUid).s(type+":"+rankIndex+":sendsuccess:"+key).get(1,function(err,res){
//                            if(res != null){
//                                redis.user(itemUserUid).s(type+":"+rankIndex+":sendsuccess:"+key).del();
//                            }else{
//                                cb(null);
//                            }
//                        });
//                    },function(cb){
//                        redis.user(itemUserUid).s(type+":"+rankIndex+":sendsuccess:sim:"+key).get(1,function(err,res){
//                            if(res != null){
//                                redis.user(itemUserUid).s(type+":"+rankIndex+":sendsuccess:sim:"+key).del();
//                            }else{
//                                cb(null);
//                            }
//                        });
//                    }],function(err,res){
//                        forEachFn(null);
//                    });
//                },function(err,res){
//                    activityData.updateActivityData(userUid, aType, returnData, function(err,res){
//                        redis.user(userUid).s("rankRewardStatus:" + aType).del();
//                        forFn(null);
//                    });
//                });
//            },function(err,res){
//                callbackFn(err,null);
//            });
//        }
//    });
//}
exports.GROUPPURCHASE = 'groupPurchase';// 跨服团购
exports.GROUPPURCHASE2 = 'groupPurchase2';// 跨服团购2
exports.GROUPPURCHASE3 = 'groupPurchase3';// 跨服团购3

exports.getConfig = getConfig;
exports.addGroupPurchaseUser = addGroupPurchaseUser;
exports.groupPurchaseSendReward = groupPurchaseSendReward;
exports.groupPurchaseSendLastReward = groupPurchaseSendLastReward;

exports.getRankRewardStatus = getRankRewardStatus;
exports.setRankRewardStatus = setRankRewardStatus;

//exports.setExpire = setExpire;