/**
 * Created by xiazhengxin on 2017/2/7.
 */

var async = require("async");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var user = require("../model/user");
var activityData = require("../model/activityData");
var item = require("../model/item");
var heroSoul = require("../model/heroSoul");
var TAG = "upStarEquipRefine";

function getConfig(userUid, cb) {
    var CONFIG_NAME = "equipXiaohang";
    var config = configManager.createConfig(userUid).getConfig(CONFIG_NAME);
    if (config == null) {
        cb("config err");
    } else {
        cb(null, [null, null, config["refine"]]);
    }
}

function checkIfEnough(userUid, element, cb) {
    element["id"] = element["id"].toString();
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

function getStarData(userUid, cb) {
    activityData.getActivityData(userUid, activityData.UPSTAREQUIPREFINE, function (err, res) {
        var obj;
        var jsonObj;
        if (res["arg"] == "") {
            obj = null;
        } else {
            try {
                jsonObj = JSON.parse(res["arg"]);
            } catch (e) {
                jsonObj = null;
            } finally {
                obj = jsonObj;
            }
        }
        cb(err, obj);
    });
}

function setStarData(userUid, data, cb) {
    var mObj = {};
    mObj["data"] = 0;
    mObj["dataTime"] = 0;
    mObj["status"] = 0;
    mObj["statusTime"] = 0;
    mObj["arg"] = JSON.stringify(data);
    activityData.updateActivityData(userUid, activityData.UPSTAREQUIPREFINE, mObj, cb);
}

function mergeItem(a, b) {
    for (var i = 0; i < a.length; i++) {
        var aItem = a[i];
        var isContain = false;
        for (var j = 0; j < b.length; j++) {
            var bItem = b[j];
            if (aItem["id"] == bItem["id"]) {
                bItem["count"] += aItem["count"];
                isContain = true;
                break;
            }
        }
        if (!isContain) {
            b.push(aItem);
        }
    }
    return b;
}

function getCostItem(userUid, nowData, heroUid, heroId, cb) {
    getConfig(userUid, function (err, res) {
        var returnData = [];
        if (err) {
            cb(err);
        } else {
            var configData = jutil.deepCopy(res[2]);
            var heroStarData = nowData[heroUid];
            if (heroStarData == null) {
                cb();
                return;
            }
            var major = heroStarData["major"];
            var minor = heroStarData["minor"];
            for (var i in configData) {
                if (i > major) {
                    break;
                } else if (i < major) {
                    var price = configData[i]["price"];
                    var soul = configData[i]["soul"];
                    price.push({"id": heroId, "count": soul});
                    returnData = mergeItem(price, returnData);
                    var detail = configData[i]["detail"];
                    for (var j in detail) {
                        var item = detail[j];
                        returnData = mergeItem(item["price"], returnData);
                    }
                } else {
                    var detail = configData[i]["detail"];
                    for (var j in detail) {
                        if (minor > j) {
                            var item = detail[j];
                            returnData = mergeItem(item["price"], returnData);
                        } else {
                            break;
                        }
                    }
                }
            }
            cb(err, returnData);
        }
    });
}

function getAddition(userUid, cb) {
    var starData = {};
    var addData = {};
    async.series([function (sCb) {
        getStarData(userUid, function (err, res) {
            starData = res;
            sCb(err);
        });
    }, function (sCb) {
        for (var uid in starData) {
            var obj = starData[uid];
            switch (obj["type"]) {
                case "12":
                    addData[uid] = {"attack": parseInt(obj["add"]) + parseInt(obj["attr"]), "level": obj["level"]};
                    break;
                case "13":
                    addData[uid] = {"defence": parseInt(obj["add"]) + parseInt(obj["attr"]), "level": obj["level"]};
                    break;
                case "14":
                    addData[uid] = {"hp": parseInt(obj["add"]) + parseInt(obj["attr"]), "level": obj["level"]};
                    break;
            }
        }
        sCb();
    }], function (err, res) {
        cb(err, addData);
    });
}

exports.getConfig = getConfig;
exports.getStarData = getStarData;
exports.setStarData = setStarData;
exports.checkIfEnough = checkIfEnough;
exports.getCostItem = getCostItem;
exports.getAddition = getAddition;