/**
 * Created by xiazhengxin on 2017/4/6.
 */

var async = require("async");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var user = require("../model/user");
var activityData = require("../model/activityData");
var activityConfig = require("../model/activityConfig");
var modelUtil = require("../model/modelUtil");
var item = require("../model/item");
var heroSoul = require("../model/heroSoul");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");
var TAG = "foolishWheel";

function getConfig(userUid, cb) {
    activityConfig.getConfig(userUid, TAG, function (err, res) {
        if (err || res == null) {
            cb("CannotgetConfig");
        } else {
            if (res[0]) {
                var sTime = res[4];
                var eTime = res[5];
                var currentConfig = res[2];
                cb(null, [sTime, eTime, currentConfig]);
            } else {
                cb("notOpen");
            }
        }
    });
}

function payWithReward(userUid, ingot, cb) {
    var currentConfig;
    async.series([function (sCb) {
        getConfig(userUid, function (err, res) {
            if (err) {
                sCb(err);
            } else {
                currentConfig = res[2];
                sCb();
            }
        });
    }, function (eCb) {
        var multiplex = ingot / parseInt(currentConfig["payReward"]["money"]);
        if (multiplex >= 1) {
            var reward = currentConfig["payReward"]["reward"];
            async.eachSeries(reward, function (one, eaCb) {
                modelUtil.addDropItemToDB(one["id"], one["count"] * multiplex, userUid, false, 1, eaCb);
                //mongoStats.dropStats(one["id"],userUid,"127.0.0.1",null,mongoStats.FOOLISH1,one["count"]);
            }, eCb);
        } else {
            eCb();
        }
    }], cb);
}

function checkIfEnough(userUid, element, cb) {
    element["id"] = element["id"].toString();
    element["count"] = parseInt(element["count"]);
    if (element["id"] == "ingot") {
        user.getUserDataFiled(userUid, "ingot", function (err, res) {
            if (err) {
                cb(err);
            } else {
                cb(null, res >= element["count"]);
            }
        });
    } else if (element["id"] == "gold") {
        user.getUserDataFiled(userUid, "gold", function (err, res) {
            if (err) {
                cb(err);
            } else {
                cb(null, res >= element["count"]);
            }
        });
    } else if (element["id"].substr(0, 2) == "10") {
        heroSoul.getHeroSoulItem(userUid, element["id"], function (err, res) {
            if (err) {
                cb(err);
            } else if (res == null) {
                cb(null, false);
            } else {
                cb(null, res["count"] >= element["count"]);
            }
        });
    } else {
        item.getItem(userUid, element["id"], function (err, res) {
            if (err) {
                cb(err);
            } else if (res == null) {
                cb(null, false);
            } else {
                cb(null, res["number"] >= element["count"]);
            }
        });
    }
}

function getFoolishData(userUid, sTime, currentConfig, cb) {
    var defaultData = {
        "times": 0,
        "gotDate": 0,
        "goldCoin": 0,
        "silverCoin": 0,
        "bronzeCoin": 0,
        "shopList": currentConfig["shopList"]
    };
    activityData.getActivityData(userUid, activityData.FOOLISHWHEEL, function (err, res) {
        if (res != null && res["dataTime"] == sTime) {
            if (err) {
                cb(err);
            } else {
                var obj;
                var jsonObj;
                if (res["arg"] == "") {
                    obj = defaultData;
                } else {
                    try {
                        jsonObj = JSON.parse(res["arg"]);
                    } catch (e) {
                        jsonObj = defaultData;
                    } finally {
                        obj = jsonObj;
                    }
                }
                cb(err, obj);
            }
        } else {
            setFoolishData(userUid, sTime, defaultData, function (err, res) {
                cb(err, defaultData);
            });
        }
    });
}

function setFoolishData(userUid, sTime, data, cb) {
    var mObj = {};
    mObj["data"] = 0;
    mObj["dataTime"] = sTime;
    mObj["status"] = 0;
    mObj["statusTime"] = 0;
    mObj["arg"] = JSON.stringify(data);
    activityData.updateActivityData(userUid, activityData.FOOLISHWHEEL, mObj, cb);
}

exports.getConfig = getConfig;
exports.getFoolishData = getFoolishData;
exports.setFoolishData = setFoolishData;
exports.checkIfEnough = checkIfEnough;
exports.payWithReward = payWithReward;