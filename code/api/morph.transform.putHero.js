/**
 * Created by xiazhengxin on 2015/4/2 17:45.
 *
 * 异度空间 异度转化 设置英雄
 */

var async = require("async");
var activityConfig = require("../model/activityConfig");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var morphData = require("../model/morphData");
var morphPromoData = require("../model/morphPromoData");
var hero = require("../model/hero");
var TAG = "morph.transform.putHero";

function start(postData, response, query) {
    if (jutil.postCheck(postData, "index", "heroUid") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var configData;
    var key;
    var list;
    var index = postData["index"];
    var heroUid = postData["heroUid"];
    var heroId;
    var coolTime;
    var openTime;
    var reward;
    var isDouble;
    var rewardCount;
    var rewardCountAlt;
    var heroList = [];
    var heroOwned;
    var timeDiscount = 1;
    var costDiscount = 1;
    var avoidList;
    var isAvoid = false;
    async.series([function (cb) {
        morphData.getConfig(userUid, true, function (err, res) {
            if (err) {
                cb(err);
            } else {
                configData = res[2];
                key = configData["key"];
                rewardCount = configData["rewardCount"];
                rewardCountAlt = configData["rewardCountAlt"];
                cb();
            }
        });
    }, function (cb) {
        morphData.getConfig(userUid, false, function (err, res) {
            if (err) {
                cb(err);
            } else {
                var tmp = res[2];
                avoidList = Object.keys(tmp["reward"]);
                cb();
            }
        });
    }, function (cb) {
        morphPromoData.isActivityOpen(userUid, function (err, isOpen, res) {
            if (isOpen) {
                timeDiscount = res["timeDiscount"];
                costDiscount = res["costDiscount"];
            }
            cb(err);
        });
    }, function (cb) {
        morphData.getTransformList(userUid, key, function (err, res) {
            if (err) {
                cb(err);
            } else {
                list = res;
                cb(null);
            }
        });
    }, function (cb) {
        var extraTime = list[index + ""]["extraTime"] - 0;
        var totalTime = morphData.getRealTimeTotalTime(configData, index) * timeDiscount;
        var startTime = list[index + ""]["startTime"] - 0;
        var now = jutil.now();
        var timeDiff = now - list[index + ""]["enableTime"];
        if (list[index + ""]["status"] != "enable") {
            cb("queue disabled");
        } else if (list[index + ""]["type"] == "2" && timeDiff > list[index + ""]["frozenTime"]) {
            cb("queue disabled again");
        } else {
            if ((now - startTime) + extraTime > totalTime && startTime > 0 && list[index + ""]["heroId"] != "") {
                cb("queue not empty");
            } else {
                cb();
            }
        }
    }, function (cb) {
        hero.getHero(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res && res[heroUid]) {
                    var hero = res[heroUid];
                    heroId = hero["heroId"];
                    heroOwned = res;
                    cb();
                } else {
                    cb("hero null");
                }
            }
        });
    }, function (cb) {
        async.eachSeries(Object.keys(list), function (item, eachCb) {
            var eachOne = list[item];
            if (eachOne["heroId"] == "") {
                eachCb();
            } else {
                // 人物失效
                if (!heroOwned.hasOwnProperty(eachOne["heroUid"])) {
                    list[item]["heroId"] = "";
                    list[item]["heroUid"] = "";
                } else {
                    heroList.push(list[item]["heroId"]);
                }
                eachCb();
            }
        }, function (err, res) {
            cb(err);
        });
    }, function (cb) {
        if (heroList.indexOf(heroId) == -1) {
            list[index + ""]["heroId"] = heroId;
            list[index + ""]["heroUid"] = heroUid;
            list[index + ""]["startTime"] = jutil.now();
            list[index + ""]["extraTime"] = 0;
            morphData.setTransformList(userUid, key, list, cb);
        } else {
            cb("same hero");
        }
    }, function (cb) {
        morphData.getDoubleStatus(userUid, key, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res && res["totalTime"] > jutil.now() - res["startTime"]) {
                    isDouble = true;
                }
                cb(null);
            }
        });
    }, function (cb) {
        if (avoidList.indexOf(list[index + ""]["heroId"] + "") >= 0) {
            isAvoid = true;
        }
        cb();
    }, function (cb) {
        reward = {
            "id": list[index + ""]["type"] == "2" ? "153401" : heroId,
            "count": (isDouble ? 2 : 1) * (isAvoid ? rewardCount[list[index + ""]["type"]] : rewardCountAlt[list[index + ""]["type"]])
        };
        coolTime = morphData.getRealTimeTotalTime(configData, index) * timeDiscount - (jutil.now() - list[index + ""]["startTime"]) - list[index + ""]["extraTime"];
        if (list[index + ""]["type"] == "2") {
            openTime = list[index + ""]["frozenTime"] - (jutil.now() - list[index + ""]["enableTime"]);
        } else {
            openTime = 0;
        }
        cb();
    }], function (err, res) {
        if (err) response.echo(TAG, jutil.errorInfo(err));
        else {
            response.echo(TAG, {
                "coolTime": coolTime,
                "openTime": openTime,
                "heroId": heroId,
                "heroUid": heroUid,
                "reward": reward
            });
        }
    });
}

exports.start = start;