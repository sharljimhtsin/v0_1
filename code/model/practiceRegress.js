/******************************************************************************
 * 回归奖励活动model层--practiceRegress
 * Create by za.
 * key:actData23
 * Create at 15-2-9.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var redis = require("../alien/db/redis");
var user = require("../model/user");
var userVariable = require("../model/userVariable");
var TAG = "regress";

//获取配置
function getConfig(userUid, cb) {
    activityConfig.getConfig(userUid, TAG, function (err, res) {
        if (err || res == null) {
            cb("CannotgetConfig");
        } else {
            if (res[0]) {
                var sTime = res[4];
                var eTime = res[5];
                var currentConfig = res[2];
                cb(null, [sTime, eTime, currentConfig]);
            } else {
                cb("notOpen");
            }
        }
    });
}

//获取领取奖励状态
function getRewardStatus(userUid, key, callbackFn) {
    userVariable.getVariable(userUid, TAG + ":rewardStatus", function (err, res) {
        var ok = true;
        if (res && res == key) {
            ok = false;
        }
        callbackFn(err, ok);
    });
}

//设置领取奖励状态
function setRewardStatus(userUid, key, callbackFn) {
    userVariable.setVariable(userUid, TAG + ":rewardStatus", key, callbackFn);
}

//设置上一次登录时间
function setLastLoginTime(userUid, time, callbackFn) {
    redis.user(userUid).z(TAG).add(time, time, callbackFn);
}

function checkLoginLogDuringTime(userUid, startTime, endTime, callbackFn) {
    redis.user(userUid).z(TAG).rangeByScore(startTime, endTime, function (err, res) {
        callbackFn(err, res.length != 0);
    });
}

function checkCondition(userUid, callbackFn) {
    var currentConfig;
    var sTime;
    var eTime;
    var beginTime;
    var endTime;
    var lv;
    var noLogin = false;
    var lvOver = false;
    var regBefore = false;
    async.series([function (cb) {
        getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                sTime = res[0];
                eTime = res[1];
                currentConfig = res[2];
                beginTime = parseInt(currentConfig["beginTime"]);
                endTime = parseInt(currentConfig["endTime"]);
                lv = parseInt(currentConfig["lv"]);
                cb();
            }
        });
    }, function (cb) {
        checkLoginLogDuringTime(userUid, beginTime, endTime, function (err, res) {
            noLogin = !res;
            cb(err);
        });
    }, function (cb) {
        user.getUserDataFiled(userUid, "lv", function (err, res) {
            lvOver = lv < parseInt(res);
            cb(err);
        });
    }, function (cb) {
        user.getUserDataFiled(userUid, "createTime", function (err, res) {
            regBefore = beginTime > parseInt(res);
            cb(err);
        });
    }], function (err, res) {
        callbackFn(err, noLogin && lvOver && regBefore);
    });
}

exports.getConfig = getConfig;//获取配置
exports.setRewardStatus = setRewardStatus;//设置领取奖励状态
exports.getRewardStatus = getRewardStatus;//获取领取奖励状态
exports.setLastLoginTime = setLastLoginTime;//设置上一次登录时间
exports.checkLoginLogDuringTime = checkLoginLogDuringTime;
exports.checkCondition = checkCondition;