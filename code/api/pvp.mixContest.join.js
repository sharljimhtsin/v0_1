/**
 * Created by xiazhengxin on 2015/3/16 13:35.
 *
 * 极地大乱斗 报名
 */

var async = require("async");
var redis = require("../alien/db/redis");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var mixContestData = require("../model/mixContestData");
var user = require("../model/user");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");
var TAG = "pvp.mixContest.join";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var sTime = 0;
    var isAll;
    var key;
    var joinCost;
    var restIngot;
    var oldUserData;
    async.series([function (cb) {
        mixContestData.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else if (jutil.now() > res[0] - 0 + 86400) {
                cb("timeOut");
            } else {
                sTime = res[0] - 0;
                isAll = parseInt(res[2]["isAll"]) || 0;
                key = res[2]["key"] || "1";
                joinCost = res[2]["joinCost"] || 0;
                cb(null);
            }
        });
    }, function (cb) {
        mixContestData.getUserData(userUid, function (err, res) {
            oldUserData = res;
            cb(err);
        });
    }, function (cb) {
        if (oldUserData["status"] == "0") {
            cb();
        } else {
            joinCost = 0;
            cb();
        }
    }, function (cb) {
        if (joinCost > 0) {
            user.getUser(userUid, function (err, res) {
                if (err) cb(err);
                else {
                    var resultUserIngot = res["ingot"] - 0 - joinCost;
                    if (resultUserIngot < 0) cb("ingotNotEnough");
                    else {
                        var newIngot = {"ingot": resultUserIngot};
                        user.updateUser(userUid, newIngot, function (err, res) {
                            mongoStats.expendStats("ingot", userUid, "127.0.0.1", null, mongoStats.MIXCONTEST_JOIN, joinCost);
                            restIngot = newIngot;
                            cb(err);
                        });
                    }
                }
            });
        } else {
            cb();
        }
    }, function (cb) {
        if (oldUserData["status"] == "0") {
            stats.events(userUid, "127.0.0.1", null, mongoStats.mixContest4);
            mixContestData.joinActivity(userUid, isAll, key, sTime, oldUserData ? oldUserData["data"] : 0, cb);
        } else {
            cb();
        }
    }], function (err, res) {
        if (err) response.echo(TAG, jutil.errorInfo(err));
        else {
            response.echo(TAG, {"joined": 1, "userIngot": restIngot});
        }
    });
}

exports.start = start;