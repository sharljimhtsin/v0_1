/**
 * Created by xiazhengxin on 2017/6/12.
 */

var jutil = require("../utils/jutil");
var async = require("async");
var pyramid = require("../model/pyramid");
var modelUtil = require("../model/modelUtil");
var user = require("../model/user");
var TAG = "pyramid.kalin.mall.refresh";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var isIngot = true;
    var shopList;
    var currentConfig;//配置
    var sTime = 0;//活动开始时间
    var eTime = 0;//活动结束时间
    var userData;
    var costItem;
    var ingotResult;
    var returnData;
    async.series([
        function (cb) {
            pyramid.getConfig(userUid, isIngot, function (err, res) {
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
            pyramid.getPyramidData(userUid, sTime, currentConfig, isIngot, function (err, res) {
                userData = res;
                cb(err);
            });
        }, function (cb) {
            shopList = currentConfig["shopList"];
            userData["shopList"] = shopList;
            cb();
        }, function (cb) {
            costItem = jutil.deepCopy(currentConfig["refresh"]);
            pyramid.checkIfEnough(userUid, costItem, function (err, isOK) {
                if (isOK) {
                    cb(err);
                } else {
                    cb("not enough");
                }
            });
        }, function (cb) {
            modelUtil.addDropItemToDB(costItem["id"], costItem["count"] * -1, userUid, false, 1, function (err, res) {
                returnData = res;
                cb(err);
            });
        }, function (cb) {
            pyramid.setPyramidData(userUid, sTime, userData, isIngot, cb);
        }, function (cb) {
            user.getUser(userUid, function (err, res) {
                ingotResult = res;
                cb(err);
            });
        }
    ], function (err, res) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            var resultData = {};
            resultData["userData"] = userData;
            resultData["ingotResult"] = ingotResult;
            resultData["returnData"] = returnData;
            response.echo(TAG, resultData);
        }
    });
}
exports.start = start;