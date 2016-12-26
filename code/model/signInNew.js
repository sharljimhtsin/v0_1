/******************************************************************************
 * 每日签到
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var userVariable = require("../model/userVariable");
var activityData = require("../model/activityData");
var user = require("../model/user");
var configManager = require("../config/configManager");
var VAR_KEY = "signInKey";
var VAR_KEY_2 = "signInVIP";
var VAR_KEY_3 = activityData.DAILY_SIGNIN;

/* ------------------------------------------------------------------------ */

function getMonth(number) {
    return Math.floor(number / 1000000);
}

function getDay(number) {
    return Math.floor((number % 1000000) / 10000);
}

function getSignCount(number) {
    return Math.floor((number % 10000) / 100);
}

function getGetMask(number) {
    return Math.floor((number % 100));
}

function buildNumber(month, day, signCount, getMask) {
    return getMask + signCount * 100 + day * 10000 + month * 1000000;
}

/* ------------------------------------------------------------------------ */

/**
 * 获取数据
 * @param userUid
 * @param callbackFn
 */
function getData(userUid, callbackFn) {
    var gRes = {};
    async.series([
        function (cb) { // 获取数据
            userVariable.getVariableTime(userUid, VAR_KEY, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    var number = 0;
                    if (res) {
                        number = res["value"] - 0;
                    }
                    gRes["month"] = getMonth(number);
                    gRes["date"] = getDay(number);
                    gRes["signInCount"] = getSignCount(number);
                    gRes["getMask"] = getGetMask(number);
                    userVariable.getVariableTime(userUid, VAR_KEY_2, function (err, res) {
                        if (res) {
                            gRes["oldVipLv"] = res["value"] - 0;
                        }
                        cb(err);
                    });
                }
            });
        },
        function (cb) { // 获取用户数据数据
            user.getUser(userUid, function (err, res) {
                if (err || res == null) {
                    cb("dbError");
                } else {
                    gRes["newVipLv"] = res["vip"] - 0;
                    cb();
                }
            });
        },
        function (cb) {
            var date = new Date(jutil.now() * 1000);
            var curMonth = date.getMonth() + 1;
            var curDate = date.getDate();
            var configMgr = configManager.createConfig(userUid);
            var signConfig = configMgr.getConfig("signIn") || {};
            activityData.getActivityData(userUid, VAR_KEY_3, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    if (res["arg"] == "" || curMonth != gRes["month"]) {
                        gRes["monthConfig"] = signConfig[curMonth] || {};
                    } else {
                        gRes["monthConfig"] = JSON.parse(res["arg"]);
                    }
                    cb();
                }
            });
        },
        function (cb) { // 获取本月奖励配置
            var date = new Date(jutil.now() * 1000);
            var curMonth = date.getMonth() + 1;
            var curDate = date.getDate();
            if (curMonth != gRes["month"]) { // 跳月
                gRes["signInCount"] = 0; // 清除领取次数
            }
            if (curMonth != gRes["month"] || curDate != gRes["date"]) { // 上次领奖时间不是今天，设置今天领取标志为0
                gRes["getMask"] = 0;
            }
            cb();
        }
    ], function (err) {
        callbackFn(err, gRes);
    });
}

/**
 * 更新数据
 * @param userUid
 * @param month
 * @param day
 * @param signCnt
 * @param getMask
 * @param vipLv
 * @param callbackFn
 */
function updateData(userUid, month, day, signCnt, getMask, vipLv, arg, callbackFn) {
    var number = buildNumber(month, day, signCnt, getMask);
    async.series([function (cb) {
        userVariable.setVariableTime(userUid, VAR_KEY, number, jutil.now(), cb);
    }, function (cb) {
        userVariable.setVariableTime(userUid, VAR_KEY_2, vipLv, jutil.now(), cb);
    }, function (cb) {
        activityData.updateActivityData(userUid, VAR_KEY_3, {"arg": JSON.stringify(arg)}, cb);
    }], callbackFn);
}

/**
 * 获取是否有奖励可以领取
 * @param userUid
 * @param callbackFn
 */
function hasRewardToGet(userUid, callbackFn) {
    var mThis = this;
    var signInData = null;
    var canGetNum = 0;
    async.series([
        function (cb) { // 获取数据
            mThis.getData(userUid, function (err, res) {
                signInData = res;
                cb(err);
            });
        },
        function (cb) {
            var date = new Date(jutil.now() * 1000);
            var curMonth = date.getMonth() + 1;
            var curDate = date.getDate();
            var configMgr = configManager.createConfig(userUid);
            var signConfig = configMgr.getConfig("signIn") || {};
            var monthConfig = signConfig[curMonth] || {};
            var signInCount = signInData["signInCount"];
            var getMask = signInData["getMask"]; // getMask < 2 表示今天有可能可以领取，等于2表示已经领取
            var oldVipLv = signInData["oldVipLv"];
            var newVipLv = signInData["newVipLv"];
            if (getMask == 0) {
                canGetNum = 1;
            } else if (getMask == 1) {
                var todayRwCfg = monthConfig[curDate];
                if (todayRwCfg["isDouble"] == 1) {
                    var dVipLv = todayRwCfg["doubleVip"];
                    if (oldVipLv < dVipLv && newVipLv >= dVipLv) {
                        canGetNum = 1;
                    }
                }
            }
            cb();
        }
    ], function (err) {
        callbackFn(err ? 0 : canGetNum);
    });
}

exports.getData = getData;
exports.updateData = updateData;
exports.hasRewardToGet = hasRewardToGet;