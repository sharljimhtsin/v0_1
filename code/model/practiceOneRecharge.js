/******************************************************************************
 * 单笔充值活动
 * 在活动期间每日刷新记录，每次刷新每笔只能领指定次数（配置与oneRecharge.json
 * timeLimit属性）.
 *
 * Create by MR.Luo.
 * Create at 14-6-6.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var activityData = require("../model/activityData");
var activityConfig = require("../model/activityConfig");

exports = module.exports = new function() {

    var ACTIVITY_KEY = activityData.ONE_RECHARGE;

    /**
     * 获取活动奖励数据
     * @param useUid
     * @param activityStartTime
     * @param callbackFn
     */
    this.getRewardData = function(userUid, activityStartTime, callbackFn) {
        activityData.getActivityData(userUid, ACTIVITY_KEY, function(err, res){
            if (err) {
                callbackFn(err);
            } else {
                if (res == null) {
                    callbackFn(null, null);
                } else {
                    var statusTime = parseInt(res["statusTime"]);
                    var argObj = null;

                    try {
                        argObj = JSON.parse(res["arg"]);
                    } catch (e){
                        // NOTHING TO DO
                    }

                    if (statusTime < activityStartTime) argObj = {};
                    if (!jutil.compTimeDay(jutil.now(), statusTime)) argObj = {}; // 每日刷新

                    callbackFn(null, {
                        "saveTime" : statusTime,
                        "rewards" : argObj || {}
                    });
                }
            }
        });
    };

    /**
     * 更新奖励数据
     * @param userUid
     * @param key
     * @param isCharge
     * @param timeLimit
     * @param activityStartTime
     * @param callbackFn
     */
    this.updateRewardData = function(userUid, key, isCharge, timeLimit, activityStartTime, callbackFn) {
        this.getRewardData(userUid, activityStartTime, function(err, res){
            if (err){
                callbackFn(err);
            } else {
                var rewardData = res["rewards"] || {};
                var keyRewardData = rewardData[key] || {};
                var chargedNum = keyRewardData["c"] || 0;

                if (isCharge) {
                    if ((chargedNum + 1) > timeLimit) {
                        callbackFn("TimeLimitBoundary");
                        return;
                    }
                    keyRewardData["c"] = chargedNum + 1;
                } else {
                    var rewardGetNum = keyRewardData["g"] || 0;
                    if ((rewardGetNum + 1) > Math.min(chargedNum, timeLimit)) {
                        callbackFn("TimeLimitBoundary");
                        return;
                    }
                    keyRewardData["g"] = rewardGetNum + 1;
                }

                rewardData[key] = keyRewardData;

                // 更新数据
                activityData.updateActivityData(userUid,
                    ACTIVITY_KEY,
                    {
                        "statusTime" : jutil.now(),
                        "arg" : JSON.stringify(rewardData)
                    },
                    function(err, res){
                        if (err) {
                            callbackFn(err);
                        } else {
                            callbackFn(null);
                        }
                    }
                );
            }
        });
    };

    /**
     * 添加充值记录
     * @param userUid
     * @param pay
     * @param callbackFn
     */
    this.addRecord = function(userUid, pay, callbackFn) {
        var ACTIVITY_CONFIG_NAME = "oneRecharge";

        var mThis = this;
        var currentConfig = null;
        var activityStartTime = 0;

        async.series([
            // 获取活动配置数据
            function(cb) {
                activityConfig.getConfig(userUid,ACTIVITY_CONFIG_NAME, function(err, res){
                    if (err || res == null) cb("CannotGetConfig");
                    else {
                        if (res[0]) {
                            activityStartTime = res[4];
                            var activityArg = parseInt(res[1]);
                            if (isNaN(activityArg)) activityArg = 0;
                            if (activityArg == -1) {
                                // 取数据库配置，如果配置不存在取默认配置
                                currentConfig = res[2] || res[3]["1"];
                            } else {
                                // 取指定配置，如果配置不存在取默认配置
                                currentConfig = res[3][activityArg] || res[3]["1"];
                            }
                            if (!currentConfig) {
                                cb("configError");
                            } else {
                                cb(null);
                            }
                        } else {
                            cb("notOpen");
                        }
                    }
                });
            },
            // 添加充值记录
            function(cb) {
                var configList = currentConfig["list"];
                var hasKey = false;
                var subConfig = null;
                for (var key in configList) {
                    if (configList.hasOwnProperty(key)) {
                        subConfig = configList[key];
                        if (pay == subConfig["pay"]) {
                            hasKey = true;
                            break;
                        }
                    }
                }

                if (hasKey) {
                    mThis.updateRewardData(userUid, pay,
                        true, subConfig["timeLimit"],
                        activityStartTime,
                        function(err){
                            cb(null);
                        }
                    );
                } else {
                    cb(null);
                }
            }
        ], function(err){
            callbackFn();
        });
    };

    /**
     * 玩家是否有奖励可以领取
     * @param userUid
     * @param callbackFn
     */
    this.hasRewardToGet = function(userUid, callbackFn) {
        var ACTIVITY_CONFIG_NAME = "oneRecharge";

        var currentConfig = null;
        var rewardData = null;
        var sTime = 0;
        var rewardCnt = 0;
        var mThis = this;

        async.series([
            // 获取活动配置数据
            function(cb) {
                activityConfig.getConfig(userUid,ACTIVITY_CONFIG_NAME, function(err, res){
                    if (err || res == null) cb("CannotGetConfig");
                    else {
                        if (res[0]) {
                            sTime = res[4];
                            var activityArg = parseInt(res[1]);
                            if (isNaN(activityArg)) activityArg = 0;
                            if (activityArg == -1) {
                                // 取数据库配置，如果配置不存在取默认配置
                                currentConfig = res[2] || res[3]["1"];
                            } else {
                                // 取指定配置，如果配置不存在取默认配置
                                currentConfig = res[3][activityArg] || res[3]["1"];
                            }
                            if (!currentConfig) {
                                cb("configError");
                            } else {
                                cb(null);
                            }
                        } else {
                            cb("notOpen");
                        }
                    }
                });
            },
            // 取保存的奖励数据
            function(cb) {
                mThis.getRewardData(userUid, sTime, function(err, res){
                    if (err) cb(err);
                    else {
                        rewardData = res || {};
                        cb(null);
                    }
                });
            },
            // 生成返回对象
            function(cb) {
                var configList = currentConfig["list"];
                var rewards = rewardData["rewards"];
                for (var key in configList) {
                    if (configList.hasOwnProperty(key)) {
                        var subConfig = configList[key];
                        var subConfigKey = subConfig["pay"];
                        if (rewards.hasOwnProperty(subConfigKey)) {
                            var keyRewardData = rewards[subConfigKey];
                            rewardCnt += keyRewardData["c"] - (keyRewardData["g"] || 0);
                        }
                    }
                }
                cb(null);
            }
        ], function(err){
            if (err) {
                callbackFn(false);
            } else {
                callbackFn(rewardCnt);
            }
        });
    };
};