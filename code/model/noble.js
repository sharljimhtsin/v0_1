/**
 * Created by xiazhengxin on 2016/12/4.
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
var TAG = "noble";

function getConfig(userUid, cb) {
    var CONFIG_NAME = "nobility";
    var config = configManager.createConfig(userUid).getConfig(CONFIG_NAME);
    if (config == null) {
        cb("configErr");
    } else {
        cb(null, config);
    }
}

function getAddition(userUid, cb) {
    var data;
    var config;
    var vip;
    var equipCount = 0;
    var addList = {};
    async.series([function (addCb) {
        getData(userUid, function (err, res) {
            data = res;
            addCb(err);
        });
    }, function (addCb) {
        getConfig(userUid, function (err, res) {
            config = res;
            addCb(err);
        });
    }, function (addCb) {
        user.getUserDataFiled(userUid, "vip", function (err, res) {
            vip = res;
            addCb(err);
        });
    }, function (addCb) {
        if (data && config) {
            var equipConfig = config["equip"];
            async.eachSeries(Object.keys(data), function (key, eCb) {
                equipCount++;
                var item = data[key];
                var addType = item["attrType"];
                var addValue = item["attr"][item["level"]];
                if (addList.hasOwnProperty(addType)) {
                    addList[addType] = parseInt(addList[addType]) + parseInt(addValue);
                } else {
                    addList[addType] = parseInt(addValue);
                }
                eCb();
            }, addCb);
        } else {
            addCb("dataError");
        }
    }, function (addCb) {
        var suitConfig = config["suit"];
        var addTmp = {};
        for (var count in suitConfig) {
            if (equipCount >= count) {
                addTmp = suitConfig[count];
            }
        }
        var addType = addTmp["type"];
        var addValue = addTmp["attr"];
        if (addList.hasOwnProperty(addType)) {
            addList[addType] = parseInt(addList[addType]) + parseInt(addValue);
        } else {
            addList[addType] = parseInt(addValue);
        }
        addCb();
    }, function (addCb) {
        var vipConfig = config["vip"];
        var vipAdd = vipConfig.hasOwnProperty(vip) ? vipConfig[vip]["attr"] : 0;
        for (var type in addList) {
            addList[type] += addList[type] * vipAdd;
        }
        addCb();
    }], function (err, res) {
        cb(err, addList);
    });
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

function getMapStatus(userUid, cb) {
    activityData.getActivityData(userUid, activityData.NOBLE_MAP, function (err, res) {
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

function setMapStatus(userUid, data, cb) {
    var mObj = {};
    mObj["data"] = 0;
    mObj["dataTime"] = 0;
    mObj["status"] = 0;
    mObj["statusTime"] = 0;
    mObj["arg"] = JSON.stringify(data);
    activityData.updateActivityData(userUid, activityData.NOBLE_MAP, mObj, cb);
}

function getData(userUid, cb) {
    activityData.getActivityData(userUid, activityData.NOBLE, function (err, res) {
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

function setData(userUid, data, cb) {
    var mObj = {};
    mObj["data"] = 0;
    mObj["dataTime"] = 0;
    mObj["status"] = 0;
    mObj["statusTime"] = 0;
    mObj["arg"] = JSON.stringify(data);
    activityData.updateActivityData(userUid, activityData.NOBLE, mObj, cb);
}

function getUniqueKey(a, b, c) {
    return jutil.formatString("{0}:{1}", [a, c]);
}

exports.getConfig = getConfig;
exports.getData = getData;
exports.setData = setData;
exports.getMapStatus = getMapStatus;
exports.setMapStatus = setMapStatus;
exports.checkIfEnough = checkIfEnough;
exports.getAddition = getAddition;