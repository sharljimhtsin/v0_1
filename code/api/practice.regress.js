/**
 * 回归奖励api--regress
 * User: za
 * Date: 15-2-9
 * Time: 下午18:32
 */
var jutil = require("../utils/jutil");
var practiceRegress = require("../model/practiceRegress");
var async = require("async");
var mongoStats = require("../model/mongoStats");
var modelUtil = require("../model/modelUtil");
var TAG = "practice.regress";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var sTime = 0;
    var eTime = 0;
    var key;
    var reward;
    var currentConfig;//回归活动配置
    var rewardList = [];
    async.series([
        function (cb) {//取配置
            practiceRegress.getConfig(userUid, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    sTime = res[0];
                    eTime = res[1];
                    currentConfig = res[2];
                    key = currentConfig["key"];
                    reward = currentConfig["reward"];
                    cb();
                }
            });
        },
        function (cb) {
            if (sTime <= jutil.now() && eTime >= jutil.now()) {
                cb();
            } else {
                cb("TIME ERROR");
            }
        },
        function (cb) {
            practiceRegress.checkCondition(userUid, function (err, res) {
                cb(err ? err : (res ? null : "Deny"));
            });
        },
        function (cb) {//取状态
            practiceRegress.getRewardStatus(userUid, key, function (err, res) {
                if (err) {
                    cb(err);
                } else if (res == false) {
                    cb("got yet");
                } else {
                    cb();
                }
            });
        },
        function (cb) {
            async.eachSeries(reward, function (item, forCb) {
                modelUtil.addDropItemToDB(item["id"], item["count"], userUid, 0, 1, function (err, res) {
                    if (err) {
                        forCb(err);
                    } else {
                        if (res instanceof Array) {
                            for (var i in res) {
                                rewardList.push(res[i]);
                            }
                        } else {
                            rewardList.push(res);
                        }
                        forCb();
                        mongoStats.dropStats(item["id"], userUid, "127.0.0.1", null, mongoStats.P_REGRESS, item["count"]);
                        mongoStats.dropStats(item["id"], userUid, "127.0.0.1", null, mongoStats.REGRESS, item["count"]);
                    }
                });
            }, cb);
        },
        function (cb) {//设置领取状态
            practiceRegress.setRewardStatus(userUid, key, cb);
        }
    ], function (err, res) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, {"rewardList": rewardList});
        }
    });
}

exports.start = start;