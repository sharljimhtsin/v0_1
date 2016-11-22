/**
 * Created by xiazhengxin on 2015/4/2 17:45.
 *
 * 异度空间 异度转化 领取奖励
 */

var async = require("async");
var activityConfig = require("../model/activityConfig");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var morphData = require("../model/morphData");
var morphPromoData = require("../model/morphPromoData");
var modelUtil = require("../model/modelUtil");
var heroSoul = require("../model/heroSoul");
var hero = require("../model/hero");
var item = require("../model/item");
var TAG = "morph.transform.getBonus";

function start(postData, response, query) {
    if (jutil.postCheck(postData, "index") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var configData;
    var key;
    var list;
    var index = postData["index"];
    var itemId;
    var userData;
    var rewardCount;
    var rewardCountAlt;
    var isDouble = false;
    var openTime;
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
        if (list[index + ""]["status"] != "enable") {
            cb("queue disabled");
        } else {
            cb();
        }
    }, function (cb) {
        hero.getHero(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                // 人物失效
                if (!res.hasOwnProperty(list[index + ""]["heroUid"])) {
                    list[index + ""]["heroId"] = "";
                    list[index + ""]["heroUid"] = "";
                }
                cb();
            }
        });
    }, function (cb) {
        var extraTime = list[index + ""]["extraTime"] - 0;
        var totalTime = morphData.getRealTimeTotalTime(configData, index) * timeDiscount;
        var startTime = list[index + ""]["startTime"] - 0;
        var now = jutil.now();
        var timeDiff = now - list[index + ""]["enableTime"];
        if ((now - startTime) + extraTime > totalTime || (list[index + ""]["type"] == "2" && timeDiff > list[index + ""]["frozenTime"])) {
            itemId = list[index + ""]["heroId"];
            if (itemId != "") {
                if (list[index + ""]["type"] == "2") {
                    itemId = "153401";
                }
                cb();
            } else {
                cb("heroId null");
            }
        } else {
            cb("time not enough");
        }
    }, function (cb) {
        if (avoidList.indexOf(list[index + ""]["heroId"] + "") >= 0) {
            isAvoid = true;
        }
        cb();
    }, function (cb) {
        // 初始化队列
        list[index + ""]["extraTime"] = 0;
        list[index + ""]["startTime"] = 0;
        list[index + ""]["heroId"] = "";
        list[index + ""]["heroUid"] = "";
        morphData.setTransformList(userUid, key, list, cb);
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
        modelUtil.addDropItemToDB(itemId, (isDouble ? 2 : 1) * (isAvoid ? rewardCount[list[index + ""]["type"]] : rewardCountAlt[list[index + ""]["type"]]), userUid, 1, 1, false, cb);
    }, function (cb) {
        if (list[index + ""]["type"] == "2") {
            item.getItem(userUid, itemId, function (err, res) {
                if (err) cb(err);
                else {
                    userData = res;
                    cb();
                }
            });
        } else {
            heroSoul.getHeroSoulItem(userUid, itemId, function (err, res) {
                if (err) cb(err);
                else {
                    userData = res;
                    cb();
                }
            });
        }
    }, function (cb) {
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
                "openTime": openTime,
                "userData": userData
            });
        }
    });
}

exports.start = start;