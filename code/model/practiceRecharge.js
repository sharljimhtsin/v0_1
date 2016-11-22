/**
 * 累积充值
 * User: luoxiaobin
 * Date: 14-3-31
 * Time: 上午11:23
 * To change this template use File | Settings | File Templates.
 */

var async = require("async");
var jutil = require("../utils/jutil");
var activityData = require("../model/activityData");
var activityConfig = require("../model/activityConfig");
var stats = require("../model/stats");
var mongoStats = require("../model/mongoStats");

exports = module.exports = new function(){

    var ACTIVITY_KEY = activityData.TOTAL_RECHARGE;

    /**
     * 获取奖励数据
     * @param userUid
     * @param activityStartTime
     * @param callbackFn
     */
    this.getRewardData  = function(userUid, activityStartTime, callbackFn) {
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
                    if (statusTime < activityStartTime) status = 0;

                    callbackFn(null, {
                        "chargeTime" : dataTime, // 上次充值时间
                        "cashCharge" : data, // 累计的充值金额
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
     * @param index_or_chargeNum
     * @param isCharge
     * @param activityStartTime
     * @param callbackFn
     */
    this.updateRewardData = function(userUid, index_or_chargeNum, isCharge, activityStartTime, callbackFn) {
        this.getRewardData(userUid, activityStartTime, function(err, res){
            if (err){
                callbackFn(err);
            } else {

                if (isCharge) {
                    var cashCharge = res["cashCharge"] || 0;
                    cashCharge += index_or_chargeNum;

                    activityData.updateActivityData(userUid,
                        ACTIVITY_KEY,
                        {
                            "dataTime" : jutil.now(),
                            "data" : cashCharge
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
                    rewardsGetMask = jutil.bitSetTrue(rewardsGetMask, index_or_chargeNum);

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
    this.addRecord = function(userUid, pay, callbackFn) {
        var ACTIVITY_CONFIG_NAME = "totalRecharge";

        var mThis = this;
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
            // 添加充值记录
            function(cb) {
                mThis.updateRewardData(userUid, pay, true, activityStartTime, function(err, res){
                    cb(null);
                });
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
        var ACTIVITY_CONFIG_NAME = "totalRecharge";

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
                var cashCharge = rewardData["cashCharge"];
                var rewardsGetMask = rewardData["rewardsGetMask"];
                var configList = currentConfig["list"];
                var index = 0;
                for (var key in configList) {
                    if (configList.hasOwnProperty(key)) {
                        var subConfig = configList[key];
                        var pay = subConfig["pay"];
                        if ((pay <= cashCharge) && (jutil.bitGet(rewardsGetMask, index) == 0)) {
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
};