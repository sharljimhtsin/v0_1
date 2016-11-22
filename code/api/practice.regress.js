/**
 * 回归奖励api--regress
 * User: za
 * Date: 15-2-9
 * Time: 下午18:32
 */
var jutil = require("../utils/jutil");
var practiceRegress = require("../model/practiceRegress");
var async = require("async");
var user = require("../model/user");
var mongoStats = require("../model/mongoStats");
var modelUtil = require("../model/modelUtil");
var activityData = require("../model/activityData");
var userVariable = require("../model/userVariable");
var rewardList = [];

function start(postData, response, query) {
    if (jutil.postCheck(postData) == false) {
        response.echo("practice.regress", jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var sTime = 0;
    var currentConfig;//回归活动配置
    var rewardList = [];
    async.series([
        function (cb) {//取配置
            practiceRegress.getConfig(userUid, function (err, res) {
                if (err) cb(err);
                else {
                    sTime = res[0];
                    currentConfig = res[2];
                    cb(null);
                }
            });
        },
        function (cb) {//取状态
            practiceRegress.getRewardStatus(userUid, sTime, function (err, res) {
                if (err || res == 0) {
                    cb("notOldFriend");
                } else if (res == 2) {//已领取 haveReceive
                    cb("haveReceive");
                } else {
                    cb(null);
                }
            });
        },
        function (cb) {
            async.eachSeries(currentConfig["reward"], function (item, forCb) {
                mongoStats.dropStats(item["id"], userUid, "127.0.0.1", null, mongoStats.P_REGRESS, item["count"], item["level"], item["isPatch"]);
                mongoStats.dropStats(item["id"], userUid, "127.0.0.1", null, mongoStats.REGRESS, item["count"], item["level"], item["isPatch"]);
                modelUtil.addDropItemToDB(item["id"], item["count"], userUid, item["isPatch"], item["level"], function (err, res) {
                    if (err) {
                        forCb(err);
                        console.error(item["id"], item["count"], item["isPatch"], item["level"], err.stack);
                    } else {
                        if (res instanceof Array) {
                            for (var i in res) {
                                rewardList.push(res[i]);
                            }
                        } else {
                            rewardList.push(res);
                        }
                        forCb(null);
                    }
                });
            }, function (err, res) {
                cb(err, res);
            });
        },
        function (cb) {//设置领取状态
            practiceRegress.setRewardStatus(userUid, cb);
        }
    ], function (err, res) {
        if (err) {
            response.echo("practice.regress", jutil.errorInfo(err));
        } else {
            response.echo("practice.regress", {"rewardList": rewardList});
        }
    });
}
exports.start = start;