/******************************************************************************
 * 每日签到
 * Create by MR.Luo.
 * Create at 14-7-8.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var userVariable = require("../model/userVariable");
var user = require("../model/user");
var configManager = require("../config/configManager");

exports = module.exports = new function(){

    var VAR_KEY = "signInKey";
    var VA_KEY_2 = "signInVIP";

    var date = new Date(jutil.now() * 1000);
    var curMonth = date.getMonth() + 1;
    var curDate = date.getDate();

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
    this.getData = function(userUid, callbackFn) {
        var gRes = {};
        async.series([
            function(cb) { // 获取数据
                userVariable.getVariableTime(userUid, VAR_KEY, function(err, res){
                    if (err) cb(err);
                    else {
                        var number = 0;
                        if (res) {
                            number = res["value"] - 0;
                        }

                        gRes["month"] = getMonth(number);
                        gRes["date"] = getDay(number);
                        gRes["signInCount"] = getSignCount(number);
                        gRes["getMask"] = getGetMask(number);

                        userVariable.getVariableTime(userUid, VA_KEY_2, function(err, res){
                            if (err) cb(err);
                            else {
                                if (res) {
                                    gRes["oldVipLv"] = res["value"] - 0;
                                }
                                cb(null);
                            }
                        });
                    }
                });
            },
            function(cb) { // 获取用户数据数据
                user.getUser(userUid, function(err, res){
                    if (err || res == null) cb("dbError");
                    else {
                        gRes["newVipLv"] = res["vip"] - 0;
                        cb(null);
                    }
                });
            },
            function(cb) { // 获取本月奖励配置
                var configMgr = configManager.createConfig(userUid);
                var signConfig = configMgr.getConfig("signIn") || {};
                gRes["monthConfig"] = signConfig[curMonth] || {};

                if (curMonth != gRes["month"]) { // 跳月
                    gRes["signInCount"] = 0; // 清除领取次数
                }

                if (curMonth != gRes["month"] || curDate != gRes["date"]) { // 上次领奖时间不是今天，设置今天领取标志为0
                    gRes["getMask"] = 0;
                }

                cb(null);
            }
        ], function(err){
            if (err) callbackFn(err);
            else {
                callbackFn(null, gRes);
            }
        });
    };

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
    this.updateData = function(userUid, month, day, signCnt, getMask, vipLv, callbackFn) {
        var number = buildNumber(month, day, signCnt, getMask);
        userVariable.setVariableTime(userUid, VAR_KEY,
            number, jutil.now(),
            function(err, res){
                if (err) callbackFn(err);
                else {
                    userVariable.setVariableTime(userUid, VA_KEY_2,
                        vipLv, jutil.now(), function(err, res){
                            if (err) callbackFn(err);
                            else callbackFn(null);
                        });
                }
            });
    };

    /**
     * 获取是否有奖励可以领取
     * @param userUid
     * @param callbackFn
     */
    this.hasRewardToGet = function(userUid, callbackFn) {
        var mThis = this;
        var signInData = null;
        var canGetNum = 0;
        async.series([
            function(cb) { // 获取数据
                mThis.getData(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        signInData = res;
                        cb(null);
                    }
                });
            },
            function(cb) {
                var monthConfig = signInData["monthConfig"];
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
                cb(null);
            }
        ], function(err){
            if (err) callbackFn(0);
            else {
                callbackFn(canGetNum);
            }
        });
    }
};