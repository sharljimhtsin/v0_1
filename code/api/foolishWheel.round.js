/**
 * Created by xiazhengxin on 2017/4/10.
 */

var jutil = require("../utils/jutil");
var async = require("async");
var foolishWheel = require("../model/foolishWheel");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");
var timeLimitActivityReward = require("../model/timeLimitActivityReward");
var TAG = "foolishWheel.round";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var count = postData["count"] ? parseInt(postData["count"]) : 1;
    var currentConfig;//配置
    var sTime = 0;//活动开始时间
    var eTime = 0;//活动结束时间
    var returnData = {};//返回用户初始化数据集合
    var userData = {};//返回用户初始化数据集合
    var costType = ["goldCoin", "silverCoin", "bronzeCoin"];
    var costItem;
    async.series([function (cb) {
        foolishWheel.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                currentConfig = res[2];
                sTime = res[0];
                eTime = res[1];
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
        costItem = jutil.deepCopy(currentConfig["play"]);
        costItem["count"] = costItem["count"] * count;
        foolishWheel.checkIfEnough(userUid, costItem, function (err, isOK) {
            if (isOK) {
                cb(err);
            } else {
                cb("not enough");
            }
        });
    }, function (cb) {
        modelUtil.addDropItemToDB(costItem["id"], costItem["count"] * -1, userUid, false, 1, function (err, res) {
            mongoStats.expendStats(costItem["id"], userUid, "127.0.0.1", null, mongoStats.FOOLISH7, costItem["count"]);
            returnData["userData"] = res;
            cb(err);
        });
    }, function (cb) {
        foolishWheel.getFoolishData(userUid, sTime, currentConfig, function (err, res) {
            userData = res;
            cb(err);
        });
    }, function (cb) {
        var tmpArr = [];
        for (var t = 0; t < count; t++) {
            var r = Math.random();
            var pro = 0;
            for (var i in currentConfig["rand"]) {
                pro += parseFloat(currentConfig["rand"][i]["pro"]);
                returnData["index"] = i;
                if (r < pro) {
                    break;
                }
            }
            userData["times"]++;
            tmpArr.push({
                "id": currentConfig["rand"][returnData["index"]]["id"],
                "count": currentConfig["rand"][returnData["index"]]["count"]
            });
        }
        returnData["reward"] = tmpArr;
        cb();
    }, function (cb) {
        foolishWheel.setFoolishData(userUid, sTime, userData, cb);
    }, function (cb) {
        returnData["rewardList"] = [];
        async.eachSeries(returnData["reward"], function (reward, esCb) {
            if (costType.indexOf(reward["id"]) == -1) {
                modelUtil.addDropItemToDB(reward["id"], reward["count"], userUid, false, 1, function (err, res) {
                    if (err) {
                        esCb(err);
                    } else {
                        if (res instanceof Array) {
                            for (var i in res) {
                                returnData["rewardList"].push(res[i]);
                            }
                        } else {
                            returnData["rewardList"].push(res);
                        }
                        mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.FOOLISH6, reward["count"]);
                        esCb();
                    }
                });
            } else {
                userData[reward["id"]] += parseInt(reward["count"]);
                returnData["rewardList"] = userData;
                foolishWheel.setFoolishData(userUid, sTime, userData, esCb);
            }
        }, cb);
    }, function (cb) {
        if (count == 1) {
            stats.events(userUid, "127.0.0.1", null, mongoStats.FOOLISH1);
        } else {
            stats.events(userUid, "127.0.0.1", null, mongoStats.FOOLISH2);
        }
        timeLimitActivityReward.foolishWheelPlay(userUid, count, function () {
            cb();
        });
    }], function (err, res) {
        echo(err, returnData);
    });

    function echo(err, res) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, res);
        }
    }
}
exports.start = start;
