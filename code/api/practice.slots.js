/**
 * Created with JetBrains WebStorm.
 * 新拉霸api
 * User: za
 * Date: 15-11-27 预计两周
 * Time: 下午17:53
 * To change this template use File | Settings | File Templates.
 */

var jutil = require("../utils/jutil");
var async = require("async");
var configManager = require("../config/configManager");
var slots = require("../model/practiceSlots");
var user = require("../model/user");
var modelUtil = require("../model/modelUtil");
var activityConfig = require("../model/activityConfig");
var mongoStats = require("../model/mongoStats");
var bitUtil = require("../alien/db/bitUtil");
var login = require("../model/login");
var stats = require("../model/stats");

function start(postData, response, query) {
    var userUid = query["userUid"];
    var action = postData["action"];
    var openSlotsLv = 0;//开启活动的用户等级
    var eTime = 0;
    var sTime = 0;//以开服时间为活动开始时间
    var currentConfig;
    var returnData = {};//返回集合
    var rewardData = [];//获得的奖励
    var rewardKey = "";//随机出来的奖项 "123" "444" "777"
    var userData = {};//用户数据
    var slotsList = {};//新拉霸列表
    var rewardSlots = {};//奖励列表
    var rewardNormal = {};//拉霸计算系数列表
    var serverPoint = 0;//服务器积分
    var selfPoint = 0;//个人积分
    var sevenPointNeed = 0;//中大奖需要的积分
    var cdKeyList = {};//大奖列表
    var dayNo = 0;//开服后第n天（当前）
    var key = '';//每期活动标记
    var isAll = 0;//跨服标记
    var cdKeyId = 0;//奖励下标
    var cdKey = 0;//奖励CDKEY
    var rewardKeyLog = [];//key历史记录
    var rewardDataLog = [];//奖励历史记录
    var cdKeyItem = [];//随机奖励结果
    var cList = {};//大奖状态集合
    var rewardBase = [];
    var prizeList = [];//大奖奖励集合
    var prizeRList = {};//大奖记录集合
    var userVip = 0;
    var currVip = 0;
    var alist = [];
    var blist = [];
    var xxArg = {};

    switch (action) {
        case "get":
            async.series([//取开服时间
                function (cb) {// 取配置
                    slots.getConfig(userUid, function (err, res) {
                        if (err) cb(err);
                        else {
                            sTime = res[0];
                            eTime = res[1];
                            currentConfig = res[2];
                            key = currentConfig["key"];
                            isAll = parseInt(currentConfig["isAll"]);
                            cdKeyList = currentConfig["cdKeyList"];
                            openSlotsLv = currentConfig["slotsList"]["openSlotsLv"];
                            returnData["config"] = currentConfig;
                            returnData["sTime"] = sTime;
                            returnData["eTime"] = eTime;
                            cb(null);
                        }
                    });
                },
                function (cb) {//取服务器积分
                    slots.getServerData(userUid, isAll, key, sTime, function (err, res) {
                        if (err)cb(err);
                        else {
                            if (res == null) {
                                returnData["serverPoint"] = 0;
                            } else {
                                returnData["serverPoint"] = res - 0;
                            }
                            cb(null);
                        }
                    });
                },
                function (cb) {//取cdKey
                    slots.getCDKey(userUid, key, isAll, function (err, res) {
                        if (err)cb(err);
                        else {
                            if (res == null) {
                                for (var x = 0; x < cdKeyList.length; x++) {
                                    cList[x] = 0;
                                }
                                cb(null);
                            } else {
                                cList = res;
                                cb(null);
                            }
                        }
                    });
                },
                function (cb) {//取奖励数据
                    slots.getRewardData(userUid, sTime, eTime, function (err, res) {
                        if (err) cb(err);
                        else {
                            userData = res;
                            if (userData["arg"] == null || userData["arg"]["rewardDataLog"] == undefined) {
                                var xArg = [];
                                xArg.push({"statusList": [0, 0, 0, 0, 0, 0, 0], "rewardDataLog": rewardDataLog, "rewardKeyLog": rewardKeyLog});
                                userData["arg"] = xArg;
                                returnData["rewardDataLog"] = xArg["rewardDataLog"];
                                returnData["rewardKeyLog"] = xArg["rewardKeyLog"];
                                returnData["selfPoint"] = userData["data"];
                                returnData["rewardData"] = userData;
                                cb(null);
                            } else {
                                returnData["rewardDataLog"] = userData["arg"]["rewardDataLog"];
                                returnData["rewardKeyLog"] = userData["arg"]["rewardKeyLog"];
                                returnData["selfPoint"] = userData["data"];
                                returnData["rewardData"] = userData;
                                cb(null);
                            }
                        }
                    });
                },
                function(cb){//设置奖励数据
                    async.series([function(cb){
                        slots.setRewardData(userUid,returnData["rewardData"],cb);
                    },
                    function(cb){//设置大奖状态
                        slots.setCDKey(userUid,key,isAll,cList,cb);
                    },
                    function(cb){
                        slots.setServerData(userUid, isAll, key, sTime, eTime, returnData["serverPoint"],cb);
                    }],function(err,res){
                        cb(null);
                    });
                }], function (err, res) {
                echo(err, returnData);
            });
            break;
        case "slots"://抽奖  需求：
            async.series([function (cb) {//获取活动配置
                slots.getConfig(userUid, function (err, res) {
                    if (err) cb(err);
                    else {
                        sTime = res[0];
                        eTime = res[1];
                        currentConfig = res[2];
                        slotsList = currentConfig["slotsList"];
                        openSlotsLv = slotsList["openSlotsLv"];
                        rewardSlots = currentConfig["rewardSlots"];
                        rewardNormal = currentConfig["rewardNormal"];
                        sevenPointNeed = currentConfig["slotsPointNeed"];//中大奖需要的积分
                        cdKeyList = currentConfig["cdKeyList"];//大奖集合
                        key = currentConfig["key"];
                        isAll = parseInt(currentConfig["isAll"]);
                        prizeList = currentConfig["prizeList"];
                        currVip = currentConfig["vip"];
                        returnData["sTime"] = sTime;
                        returnData["eTime"] = eTime;
                        cb(null);
                    }
                });
            },
                function (cb) {//取cdKey
                    slots.getCDKey(userUid, key, isAll, function (err, res) {
                        if (err)cb(err);
                        else {
                            cList = res;
                            cb(null);
                        }
                    });
                },
                function (cb) {//取vip等级
                    user.getUser(userUid, function (err, res) {
                        if (err || res == null) {
                            cb("dbError");
                        } else {
                            userVip = res["vip"] - 0;
                            cb(null);
                        }
                    });
                },
                function (cb) {//取用户当天活动状态
                    slots.getRewardData(userUid, sTime, eTime, function (err, res) {
                        if (err)cb(err);
                        else {
                            userData = res;
                            xxArg = userData["arg"];
                            dayNo = Math.floor((jutil.now() - sTime) / 86400);
                            rewardDataLog = xxArg["rewardDataLog"];
                            rewardKeyLog = xxArg["rewardKeyLog"];
                            if (xxArg == null || xxArg["statusList"][dayNo] == undefined) {
                                cb("dbError");//活动天数有误
                            }
                            else if(userData["arg"]["statusList"][dayNo] == 1){
                                cb("timesNotEnough");//达到次数上限
                            }
                            else {
                                selfPoint = userData["data"] - 0;
                                xxArg["statusList"][dayNo] = 1;
                                slots.getServerData(userUid, isAll, key, sTime, function (err, res) {
                                    if (err)cb(err);
                                    else {
                                        serverPoint = res - 0;
                                        if (selfPoint >= sevenPointNeed || serverPoint >= sevenPointNeed && userVip >= currVip) {//积分超过设定分数可以抽大奖
                                            var addPoint = slotsList["addPoint"];
//                                            serverPoint = serverPoint + addPoint;
                                            selfPoint = selfPoint - 0 + addPoint;
                                            var reducePoint = rewardSlots["rewardPointBase"] * slotsList["slotsReduceRatio"];
                                            userData["data"] = 0;//个人数据清零
                                            serverPoint = 0;//服务器数据清零
                                            returnData["serverPoint"] = serverPoint;

                                            rewardKey = "777";
                                            cdKeyItem = randomItem(cdKeyList);//奖励下标
                                            cdKeyId = cdKeyItem[0]["id"];//奖励下标
                                            cdKey = cdKeyItem[0]["key"];//奖励的cdKey
                                            prizeRList = {"id": cdKeyId, "cdKey": cdKey};
                                            if (cList[cdKeyId] == 0) {//验证领奖状态
                                                cList[cdKeyId] = 1;
                                                returnData["serverPoint"] = serverPoint;
                                                userData["data"] = selfPoint;
                                                //循环保存当前奖励和结果
                                                if (xxArg["rewardKeyLog"] == undefined) {
                                                    alist.push(rewardKey);
                                                    xxArg["rewardKeyLog"] = alist;
                                                } else {
                                                    alist = xxArg["rewardKeyLog"];
                                                    alist.push(rewardKey);
                                                    xxArg["rewardKeyLog"] = alist;
                                                }
                                                if (xxArg["rewardDataLog"] == undefined) {
                                                    blist.push(prizeRList);
                                                    xxArg["rewardDataLog"] = blist;
                                                } else {
                                                    blist = xxArg["rewardDataLog"];
                                                    blist.push(prizeRList);
                                                    xxArg["rewardDataLog"] = blist;
                                                }
                                                returnData["rewardKeyLog"] = alist;
                                                returnData["rewardDataLog"] = blist;
                                                returnData["prizeReward"] = prizeRList;
                                                userData["arg"] = xxArg;
                                                stats.events(userUid, "127.0.0.1", null, mongoStats.P_SLOTS2);
                                                cb(null);
                                            }
                                            else {
                                                cb("noReward");//手太慢了。。。
                                            }
                                        } else {//普通抽奖
                                            var rrItem = randomRewardNormal(rewardNormal);
                                            var rewardItem = rrItem[0]["data"];
//                                            var rewardIndex = rrItem[0]["index"];
                                            if (rewardItem == null) {
                                                cb("dbError");
                                            } else {
                                                var addPoint = slotsList["addPoint"];
                                                serverPoint = serverPoint - 0 + addPoint;
                                                selfPoint = selfPoint - 0 + addPoint;
                                                var reducePoint = rewardItem["rewardPointBase"] * slotsList["rewardPointRatio"];
                                                serverPoint -= reducePoint;
                                                selfPoint -= reducePoint;
                                                rewardKey = randomGroupItem(rewardItem["group"]);
                                                var xxx = checkStringEqual(rewardKey);
                                                if (xxx == 0) {
                                                    rewardBase = rewardItem["rewardBase"][1];
                                                } else {
                                                    rewardBase = rewardItem["rewardBase"][0];
                                                }
                                                rewardData.push({"id": rewardBase["id"], "count": rewardBase["count"] * slotsList["rewardCountRatio"]});
                                                returnData["serverPoint"] = serverPoint;
                                                userData["data"] = selfPoint;
                                                //循环保存当前奖励和结果
                                                if (rewardKeyLog == undefined) {
                                                    alist.push(rewardKey);
                                                    xxArg["rewardKeyLog"] = alist;
                                                } else {
                                                    alist = rewardKeyLog;
                                                    alist.push(rewardKey);
                                                    xxArg["rewardKeyLog"] = alist;
                                                }
                                                if (rewardDataLog == undefined) {
                                                    blist.push({"id": rewardBase["id"], "count": rewardBase["count"] * slotsList["rewardCountRatio"]});//rewardData
                                                    xxArg["rewardDataLog"] = blist;
                                                } else {
                                                    blist = rewardDataLog;
                                                    blist.push({"id": rewardBase["id"], "count": rewardBase["count"] * slotsList["rewardCountRatio"]});
                                                    xxArg["rewardDataLog"] = blist;
                                                }
                                                userData["arg"] = xxArg;
                                                returnData["rewardKeyLog"] = alist;
                                                returnData["rewardDataLog"] = blist;
                                                stats.events(userUid, "127.0.0.1", null, mongoStats.P_SLOTS1);
                                                cb(null);
                                            }
                                        }
                                    }
                                });
                            }
                        }
                    });
                }, function (cb) {
                    async.series([function (cb) {
                        slots.setCDKey(userUid, key, isAll, cList, cb);
                    }, function (cb) {
                        slots.setRewardData(userUid, userData, cb);
                    }, function (cb) {
                        slots.setServerData(userUid, isAll, key, sTime, eTime, returnData["serverPoint"], cb);
                    }, function (cb) {
                        returnData["rewardList"] = [];
                        returnData["reward"] = rewardData;
                        async.eachSeries(returnData["reward"], function (reward, esCb) {
                            mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.P_SLOTS3, reward["count"]);
                            modelUtil.addDropItemToDB(reward["id"], reward["count"], userUid, false, 1, function (err, res) {
                                if (err) {
                                    esCb(err);
                                    console.error(reward["id"], reward["count"], reward["isPatch"], reward["level"], err.stack);
                                } else {
                                    if (res instanceof Array) {
                                        for (var i in res) {
                                            returnData["rewardList"].push(res[i]);
                                        }
                                    } else {
                                        returnData["rewardList"].push(res);
                                    }
                                    esCb(null);
                                }
                            });
                        }, cb);
                    }], function (err, res) {
                        cb(null);
                    });
                }], function (err, result) {
                if (err)
                    response.echo("practice.slots", jutil.errorInfo(err));
                else {
                    response.echo("practice.slots", {
                        "reward": rewardData,
                        "rewardItem": rewardKey,
                        "CDKEY": cdKey,
                        "rewardKeyLog": returnData["rewardKeyLog"],
                        "rewardDataLog": returnData["rewardDataLog"],
                        "prizeReward": returnData["prizeReward"]
                    });
                }
            });
            break;
    }
    function echo(err, res) {
        if (err)
            response.echo("practice.slots", jutil.errorInfo(err));
        else
            response.echo("practice.slots", res);
    }
}
//随机一组奖励
function randomRewardNormal(config) {
    var randomValue = Math.random();
    var probStart = 0;
    var grItem = [];
    for (var i = 0; i < config.length; i++) {
        var probItem = config[i];
        if (randomValue >= probStart && randomValue < (probStart + probItem["prob"])) {
            grItem.push({"index": i, "data": probItem});
            return grItem;
        }
        probStart += probItem["prob"];
    }
    return null;
}
//随机一个组合
function randomGroupItem(config) {
    var length = config.length;
    var randomVal = Math.random();
    var index = Math.floor(randomVal * length);
    return config[index].join("");
}
////随机一个奖励(大奖)
function randomItem(config) {
    var randomValue = Math.random();
    var proS = 0;
    var reItem = [];
    for (var i = 0; i < config.length; i++) {
        var proItem = config[i];
        if (randomValue >= proS && randomValue < (proS + proItem["prob"])) {
            reItem.push({"id": i, "key": proItem["key"]});
            return reItem;
        }
        proS += proItem["prob"];
    }
    return null;
}
////验证字符串内字符是否相等
function checkStringEqual(rewardItem) {
    var a1 = rewardItem.substr(0, 1); // 获取子字符串。
    var a2 = rewardItem.substr(1, 1); // 获取子字符串。
    var a3 = rewardItem.substr(2, 1); // 获取子字符串。
    if (a1 == a2 && a1 == a3 && a2 == a3) {
        return 0;
    } else {
        return 1;
    }
}
exports.start = start;