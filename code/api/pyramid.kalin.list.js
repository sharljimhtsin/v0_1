/**
 * Created by xiazhengxin on 2017/6/7.
 */

var jutil = require("../utils/jutil");
var async = require("async");
var pyramid = require("../model/pyramid");
var TAG = "pyramid.kalin.list";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var isIngot = true;
    var currentConfig;//配置
    var sTime = 0;//活动开始时间
    var eTime = 0;//活动结束时间
    var returnData = {};//返回用户初始化数据集合
    var userData = {};//返回用户初始化数据集合
    async.series([function (cb) {
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
            returnData["userData"] = userData;
            cb(err);
        });
    }, function (cb) {
        returnData["tower"] = currentConfig["tower"];
        returnData["payReward"] = currentConfig["payReward"];
        returnData["play"] = currentConfig["play"];
        returnData["refresh"] = currentConfig["refresh"];
        returnData["sTime"] = sTime;
        returnData["eTime"] = eTime;
        cb();
    }], function (err, res) {
        echo(err, returnData);
    });

    function echo(err, res) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, res);
        }
    }
}
exports.start = start;