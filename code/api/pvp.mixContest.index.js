/**
 * Created by xiazhengxin on 2015/3/16 13:35.
 *
 * 极大大乱斗 首页
 */

var async = require("async");
var redis = require("../alien/db/redis");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var mixContestData = require("../model/mixContestData");
var formation = require("../model/formation");
var user = require("../model/user");
var TAG = "pvp.mixContest.index";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var stage;
    var first = {};
    var score = 0;
    var configData;
    var sTime;
    var eTime;
    var status = 0;
    var freeRefresh = 0;
    var key = "1";
    var preKey = "2";
    var isAll = 0;
    var joinCost;
    async.series([function (cb) {
        mixContestData.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                sTime = res[0];
                eTime = res[1];
                configData = res[2];
                isAll = parseInt(configData["isAll"]) || 0;
                key = configData["key"] || "1";
                preKey = configData["preKey"] || "2";
                joinCost = configData["joinCost"] || 0;
                cb(null);
            }
        });
    }, function (cb) {
        mixContestData.getUserData(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                status = res["status"];
                score = res["data"];
                freeRefresh = res["freeRefresh"];
                cb(null);
            }
        });
    }, function (cb) {
        var now = jutil.now();
        if (sTime + (86400 * 4) < now) {
            stage = 2;//活动开始第4天后
            preKey = key;
            mixContestData.startBattle(userUid);
        } else if (sTime + 86400 < now) {
            stage = 1;//活动开始第一天后
            mixContestData.startBattle(userUid);
        } else {
            stage = 0;//活动第一天
        }
        cb(null);
    }, function (cb) {
        mixContestData.getTop(userUid, isAll, preKey, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res != null) {
                    first["userUid"] = res;
                    first["server"] = mixContestData.getServerNameByUserUid(res);
                }
                cb(null);
            }
        });
    }, function (cb) {
        if (first["userUid"] == undefined) {
            cb(null);
        } else {
            user.getUser(first["userUid"], function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    if (res != null) {
                        first["name"] = res["userName"];
                    }
                    cb(null);
                }
            });
        }
    }, function (cb) {
        if (first["userUid"] == undefined) {
            cb(null);
        } else {
            first["reward"] = configData["rankReward"]["1-1"];
            formation.getUserHeroId(first["userUid"], function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    first["heroId"] = res;
                    cb(null);
                }
            });
        }
    }], function (err, res) {
        if (err) response.echo(TAG, jutil.errorInfo(err));
        else {
            response.echo(TAG, {
                "stage": stage,
                "first": first,
                "score": score,
                "joined": status,
                "freeRefresh": freeRefresh,
                "time": sTime + 86400,
                "joinCost": joinCost
            });
        }
    });
}

exports.start = start;