/******************************************************************************
 * 每日累计消费
 * Create by MR.Luo.
 * Create at 14-6-9.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var activityData = require("../model/activityData");
var activityConfig = require("../model/activityConfig");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");

var ACTIVITY_KEY = activityData.DAILY_CUMULATIVE_CONSUME;

    /**
     * 获取奖励数据
     * @param userUid
     * @param activityStartTime
     * @param callbackFn
     */
    function getRewardData(userUid, activityStartTime, callbackFn) {
        activityData.getActivityData(userUid, ACTIVITY_KEY, function(err, res){
            if (err) {
                callbackFn(err);
            } else {
                if (res == null) {
                    callbackFn(null, null);
                } else {
                    var dataTime = parseInt(res["dataTime"]);
                    var data = parseInt(res["data"]);
                    var status = parseInt(res["status"]);
                    var statusTime = parseInt(res["statusTime"]);

                    if (dataTime < activityStartTime) data = 0;
                    if (!jutil.compTimeDay(jutil.now(), dataTime)) data = 0;

                    if (statusTime < activityStartTime) status = 0;
                    if (!jutil.compTimeDay(jutil.now(), statusTime)) status = 0;

                    callbackFn(null, {
                        "consumeTime" : dataTime, // 上次消费时间
                        "cashConsume" : data, // 累计的消费金额
                        "rewardGetTime": statusTime, // 上次领取奖励的时间
                        "rewardsGetMask" : status // 建立领取标志字
                    });
                }
            }
        });
    };

    /**
     * 更新奖励数据
     * @param userUid
     * @param index_or_consumeNum
     * @param isConsume
     * @param activityStartTime
     * @param callbackFn
     */
    function updateRewardData(userUid, index_or_consumeNum, isConsume, activityStartTime, callbackFn) {
        getRewardData(userUid, activityStartTime, function (err, res) {
            if (err){
                callbackFn(err);
            } else {

                if (isConsume) {
                    var cashConsume = res["cashConsume"] || 0;
                    cashConsume += index_or_consumeNum;

                    activityData.updateActivityData(userUid,
                        ACTIVITY_KEY,
                        {
                            "dataTime" : jutil.now(),
                            "data" : cashConsume
                        },
                        function(err, res){
                            if (err) {
                                callbackFn(err);
                            } else {
                                callbackFn(null);
                            }
                        }
                    );
                } else {
                    var rewardsGetMask = res["rewardsGetMask"] || 0;
                    rewardsGetMask = jutil.bitSetTrue(rewardsGetMask, index_or_consumeNum);

                    activityData.updateActivityData(userUid,
                        ACTIVITY_KEY,
                        {
                            "statusTime" : jutil.now(),
                            "status" : rewardsGetMask
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
            }
        });
    };

    /**
     * 添加充值记录
     * @param userUid
     * @param pay
     * @param callbackFn
     */
    function addRecord(userUid, pay, callbackFn) {
        var ACTIVITY_CONFIG_NAME = "dailyTotalConsume";
        var currentConfig = null;
        var activityStartTime = 0;

        async.series([
            // 获取活动配置数据
            function(cb) {
                activityConfig.getConfig(userUid, ACTIVITY_CONFIG_NAME, function(err, res){
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
            // 添加消费记录
            function(cb) {
                updateRewardData(userUid, pay, true, activityStartTime, function (err, res) {
                    cb(null);
                });
                stats.expendStats("ingot", userUid, "127.0.0.1", null, mongoStats.DAILYTOTALCONSUME_count, pay);
            }
        ], function(err){
            callbackFn();
        });
    };

    /**
     * 是否有奖励可以领取
     * @param userUid
     * @param callbackFn
     */
    function hasRewardToGet(userUid, callbackFn) {
        var ACTIVITY_CONFIG_NAME = "dailyTotalConsume";

        var currentConfig = null;
        var rewardData = null;
        var sTime = 0;
        var rewardCnt = 0;

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
                getRewardData(userUid, sTime, function (err, res) {
                    if (err) cb(err);
                    else {
                        rewardData = res || {};
                        cb(null);
                    }
                });
            },
            // 生成返回对象
            function(cb) {
                var cashConsume = rewardData["cashConsume"];
                var rewardsGetMask = rewardData["rewardsGetMask"];
                var configList = currentConfig["list"];
                var index = 0;
                for (var key in configList) {
                    if (configList.hasOwnProperty(key)) {
                        var subConfig = configList[key];
                        var pay = subConfig["pay"];
                        if ((pay <= cashConsume) && (jutil.bitGet(rewardsGetMask, index) == 0)) {
                            rewardCnt++;
                        }
                        ++index;
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

exports.getRewardData = getRewardData;
exports.updateRewardData = updateRewardData;
exports.addRecord = addRecord;
exports.hasRewardToGet = hasRewardToGet;