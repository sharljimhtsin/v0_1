/**
 * Created by xiazhengxin on 2015/7/17 11:27.
 *
 * 技能附魔数据模型
 */

var async = require("async");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var user = require("../model/user");
var userVariable = require("../model/userVariable");
var activityData = require("../model/activityData");
var modelUtil = require("../model/modelUtil");
var item = require("../model/item");
var skill = require("../model/skill");
var TAG = "modifier";

function getConfig(userUid, cb) {
    var CONFIG_NAME = "skillEnchant";
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

function getPickedColumns(userUid, cb) {
    activityData.getActivityData(userUid, activityData.MODIFIER, function (err, res) {
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
    activityData.updateActivityData(userUid, activityData.MODIFIER, mObj, cb);
}

function getSkill(userUid, skillUid, cb) {
    skill.getSkill(userUid, function (err, res) {
        if (err || res == null) {
            cb(err);
        } else {
            cb(null, res.hasOwnProperty(skillUid) ? res[skillUid] : null);
        }
    });
}

function setSkill(userUid, skillUid, data, cb) {
    skill.updateSkill(userUid, skillUid, data, cb);
}

exports.getConfig = getConfig;
exports.getSkill = getSkill;
exports.setSkill = setSkill;
exports.getPickedColumns = getPickedColumns;
exports.setPickedColumns = setPickedColumns;
exports.checkIfEnough = checkIfEnough;