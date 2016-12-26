/**
 * Created with JetBrains WebStorm.
 * 铁匠铺api
 * User: za
 * Date: 15-11-27 预计三天
 * Time: 下午17:50
 * To change this template use File | Settings | File Templates.
 */

var jutil = require("../utils/jutil");
var async = require("async");
var smith = require("../model/practiceBlackSmith");
var user = require("../model/user");
var modelUtil = require("../model/modelUtil");
var activityConfig = require("../model/activityConfig");
var mongoStats = require("../model/mongoStats");
var formation = require("../model/formation");
var forgeData = require("../model/forgeData");

function start(postData, response, query) {
    var userUid = query["userUid"];
    var action = postData["action"];
    var sTime = 0;//活动开始时间
    var eTime = 0;//活动结束时间
    var currentConfig;//活动配置
    var returnData = {};//返回集合
    var userData = {};//用户数据集合
    var index = 0;//兑换列表中对应一组的下标
    var times = 0;
    var itemList = [];
    var rebate = 0;//消费的折扣
    var processConfig;
    var myIngot = 0;
    var myGold = 0;
    var updateData = {};
    switch (action) {
        case "get":
        default:
            async.series([//取开服时间
                function (cb) {// 取配置
                    smith.getConfig(userUid, function (err, res) {
                        if (err) cb(err);
                        else {
                            sTime = res[0];
                            eTime = res[1];
                            currentConfig = res[2];
                            returnData["sTime"] = sTime;
                            returnData["eTime"] = eTime;
                            returnData["config"] = currentConfig;
                            cb(null);
                        }
                    });
                }, function (cb) {//设置奖励数据
                    smith.getUserData(userUid, sTime, function (err, res) {
                        if (err)cb(err);
                        else {
                            userData = res;
                            returnData["arg"] = userData["arg"];
                            returnData["userData"] = userData;
                            cb(null);
                        }
                    });
                }, function (cb) {
                    smith.setUserData(userUid, userData, cb);
                }], function (err, res) {
                echo(err, returnData);
            });
            break;
        case "convert"://兑换
            if (jutil.postCheck(postData, "index") == false) {
                echo("postError");
                return false;
            }
            index = postData["index"];
            async.series([function (cb) {//获取活动配置
                smith.getConfig(userUid, function (err, res) {
                    if (err) cb(err);
                    else {
                        sTime = res[0];
                        eTime = res[1];
                        currentConfig = res[2];
                        processConfig = currentConfig[index];
                        rebate = processConfig["rebate"] - 0;
                        itemList = processConfig["aItem"];
                        cb(null);
                    }
                });
            }, function (cb) {
                smith.getUserData(userUid, sTime, function (err, res) {
                    if (err) {
                        cb(err);
                    } else {
                        userData = res;
                        userData["dataTime"] = sTime;
                        userData["statusTime"] = eTime;
                        if (userData["arg"][index] == undefined) {
                            userData["arg"][index] = 0;
                            cb(null);
                        } else if (processConfig["times"] - userData["arg"][index] <= 0) {
                            cb("timesNotEnough");
                        } else {
                            cb(null);
                        }
                    }
                });
            }, function (cb) {
                if (isNaN(rebate)) {
                    cb(null);
                } else {
                    for (var r in itemList) {
                        if (itemList[r]["id"] == "ingot") {
                            myIngot = itemList[r]["count"];
                        } else if (itemList[r]["id"] == "gold") {
                            myGold = itemList[r]["count"];
                        }
                    }
                    user.getUser(userUid, function (err, res) {
                        if (err || res == null) {
                            cb("dbError");
                        } else if (res["ingot"] - myIngot < 0) {
                            cb("ingotNotEnough");
                        } else if (res["gold"] - myGold < 0) {
                            cb("goldNotEnough");
                        } else {
                            updateData = {"gold": res["gold"], "ingot": res["ingot"]};
                            cb();
                        }
                    });
                }
            }, function (cb) {
                var arr = {"skill": {"s": 2, "e": 3}, "equip": {"s": 1, "e": 3}, "card": {"s": 1, "e": 6}};
                formation.getUserFormation(userUid, function (err, res) {
                    if (err || res == null)
                        cb("dbError");
                    else {
                        var error = null;
                        for (var i in res) {
                            for (var key in arr) {
                                for (var j = arr[key]["s"]; j <= arr[key]["e"]; j++) {
                                    for (var ii in itemList) {
                                        var itemId = itemList[ii]["id"] + "";
                                        if (itemId == "ingot" || itemId == "gold") {
                                            continue;
                                        }
                                        if (itemId.substr(0, 2) != 15 && itemId.substr(0, 2) != 10 && itemList[ii]["itemUid"].indexOf(res[i][key + j]) != -1) {
                                            error = "isUsed";
                                        }
                                    }
                                }
                            }
                        }
                        cb(error);
                    }
                });
            }, function (cb) {
                forgeData.checkForgeElement(userUid, itemList, cb);
            }, function (cb) {
                var caoLinJian = [];
                async.eachSeries(itemList, function (item, eCb) {
                    forgeData.expendItem(userUid, item["id"], item["type"] ? item["type"] : "", item["count"], function (err, res) {
                        res["count"] = res["number"];
                        caoLinJian.push(res);
                        eCb(err);
                    });
                }, function (err, res) {
                    returnData["itemData"] = caoLinJian;
                    cb(err);
                });
            }, function (cb) {
                userData["arg"][index]++;
                smith.setUserData(userUid, userData, cb);
            }, function (cb) {
                var needCost = false;
                var payIngot = 0;
                var payGold = 0;
                for (var x in itemList) {
                    if (itemList[x]["id"] == "ingot") {
                        payIngot = itemList[x]["count"];
                        needCost = true;
                    } else if (itemList[x]["id"] == "gold") {//扣钱
                        payGold = itemList[x]["count"];
                        needCost = true;
                    }
                }
                if (needCost) {
                    updateData["ingot"] -= payIngot;
                    updateData["gold"] -= payGold;
                    payIngot = payIngot - 0;
                    payGold = payGold - 0;
                    if (payIngot > 0) {
                        mongoStats.expendStats("ingot", userUid, "127.0.0.1", null, mongoStats.P_BLACKSMITH1, payIngot);
                    } else if (payGold > 0) {
                        mongoStats.expendStats("gold", userUid, "127.0.0.1", null, mongoStats.P_BLACKSMITH2, payGold);
                    } else if (payIngot > 0 && payGold > 0) {
                        mongoStats.expendStats("ingot", userUid, "127.0.0.1", null, mongoStats.P_BLACKSMITH1, payIngot);
                        mongoStats.expendStats("gold", userUid, "127.0.0.1", null, mongoStats.P_BLACKSMITH2, payGold);
                    }
                    user.updateUser(userUid, updateData, function (err, res) {
                        var cost = [];
                        cost.push({"ingot": res["ingot"]});
                        cost.push({"gold": res["gold"]});
                        returnData["updateData"] = cost;
                        cb(err);
                    });
                } else {
                    cb(null);
                }
            }, function (cb) {
                returnData["rewardList"] = [];
                async.eachSeries(processConfig["bItem"], function (reward, esCb) {
                    mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.P_BLACKSMITH3, reward["count"]);
                    modelUtil.addDropItemToDB(reward["id"], reward["count"], userUid, false, 1, function (err, res) {
                        if (err) {
                            esCb(err);
                            console.error(reward["id"], reward["count"], err.stack);
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
                echo(err, returnData);
            });
            break;
    }
    function echo(err, res) {
        if (err)
            response.echo("practice.blacksmith", jutil.errorInfo(err));
        else
            response.echo("practice.blacksmith", res);
    }
}
exports.start = start;