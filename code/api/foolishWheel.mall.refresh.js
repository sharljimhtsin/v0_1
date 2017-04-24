/**
 * Created by xiazhengxin on 2017/4/11.
 */

var jutil = require("../utils/jutil");
var async = require("async");
var foolishWheel = require("../model/foolishWheel");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");
var TAG = "foolishWheel.mall.refresh";

function start(postData, response, query) {
    if (jutil.postCheck(postData, "type") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var type = postData["type"];
    var shopList;
    var currentConfig;//配置
    var sTime = 0;//活动开始时间
    var eTime = 0;//活动结束时间
    var userData;
    var costType = ["goldCoin", "silverCoin", "bronzeCoin"];
    var costItem;
    var returnData;
    async.series([
        function (cb) {
            foolishWheel.getConfig(userUid, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    currentConfig = res[2];
                    sTime = res[0];
                    eTime = res[1];
                    cb();
                }
            });
        }, function (cb) {
            if (sTime <= jutil.now() && eTime >= jutil.now()) {
                cb();
            } else {
                cb("TIME ERROR");
            }
        }, function (cb) {
            if (costType.indexOf(type) == -1) {
                cb("typeError");
            } else {
                cb();
            }
        }, function (cb) {
            foolishWheel.getFoolishData(userUid, sTime, currentConfig, function (err, res) {
                userData = res;
                cb(err);
            });
        }, function (cb) {
            shopList = currentConfig["shopList"];
            userData["shopList"][type] = shopList[type];
            cb();
        }, function (cb) {
            costItem = jutil.deepCopy(currentConfig["refresh"]);
            foolishWheel.checkIfEnough(userUid, costItem, function (err, isOK) {
                if (isOK) {
                    cb(err);
                } else {
                    cb("not enough");
                }
            });
        }, function (cb) {
            modelUtil.addDropItemToDB(costItem["id"], costItem["count"] * -1, userUid, false, 1, function (err, res) {
                mongoStats.expendStats(costItem["id"], userUid, "127.0.0.1", null, mongoStats.FOOLISH3, costItem["count"]);
                returnData = res;
                cb(err);
            });
        }, function (cb) {
            foolishWheel.setFoolishData(userUid, sTime, userData, cb);
        }
    ], function (err, res) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            var resultData = {};
            resultData["userData"] = userData;
            resultData["returnData"] = returnData;
            response.echo(TAG, resultData);
        }
    });
}
exports.start = start;