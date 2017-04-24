/**
 * Created by xiazhengxin on 2017/4/12.
 */

var jutil = require("../utils/jutil");
var async = require("async");
var foolishWheel = require("../model/foolishWheel");
var TAG = "foolishWheel.index";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var currentConfig;//配置
    var sTime = 0;//活动开始时间
    var eTime = 0;//活动结束时间
    var returnData = {};//返回用户初始化数据集合
    var userData = {};//返回用户初始化数据集合
    async.series([function (cb) {
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
        foolishWheel.getFoolishData(userUid, sTime, currentConfig, function (err, res) {
            userData = res;
            returnData["userData"] = userData;
            cb(err);
        });
    }, function (cb) {
        returnData["reward"] = currentConfig["rand"];
        returnData["loginReward"] = currentConfig["loginReward"];
        returnData["payReward"] = currentConfig["payReward"];
        returnData["play"] = currentConfig["play"];
        returnData["refresh"] = currentConfig["refresh"];
        returnData["sTime"] = sTime;
        returnData["eTime"] = eTime;
        if (jutil.compTimeDay(userData["gotDate"], jutil.now())) {
            returnData["got"] = 1;
        } else {
            returnData["got"] = 0;
        }
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