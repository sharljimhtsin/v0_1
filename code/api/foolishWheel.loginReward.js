/**
 * Created by xiazhengxin on 2017/4/10.
 */

var jutil = require("../utils/jutil");
var async = require("async");
var foolishWheel = require("../model/foolishWheel");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");
var TAG = "foolishWheel.loginReward";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var currentConfig;//配置
    var sTime = 0;//活动开始时间
    var eTime = 0;//活动结束时间
    var returnData = {};//返回用户初始化数据集合
    var userData = {};//返回用户初始化数据集合
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
        foolishWheel.getFoolishData(userUid, sTime, currentConfig, function (err, res) {
            userData = res;
            cb(err);
        });
    }, function (cb) {
        if (jutil.compTimeDay(userData["gotDate"], jutil.now())) {
            cb("gotYet");
        } else {
            userData["gotDate"] = jutil.now();
            returnData["reward"] = currentConfig["loginReward"];
            cb();
        }
    }, function (cb) {
        foolishWheel.setFoolishData(userUid, sTime, userData, cb);
    }, function (cb) {
        returnData["rewardList"] = [];
        async.eachSeries(returnData["reward"], function (reward, esCb) {
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
                    //mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.FOOLISH1, reward["count"]);
                    esCb();
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
