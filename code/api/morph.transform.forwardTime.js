/**
 * Created by xiazhengxin on 2015/4/2 17:46.
 *
 * 异度空间 异度转化 加速转化
 */

var async = require("async");
var activityConfig = require("../model/activityConfig");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var morphData = require("../model/morphData");
var morphPromoData = require("../model/morphPromoData");
var modelUtil = require("../model/modelUtil");
var item = require("../model/item");
var user = require("../model/user");
var TAG = "morph.transform.forwardTime";

function start(postData, response, query) {
    if (jutil.postCheck(postData, "index") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var configData;
    var localConfigData;
    var itemData;
    var key;
    var list;
    var index = postData["index"];
    var itemId = postData["itemId"] ? postData["itemId"] : "155301";
    var coolTime;
    var openTime;
    var userData;
    var targetExtraTime;
    var useIngot = false;
    var timeDiscount = 1;
    var costDiscount = 1;
    async.series([function (cb) {
        morphData.getConfig(userUid, true, function (err, res) {
            if (err) {
                cb(err);
            } else {
                configData = res[2];
                key = configData["key"];
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
        localConfigData = configManager.createConfig(userUid).getConfig("item");
        itemData = localConfigData[itemId];
        if (itemData["itemType"] == "53") {
            cb();
        } else {
            cb("item error");
        }
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
        } else if (list[index + ""]["type"] == "2") {
            var timeDiff = jutil.now() - list[index + ""]["enableTime"];
            if (timeDiff > list[index + ""]["frozenTime"]) {
                cb("queue disabled again");
            } else {
                cb();
            }
        } else {
            cb();
        }
    }, function (cb) {
        targetExtraTime = list[index + ""]["extraTime"] - 0 + itemData["typeValue"];
        var totalTime = morphData.getRealTimeTotalTime(configData, index) * timeDiscount;
        if (totalTime * 0.5 > targetExtraTime) {
            cb();
        } else {
            cb("time exceed");
        }
    }, function (cb) {
        //消耗大力丸
        modelUtil.addDropItemToDB("155301", -1, userUid, 1, 1, function (err, res) {
            cb(err);
            if (err) {
                //消耗金币
                useIngot = false;
            }
        });
    }, function (cb) {
        if (useIngot) {
            var itemConfig = configManager.createConfig(userUid).getConfig("item");
            user.getUser(userUid, function (err, res) {
                if (err) cb(err);
                else {
                    var resultUserIngot = res["ingot"] - 0 - itemConfig["155301"]["salePrice"];
                    if (resultUserIngot < 0) cb("ingotNotEnough");
                    else {
                        var newIngot = {"ingot": resultUserIngot};
                        user.updateUser(userUid, newIngot, function (err, res) {
                            userData = newIngot;
                            cb(err);
                        });
                    }
                }
            });
        } else {
            cb();
        }
    }, function (cb) {
        list[index + ""]["extraTime"] = targetExtraTime;
        morphData.setTransformList(userUid, key, list, cb);
    }, function (cb) {
        coolTime = morphData.getRealTimeTotalTime(configData, index) * timeDiscount - (jutil.now() - list[index + ""]["startTime"]) - list[index + ""]["extraTime"];
        if (list[index + ""]["type"] == "2") {
            openTime = list[index + ""]["frozenTime"] - (jutil.now() - list[index + ""]["enableTime"]);
        } else {
            openTime = 0;
        }
        cb();
    }, function (cb) {
        if (useIngot) {
            cb();
        } else {
            item.getItem(userUid, itemId, function (err, res) {
                userData = res ? res : {"number": 0, "userUid": userUid, "itemId": itemId};
                cb(err);
            });
        }
    }], function (err, res) {
        if (err) response.echo(TAG, jutil.errorInfo(err));
        else {
            response.echo(TAG, {
                "coolTime": coolTime,
                "openTime": openTime,
                "userData": userData
            });
        }
    });
}

exports.start = start;