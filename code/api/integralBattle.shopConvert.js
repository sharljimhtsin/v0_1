/**
 * Created with JetBrains WebStorm.
 * User: za
 * Date: 16-7-11
 * Time: 下午 15:55
 * To change this template use File | Settings | File Templates.
 */
var user = require("../model/user");
var jutil = require("../utils/jutil");
var async = require("async");
var configManager = require("../config/configManager");
var integral = require("../model/integralBattle");
var item = require("../model/item");
var mongoStats = require("../model/mongoStats");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "index") == false) {
        response.echo("integralBattle.shopConvert", jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var index = postData["index"];//从0开始的数组下标
    var sTime;
    var currentConfig;
    var rewardList = {};
    var badgeShop = {};
    var returnData = {};
    var residueTimesList = [];
    var userData = {};
    var isAll = 0;
    async.series([function (cb) {
        integral.getConfig(userUid, function (err, res) {
            if (err)cb(err);
            else {
                sTime = res[0];
                currentConfig = res[2];
                if (currentConfig["badgeShop"] == undefined) {
                    cb("configError");
                } else {
                    badgeShop = currentConfig["badgeShop"];
                    if (badgeShop[index] != undefined) {
                        rewardList = badgeShop[index];
                        isAll = parseInt(res[2]["isAll"]) || 0;
                        if (rewardList["reward"] == undefined) {
                            cb("configError");
                        } else {
                            cb(null);
                        }
                    } else {
                        cb("configError");
                    }
                }
            }
        });
    }, function (cb) {
        integral.getUserData(userUid, sTime, function (err, res) {
            if (err)cb(err);
            else {
                userData = res;
                if (userData["arg"]["residueTimesList"][0] == undefined) {
                    cb("dbError");
                } else if (userData["arg"]["residueTimesList"][index] <= 0) {
                    cb("timesNotEnough");
                } else {
                    userData["arg"]["residueTimesList"][index]--;
                    returnData["residueTimesList"] = userData["arg"]["residueTimesList"];
                    integral.setUserData(userUid, userData, cb);
                }
            }
        });
    }, function (cb) {//计算数值
        if (rewardList["costType"] == undefined) {
            cb("typeError");
        } else {
            if (rewardList["costType"] == "ingot") {
                user.getUser(userUid, function (err, res) {
                    if (err)cb(err);
                    else {
                        if (res["ingot"] - rewardList["costCount"] >= 0) {
                            var newCt = (res["ingot"] - rewardList["costCount"]) - 0;
                            returnData["residueItem"] = {"ingot": newCt};
                            mongoStats.expendStats("ingot", userUid, "127.0.0.1", null, mongoStats.E_INTEBATTLE9, rewardList["costCount"]);//积分擂台赛金币消耗
                            user.updateUser(userUid, {"ingot": newCt}, cb);
                        } else {
                            cb("ingotNotEnough");
                        }
                    }
                });
            } else if (rewardList["costType"] == "gold") {
                user.getUser(userUid, function (err, res) {
                    if (err)cb(err);
                    else {
                        if (res["gold"] - rewardList["costCount"] >= 0) {
                            var newCt = (res["gold"] - rewardList["costCount"]) - 0;
                            returnData["residueItem"] = {"gold": newCt};
                            user.updateUser(userUid, {"gold": newCt}, cb);
                        } else {
                            cb("goldNotEnough");
                        }
                    }
                });
            } else {
                item.getItem(userUid, rewardList["costType"], function (err, res) {
                    if (err)cb(err);
                    else {
                        if (res["number"] != undefined) {
                            if (res["number"] - rewardList["costCount"] >= 0) {
                                var newCt = res["number"] - rewardList["costCount"];
                                returnData["residueItem"] = {"itemId": rewardList["costType"], "number": newCt};
                                mongoStats.expendStats(rewardList["costType"], userUid, '127.0.0.1', null, mongoStats.E_INTEBATTLE4, rewardList["costCount"]);
                                item.updateItem(userUid, rewardList["costType"], -rewardList["costCount"], cb);
                            } else {
                                cb("itemNotEnough");
                            }
                        } else {
                            cb("noItem");
                        }
                    }
                });
            }
        }
    }, function (cb) {
        returnData["rewardList"] = [];
        async.eachSeries(rewardList["reward"], function (reward, esCb) {
            mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.E_INTEBATTLE8, reward["count"]);
            integral.addDropItem(reward["id"], reward["count"], userUid, false, 1, function (err, res) {
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
    }], function (err) {
        if (err) {
            response.echo("integralBattle.shopConvert", jutil.errorInfo(err));
        } else {
            response.echo("integralBattle.shopConvert", returnData);
        }
    });
}

exports.start = start;