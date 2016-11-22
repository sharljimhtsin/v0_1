/**
 * Created by xiazhengxin on 2015/4/2 17:51.
 *
 * 异度空间模型层
 */

var async = require("async");
var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var bitUtil = require("../alien/db/bitUtil");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var user = require("../model/user");
var userVariable = require("../model/userVariable");
var hero = require("../model/hero");
var modelUtil = require("../model/modelUtil");
var item = require("../model/item");
var TAG = "morph";

function getConfig(userUid, isTrans, cb) {
    var CONFIG_NAME = TAG + (isTrans ? "Transform" : "Evolve");
    var config = configManager.createConfig(userUid).getConfig(CONFIG_NAME);
    if (config == null) {
        cb("config err");
    } else {
        config["key"] = "";
        cb(null, [null, null, config]);
    }
}

function getRealTimeTotalTime(configData, index) {
    var totalTime = configData["totalTime"];
    if (index == 1) {
        return totalTime[0] * 60 * 60;
    } else if (index >= 2 && index <= 6) {
        return totalTime[1] * 60 * 60;
    } else {
        return totalTime[2] * 60 * 60;
    }
}

function checkIfEnough(userUid, element, cb) {
    if (isNaN(element["id"])) {
        user.getUserDataFiled(userUid, "ingot", function (err, res) {
            if (err) {
                cb(err);
            } else {
                cb(null, res >= element["count"]);
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

function getDoubleStatus(userUid, key, cb) {
    userVariable.getVariable(userUid, getUniqueKey(TAG, key, "double"), function (err, res) {
        var obj = res == null ? null : JSON.parse(res);
        cb(err, obj);
    });
}

function setDoubleStatus(userUid, key, data, cb) {
    userVariable.setVariable(userUid, getUniqueKey(TAG, key, "double"), JSON.stringify(data), cb);
}

function getTransformList(userUid, key, cb) {
    activityData.getActivityData(userUid, activityData.MORPH_TRANS, function (err, res) {
        var obj;
        if (res["arg"] == "") {
            obj = null;
        } else {
            try {
                var jsonObj = JSON.parse(res["arg"]);
            } catch (e) {
                jsonObj = null;
            } finally {
                obj = jsonObj;
            }
        }
        cb(err, obj);
    });
}

function setTransformList(userUid, key, data, cb) {
    var mObj = {};
    mObj["data"] = 0;
    mObj["dataTime"] = 0;
    mObj["status"] = 0;
    mObj["statusTime"] = 0;
    mObj["arg"] = JSON.stringify(data);
    activityData.updateActivityData(userUid, activityData.MORPH_TRANS, mObj, cb);
}

function getUniqueKey(a, b, c) {
    return jutil.formatString("{0}:{1}", [a, c]);
}

exports.getConfig = getConfig;
exports.getTransformList = getTransformList;
exports.setTransformList = setTransformList;
exports.getDoubleStatus = getDoubleStatus;
exports.setDoubleStatus = setDoubleStatus;
exports.checkIfEnough = checkIfEnough;
exports.getRealTimeTotalTime = getRealTimeTotalTime;