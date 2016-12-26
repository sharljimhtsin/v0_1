/**
 * Created by xiazhengxin on 2016/12/4.
 */

var async = require("async");
var jutil = require("../utils/jutil");
var modelUtil = require("../model/modelUtil");
var configManager = require("../config/configManager");
var noble = require("../model/noble");
var forgeData = require("../model/forgeData");
var mongoStats = require("../model/mongoStats");
var user = require("../model/user");
var TAG = "noble.init";

function start(postData, response, query) {
    if (jutil.postCheck(postData, "index", "equipId") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var index = postData["index"];
    var equipId = postData["equipId"];
    var configData;
    var list = {};
    var costConfig;
    var equipConfig;
    var costResult = [];
    var isFirst = false;
    var costItems = [];
    var currentCost = [];
    async.series([function (cb) {
        noble.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                configData = res;
                costConfig = configData["level"];
                equipConfig = configData["equip"];
                cb();
            }
        });
    }, function (cb) {
        if (equipConfig[index] && (equipConfig[index]["equip"] == equipId)) {
            cb();
        } else {
            cb("typeError");
        }
    }, function (cb) {
        noble.getData(userUid, function (err, res) {
            list = res ? res : list;
            cb(err);
        });
    }, function (cb) {
        if (list && list.hasOwnProperty(index)) {
            var level = parseInt(list[index]["level"]);
            currentCost = costConfig[level] ? costConfig[level] : [];
            var nextLevel = level + 1;
            list[index]["id"] = index;
            list[index]["level"] = nextLevel;
            list[index]["cost"] = costConfig[nextLevel] ? costConfig[nextLevel] : [];
            if (costConfig[level]) {
                cb();
            } else {
                cb("topLevel");
            }
        } else {
            var tmp = equipConfig[index];
            tmp["name"] = jutil.toBase64(tmp["name"]);
            tmp["id"] = index;
            tmp["equipId"] = equipId;
            tmp["level"] = 0;
            tmp["cost"] = costConfig[0];
            currentCost = [];
            list[index] = tmp;
            isFirst = true;
            costItems.push({"id": equipId, "count": 1});
            cb();
        }
    }, function (cb) {
        if (isFirst) {
            forgeData.checkForgeElement(userUid, costItems, cb);
        } else {
            cb();
        }
    }, function (cb) {
        forgeData.checkForgeElement(userUid, currentCost, cb);
    }, function (cb) {
        if (isFirst) {
            async.eachSeries(costItems, function (costItem, costCb) {
                modelUtil.addDropItemToDB(costItem["id"], costItem["count"] * -1, userUid, 1, 1, function (err, res) {
                    if (err) {
                        costCb("notEnough");
                    } else {
                        costResult.push(res);
                        costCb();
                    }
                });
            }, cb);
        } else {
            cb();
        }
    }, function (cb) {
        async.eachSeries(currentCost, function (costItem, costCb) {
            modelUtil.addDropItemToDB(costItem["id"], costItem["count"] * -1, userUid, 1, 1, function (err, res) {
                if (err) {
                    costCb("notEnough");
                } else {
                    user.getUser(userUid, function (err, res) {
                        switch (costItem["id"]) {
                            case "gold":
                                mongoStats.expendStats(costItem["id"], userUid, "127.0.0.1", res, mongoStats.NOBLE2, costItem["count"]);
                                break;
                            case "ingot":
                                mongoStats.expendStats(costItem["id"], userUid, "127.0.0.1", res, mongoStats.NOBLE1, costItem["count"]);
                                break;
                            default:
                                mongoStats.expendStats(costItem["id"], userUid, "127.0.0.1", res, mongoStats.NOBLE5, costItem["count"]);
                                break;
                        }
                    });
                    costResult.push(res);
                    costCb();
                }
            });
        }, cb);
    }, function (cb) {
        noble.setData(userUid, list, cb);
    }], function (err, res) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, {
                "list": list,
                "costResult": costResult
            });
        }
    });
}

exports.start = start;