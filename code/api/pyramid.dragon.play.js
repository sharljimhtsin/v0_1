/**
 * Created by xiazhengxin on 2017/6/8.
 */

var jutil = require("../utils/jutil");
var async = require("async");
var pyramid = require("../model/pyramid");
var item = require("../model/item");
var user = require("../model/user");
var forgeData = require("../model/forgeData");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");
var listApi = require("../api/pyramid.dragon.achievement.list");
var TAG = "pyramid.dragon.play";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var isIngot = false;
    var playCount = postData["count"] ? postData["count"] : 1;
    var currentConfig;//配置
    var sTime = 0;//活动开始时间
    var eTime = 0;//活动结束时间
    var returnData = {};//返回用户初始化数据集合
    var userData = {};//返回用户初始化数据集合
    var playCost;
    var refreshCost;
    var costItemId = "153697";//神龙邀请函
    var costItemNumber = "";
    var discount = playCount == 10 ? 0.9 : 1;
    var costResult = {};
    var rankLine;
    var isAll;
    var key;
    async.series([function (cb) {
        pyramid.getConfig(userUid, isIngot, function (err, res) {
            if (err) {
                cb(err);
            } else {
                currentConfig = res[2];
                sTime = res[0];
                eTime = res[1];
                playCost = currentConfig["play"];
                refreshCost = currentConfig["refresh"];
                cb();
            }
        });
    }, function (cb) {
        if (sTime <= jutil.now() && eTime >= jutil.now()) {
            cb();
        } else {
            cb("TIME ERROR");
        }
    }, function (cb) {
        item.getItem(userUid, costItemId, function (err, res) {
            costItemNumber = res ? res["number"] : 0;
            cb(err);
        });
    }, function (cb) {
        if (costItemNumber > 0) {
            var shouldCost = costItemNumber - playCount;
            var indeedCost = shouldCost >= 0 ? playCount : playCount - Math.abs(shouldCost);
            var ingotCostIndeed = playCount - indeedCost;
            var userIngot = 0;
            costResult["costItemId"] = indeedCost;
            async.series([function (costCb) {
                item.updateItem(userUid, costItemId, indeedCost * -1, costCb);
            }, function (costCb) {
                user.getUserDataFiled(userUid, playCost["id"], function (err, res) {
                    userIngot = parseInt(res);
                    costCb(err);
                });
            }, function (costCb) {
                var ingotCost = ingotCostIndeed * playCost["count"] * discount * -1;
                if (userIngot + ingotCost >= 0) {
                    costResult["ingot"] = ingotCost;
                    var newUser = {};
                    newUser[playCost["id"]] = userIngot + ingotCost;
                    mongoStats.expendStats(playCost["id"], userUid, "", null, mongoStats.PYRAMID2, ingotCost * -1);
                    user.updateUser(userUid, newUser, costCb);
                } else {
                    costCb("ingotNotEnough");
                }
            }], cb);
        } else {
            var costObj = {"id": playCost["id"], "count": playCost["count"] * playCount * discount};
            async.series([function (costCb) {
                pyramid.checkIfEnough(userUid, costObj, function (err, isOK) {
                    if (isOK) {
                        mongoStats.expendStats(costObj["id"], userUid, "", null, mongoStats.PYRAMID2, costObj["count"]);
                        costResult["ingot"] = costObj["count"];
                        costCb(err);
                    } else {
                        costCb("ingotNotEnough");
                    }
                });
            }, function (costCb) {
                forgeData.expendItem(userUid, costObj["id"], null, costObj["count"], costCb);
            }], cb);
        }
    }, function (cb) {
        pyramid.getPyramidData(userUid, sTime, currentConfig, isIngot, function (err, res) {
            userData = res;
            cb(err);
        });
    }, function (cb) {
        var towerList = userData["tower"];
        var currentLevel = userData["currentLevel"];
        var currentTower = towerList[currentLevel];
        var tmpArr = [];
        for (var t = 0; t < playCount; t++) {
            userData["times"]++;
            userData["score"] += 100;
            var r = Math.random();
            var pro = 0;
            var index = -1;
            for (var i in currentTower) {
                pro += parseFloat(currentTower[i]["pro"]);
                if (r < pro) {
                    index = i;
                    break;
                }
            }
            if (index >= 0) {
                tmpArr.push({
                    "id": currentTower[index]["id"],
                    "count": currentTower[index]["count"]
                });
                if (currentTower[index].hasOwnProperty("isKey")) {
                    currentLevel++;
                    if (towerList.hasOwnProperty(currentLevel)) {
                        // do nothing
                    } else {
                        // reach the top
                        currentLevel = 1;
                        userData["isGotAll"] = 1;
                    }
                    currentTower = towerList[currentLevel];
                }
            }
        }
        //save the data
        userData["currentLevel"] = currentLevel;
        returnData["userData"] = userData;
        returnData["reward"] = tmpArr;
        returnData["costResult"] = costResult;
        pyramid.setPyramidData(userUid, sTime, userData, isIngot, cb);
    }, function (cb) {
        returnData["rewardList"] = [];
        async.eachSeries(returnData["reward"], function (item, eCb) {
            switch (item["id"]) {
                case "ingot":
                    mongoStats.dropStats(item["id"], userUid, "127.0.0.1", null, mongoStats.PYRAMID6, item["count"]);
                    break;
                case "gold":
                    mongoStats.dropStats(item["id"], userUid, "127.0.0.1", null, mongoStats.PYRAMID12, item["count"]);
                    break;
                default:
                    mongoStats.dropStats(item["id"], userUid, "127.0.0.1", null, mongoStats.PYRAMID18, item["count"]);
            }
            modelUtil.addDropItemToDB(item["id"], item["count"], userUid, false, 1, function (err, res) {
                if (err) {
                    eCb(err);
                } else {
                    if (res instanceof Array) {
                        for (var i in res) {
                            returnData["rewardList"].push(res[i]);
                        }
                    } else {
                        returnData["rewardList"].push(res);
                    }
                    eCb();
                }
            });
        }, cb);
    }, function (cb) {
        rankLine = currentConfig["rankLine"];
        isAll = parseInt(currentConfig["isAll"]);
        key = currentConfig["key"];
        pyramid.getConfig(userUid, !isIngot, function (err, res) {
            if (err) {
                pyramid.addToRank(userUid, userData["score"], rankLine, eTime, isAll, key, cb);
            } else {
                pyramid.getPyramidData(userUid, res[0], res[2], !isIngot, function (err, res) {
                    pyramid.addToRank(userUid, userData["score"] + res["score"], rankLine, eTime, isAll, key, cb);
                });
            }
        });
    }, function (cb) {
        pyramid.getRankList(userUid, isAll, key, currentConfig, function (err, res) {
            returnData["rankList"] = res;
            cb(err);
        });
    }, function (cb) {
        var rs = new Response();
        listApi.start(postData, rs, query, function (isDone, userData) {
            returnData["userData"] = userData;
            cb();
        });
    }, function (cb) {
        user.getUser(userUid, function (err, res) {
            returnData["ingotResult"] = res;
            cb(err);
        });
    }], function (err, res) {
        if (playCount == 1) {
            stats.events(userUid, "127.0.0.1", null, mongoStats.PYRAMID25);
        } else {
            stats.events(userUid, "127.0.0.1", null, mongoStats.PYRAMID26);
        }
        echo(err, returnData);
    });

    function Response() {
        // nothing
    }

    Response.prototype.echo = function (tag, data) {
        // nothing
    };

    function echo(err, res) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, res);
        }
    }
}
exports.start = start;