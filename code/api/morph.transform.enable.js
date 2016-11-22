/**
 * Created by xiazhengxin on 2015/4/2 17:45.
 *
 * 异度空间 异度转化 启用队列
 */

var async = require("async");
var activityConfig = require("../model/activityConfig");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var morphData = require("../model/morphData");
var morphPromoData = require("../model/morphPromoData");
var user = require("../model/user");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var TAG = "morph.transform.enable";

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
    var openTime;
    var userData;
    var costConfig;
    var shouldCost;
    var timeDiscount = 1;
    var costDiscount = 1;
    async.series([function (cb) {
        morphData.getConfig(userUid, true, function (err, res) {
            if (err) {
                cb(err);
            } else {
                configData = res[2];
                key = configData["key"];
                costConfig = configData["cost"];
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
            cb();
        } else if (list[index + ""]["type"] == "2") {
            var timeDiff = jutil.now() - list[index + ""]["enableTime"];
            if (timeDiff > list[index + ""]["frozenTime"]) {
                cb();
            } else {
                cb("already enabled");
            }
        } else {
            cb("already enabled");
        }
    }, function (cb) {
        var type = list[index + ""]["type"] + "";
        var i = type == "1" ? 1 : 0;
        for (var k in list) {
            var v = list[k];
            if (v["type"] == type && v["status"] == "enable") {
                if (type == "1") {
                    i++;
                } else {
                    var timeDiff = jutil.now() - v["enableTime"];
                    if (timeDiff < list[index + ""]["frozenTime"]) {
                        i++;
                    }
                }
            }
        }
        shouldCost = costConfig[type][i + ""];
        cb();
    }, function (cb) {
        modelUtil.addDropItemToDB(shouldCost["id"], shouldCost["count"] * -1 * costDiscount, userUid, 1, 1, function (err, res) {
            if (err) {
                cb("NotEnough");
            } else {
                //异度空间开启列阵(金币消耗统计)
                mongoStats.expendStats(shouldCost["id"], userUid, "127.0.0.1", null, mongoStats.MORPH_TRANSFROM_ENABLE, shouldCost["count"] * costDiscount);
                userData = res;
                cb();
            }
        });
    }, function (cb) {
        list[index + ""]["status"] = "enable";
        list[index + ""]["startTime"] = 0;
        list[index + ""]["enableTime"] = jutil.now();
        morphData.setTransformList(userUid, key, list, cb);
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