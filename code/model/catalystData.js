/**
 * Created by xiazhengxin on 2015/6/19 12:15.
 *
 * 布利夫博士研究所 数据模型
 */

var async = require("async");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var user = require("../model/user");
var userVariable = require("../model/userVariable");
var activityData = require("../model/activityData");
var modelUtil = require("../model/modelUtil");
var item = require("../model/item");
var equipment = require("../model/equipment");
var TAG = "catalyst";

function getConfig(userUid, cb) {
    var CONFIG_NAME = "enchant";
    var config = configManager.createConfig(userUid).getConfig(CONFIG_NAME);
    if (config == null) {
        cb("config err");
    } else {
        cb(null, [null, null, config]);
    }
}

function checkIfEnough(userUid, element, cb) {
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

function getTimes(userUid, cb) {
    userVariable.getVariable(userUid, getUniqueKey(TAG, "times"), function (err, res) {
        var obj = res == null ? 0 : res;
        cb(err, obj);
    });
}

function setTimes(userUid, data, cb) {
    userVariable.setVariable(userUid, getUniqueKey(TAG, "times"), data, cb);
}

function getPickedColumns(userUid, cb) {
    activityData.getActivityData(userUid, activityData.CATALYST, function (err, res) {
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

function setPickedColumns(userUid, data, cb) {
    var mObj = {};
    mObj["data"] = 0;
    mObj["dataTime"] = 0;
    mObj["status"] = 0;
    mObj["statusTime"] = 0;
    mObj["arg"] = JSON.stringify(data);
    activityData.updateActivityData(userUid, activityData.CATALYST, mObj, cb);
}

function getEquipment(userUid, equipmentUid, cb) {
    equipment.getEquipment(userUid, function (err, res) {
        if (err || res == null) {
            cb(err);
        } else {
            cb(null, res.hasOwnProperty(equipmentUid) ? res[equipmentUid] : null);
        }
    });
}

function setEquipment(userUid, equipmentUid, data, cb) {
    equipment.updateEquipment(userUid, equipmentUid, data, cb);
}

function getUniqueKey(a, b) {
    return jutil.formatString("{0}:{1}", [a, b]);
}

exports.getConfig = getConfig;
exports.getEquipment = getEquipment;
exports.setEquipment = setEquipment;
exports.getTimes = getTimes;
exports.setTimes = setTimes;
exports.getPickedColumns = getPickedColumns;
exports.setPickedColumns = setPickedColumns;
exports.checkIfEnough = checkIfEnough;