/**
 * Created by xiazhengxin on 2015/1/20 14:05.
 *
 * 天下第一武道会 首页数据接口
 */

var async = require("async");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var globalContestData = require("../model/globalContestData");
var formation = require("../model/formation");
var user = require("../model/user");
var bitUtil = require("../alien/db/bitUtil");
var TAG = "pvp.globalContest.index";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var stage;
    var stageType;
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

    async.series([function (cb) {
        globalContestData.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                sTime = res[0];
                eTime = res[1];
                configData = res[2];
                isAll = parseInt(configData["isAll"]) || 0;
                key = configData["key"] || "1";
                preKey = configData["preKey"] || "2";
                cb(null);
            }
        });
    }, function (cb) {
        globalContestData.getUserData(userUid, function (err, res) {
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
        stageType = configData["stageType"];
        var now = jutil.now();
        if (sTime + (86400 * 4) < now) {
            stage = 2;//活动开始第4天后
            preKey = key;
        } else if (sTime + 86400 < now) {
            stage = 1;//活动开始第一天后
            globalContestData.startBattle(userUid);
        } else {
            stage = 0;//活动第一天
        }
        cb(null);
    }, function (cb) {
        globalContestData.getTop(userUid, isAll, preKey, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res != null) {
                    first["userUid"] = res;
                    var mCode = bitUtil.parseUserUid(res);
                    first["server"] = mCode[1];
                }
                cb(null);
            }
        });
    }, function (cb) {
        if(first["userUid"] == undefined){
            cb(null);
        } else {
            user.getUser(first["userUid"] , function (err, res) {
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
            first["reward"] = {"type": configData["reward"]["type"], "count": configData["reward"]["count"]};
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
                "stageType": stageType,
                "first": first,
                "score": score,
                "joined": status,
                "freeRefresh": freeRefresh,
                "time": sTime + 86400
            });
        }
    });
}

exports.start = start;