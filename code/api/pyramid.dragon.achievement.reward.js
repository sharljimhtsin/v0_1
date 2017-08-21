/**
 * Created by xiazhengxin on 2017/6/12.
 */

var jutil = require("../utils/jutil");
var async = require("async");
var pyramid = require("../model/pyramid");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");
var TAG = "pyramid.dragon.achievement.reward";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var isIngot = false;
    var index = postData["index"];
    var currentConfig;//配置
    var sTime = 0;//活动开始时间
    var eTime = 0;//活动结束时间
    var returnData = {};//返回用户初始化数据集合
    var userData = {};//返回用户初始化数据集合
    async.series([function (cb) {
        pyramid.getConfig(userUid, isIngot, function (err, res) {
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
        pyramid.getPyramidData(userUid, sTime, currentConfig, isIngot, function (err, res) {
            userData = res;
            cb(err);
        });
    }, function (cb) {
        var achievementList = userData["achievement"];
        var targets = Object.keys(achievementList);
        var target = targets[index] ? targets[index] : null;
        if (target) {
            var reward = achievementList[target];
            if (reward && reward[0].hasOwnProperty("canGet") && !reward[0].hasOwnProperty("isGot")) {//至少拥有一个子元素
                reward[0]["isGot"] = 1;
                achievementList[target] = reward;
            } else {
                cb("canNotGet");
            }
        } else {
            cb("indexError");
        }
        //save the data
        userData["achievement"] = achievementList;
        returnData["userData"] = userData;
        returnData["reward"] = reward;
        returnData["rewardList"] = [];
        pyramid.setPyramidData(userUid, sTime, userData, isIngot, cb);
    }, function (cb) {
        async.eachSeries(returnData["reward"], function (item, eCb) {
            switch (item["id"]) {
                case "ingot":
                    mongoStats.dropStats(item["id"], userUid, "127.0.0.1", null, mongoStats.PYRAMID7, item["count"]);
                    break;
                case "gold":
                    mongoStats.dropStats(item["id"], userUid, "127.0.0.1", null, mongoStats.PYRAMID13, item["count"]);
                    break;
                default:
                    mongoStats.dropStats(item["id"], userUid, "127.0.0.1", null, mongoStats.PYRAMID19, item["count"]);
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