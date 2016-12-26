/**
 * Created by xiazhengxin on 2015/4/9 18:50.
 *
 * 异度空间 异度转化 使用双倍券
 */

var async = require("async");
var activityConfig = require("../model/activityConfig");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var morphData = require("../model/morphData");
var modelUtil = require("../model/modelUtil");
var item = require("../model/item");
var TAG = "morph.transform.useDouble";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var configData;
    var localConfigData;
    var itemId = "155201";
    var itemData;
    var key;
    var items;
    var userData;
    var isAppend = false;
    var oldData;
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
        localConfigData = configManager.createConfig(userUid).getConfig("item");
        itemData = localConfigData[itemId];
        if (itemData["itemType"] == "52") {
            cb();
        } else {
            cb("item error");
        }
    }, function (cb) {
        morphData.getDoubleStatus(userUid, key, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res == null || res["totalTime"] == null || res["startTime"] == null) {
                    cb();
                } else {
                    if (res["totalTime"] < jutil.now() - res["startTime"]) {
                        isAppend = false;
                    } else {
                        oldData = res;
                        isAppend = true;
                    }
                    cb();
                }
            }
        });
    }, function (cb) {
        //消耗双倍券
        modelUtil.addDropItemToDB(itemId, -1, userUid, 1, 1, cb);
    }, function (cb) {
        if (isAppend) {
            morphData.setDoubleStatus(userUid, key, {
                "id": itemId,
                "totalTime": oldData["totalTime"] - 0 + itemData["typeValue"],
                "startTime": oldData["startTime"]
            }, cb);
        } else {
            morphData.setDoubleStatus(userUid, key, {
                "id": itemId,
                "totalTime": itemData["typeValue"],
                "startTime": jutil.now()
            }, cb);
        }
    }, function (cb) {
        morphData.getDoubleStatus(userUid, key, function (err, res) {
            if (err) {
                cb(err);
            } else {
                items = {
                    "id": res["id"],
                    "coolTime": res["totalTime"] - (jutil.now() - res["startTime"])
                };
                cb();
            }
        });
    }, function (cb) {
        item.getItem(userUid, itemId, function (err, res) {
            userData = res ? res : {"number": 0, "userUid": userUid, "itemId": itemId};
            cb(err);
        });
    }], function (err, res) {
        if (err) response.echo(TAG, jutil.errorInfo(err));
        else {
            response.echo(TAG, {
                "item": items,
                "userData": userData
            });
        }
    });
}

exports.start = start;