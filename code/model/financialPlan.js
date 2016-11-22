/******************************************************************************
 * 理財計劃
 * Create by MR.Luo.
 * Create at 14-7-23.
 *****************************************************************************/

var jutil = require("../utils/jutil");
var redis = require("../alien/db/redis");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var mysql = require("../alien/db/mysql");
var async = require("async");
var mail = require("../model/mail");
var userVariable = require("../model/userVariable");
//var cron = require("../utils/Cron");
var user = require("../model/user");

exports = module.exports = new function() {
    var CONFIG_NAME = "financialPlan";
    var ACTIVITY_TYPE = activityData.FINANCIAL_PLAN;
    var BUY_INFO_NAME = "financialBuy";

    this.configName = CONFIG_NAME;
    this.activityType = ACTIVITY_TYPE;

    /**
     * 获取当前充值记录
     * @param userUid
     * @param sTime
     * @param callbackFn
     */
    this.getChargeNum = function(userUid, sTime, callbackFn) {
        activityData.getActivityData(userUid, ACTIVITY_TYPE, function(err, res){
            if (err) callbackFn(err);
            else {
                var data = 0;
                var dataTime = 0;
                if (res) {
                    data = res["data"] - 0;
                    dataTime = res["dataTime"] - 0;
                }

                if (dataTime < sTime) {
                    data = 0;
                }

                callbackFn(null, data);
            }
        });
    };

    /**
     * 获取购买数据
     * @param userUid
     * @param sTime
     * @param callbackFn
     */
    this.getBuyInfo = function(userUid, sTime, callbackFn) {
        userVariable.getVariableTime(userUid, BUY_INFO_NAME, function(err, res){
            if (err) callbackFn(err);
            else {
                var value = 0;
                var time = 0;
                if (res) {
                    value = res["value"] - 0;
                    time = res["time"] - 0;
                }
                if (time < sTime) value = -1; // 数据过期
                callbackFn(null, value);
            }
        });
    };

    /**
     * 保存购买信息
     * @param userUid
     * @param byIdx
     * @param callbackFn
     */
    this.setBuyInfo = function(userUid, byIdx, callbackFn) {
        userVariable.setVariableTime(userUid, BUY_INFO_NAME,
            byIdx, jutil.now(),
            function(err, res){
            if (err) callbackFn(err);
            else {
                callbackFn(null);
            }
        });
    };

    /**
     * 获取奖励领取信息
     * @param userUid
     * @param sTime
     * @param callbackFn
     */
    this.getRewardInfo = function(userUid, sTime, callbackFn) {
        activityData.getActivityData(userUid, ACTIVITY_TYPE, function(err, res){
            if (err) callbackFn(err);
            else {
                var status = 0;
                var statusTime = 0;
                if (res) {
                    status = res["status"] - 0;
                    statusTime = res["statusTime"] - 0;
                }

                if (statusTime < sTime) {
                    status = 0;
                }

                callbackFn(null, {
                    "cnt" : status,
                    "time" : statusTime
                });
            }
        });
    };

    /**
     * 设置领奖信息
     * @param userUid
     * @param rgCnt
     * @param callbackFn
     */
    this.setRewardInfo = function(userUid, rgCnt, callbackFn) {
        activityData.updateActivityData(userUid, ACTIVITY_TYPE,
            {
                "status" : rgCnt,
                "statusTime" : jutil.now()
            },
            function(err, res){
                if (err) cb(err);
                else {
                    callbackFn(null);
                }
            }
        );
    };

    /**
     * 添加充值记录
     * @param userUid
     * @param chargeNum
     * @param callbackFn
     */
    this.addChargeRecord = function(userUid, chargeNum, callbackFn) {

        var financialConfig = null; // 活动配置
        var curChargeNum = 0; // 当前充值记录

        async.series([

            function(cb) { // 获取活动配置
                activityConfig.getConfig(userUid, CONFIG_NAME, function(err, res){
                    if (err || res == null) cb("dbError");
                    else {
                        financialConfig = res;
                        cb(null);
                    }
                });
            },

            function(cb) { // 判断是否要添加充值记录
                if (!financialConfig[0]) { // 活动已经结束或者关闭
                    cb("notOpen");
                } else {

                    if (!financialConfig[2]) {
                        cb("configError");
                        return;
                    }

                    var buyConfig = financialConfig[2]["1"]; // 取任意配置
                    if (!buyConfig) {
                        cb("configError");
                        return;
                    }

                    var aReward = buyConfig["reward"];
                    var daysToGet = Object.keys(aReward).length; // 领奖需要的时间

                    var midTime = financialConfig[5] - daysToGet * 60 * 60 * 24;
                    if (midTime <= financialConfig[4]) {
                        cb("configError");
                        return;
                    }

                    if (jutil.now() > midTime) { // 已经到了领奖时间
                        cb("dontAddRecord");
                        return;
                    }

                    cb(null);
                }
            },

            function(cb) { // 获取旧的记录
                activityData.getActivityData(userUid, ACTIVITY_TYPE, function(err, res){
                    if (err) cb(err);
                    else {
                        var data = 0;
                        var dataTime = 0;
                        if (res) {
                            data = res["data"] - 0;
                            dataTime = res["dataTime"] - 0;
                        }

                        var sTime = financialConfig[4];
                        if (dataTime < sTime) {
                            data = 0;
                        }

                        curChargeNum = data;
                        cb(null);
                    }
                });
            },

            function(cb) { // 更新记录
                var newChargeNum = curChargeNum + chargeNum;
                activityData.updateActivityData(userUid, ACTIVITY_TYPE,
                    {
                        "data" : newChargeNum,
                        "dataTime" : jutil.now()
                    },
                    function(err, res){
                        if (err) cb(err);
                        else {
                            cb(null);
                        }
                    }
                );
            }

        ], function(err){
            callbackFn(err);
        });
    };

    /**
     * 玩家登陆时补发没有领取的奖励
     * @param userUid
     * @param callbackFn
     */
    this.sendUnGetReward = function(userUid, callbackFn) {
        var mThis = this;
        var financialConfig = null;
        var buyIdx = null;
        var buyConfig = null;
        var rgCnt = 0;
        var maxRgCnt = 0;
        var rwList = [];
        async.series([
            function(cb) { // 获取活动配置
                activityConfig.getConfig(userUid, CONFIG_NAME, function(err, res){
                    if (err) cb(err);
                    else {
                        financialConfig = res;
                        cb(null);
                    }
                });
            },

            function(cb) { // 判断是否可以领奖
                if (financialConfig[0]) { // 活动还开着
                    cb("isOpen");
                    return;
                }

                // 获取在本次活动购买的数据
                mThis.getBuyInfo(userUid, financialConfig[4], function(err, byIdx){
                    if (err) cb(err);
                    else {
                        if (byIdx < 0) { // 玩家没有购买
                            cb("noRewardToGet")
                        } else {
                            buyIdx = byIdx;
                            cb(null);
                        }
                    }
                });
            },

            function(cb) { // 获取购买的配置
                var aConfig = financialConfig[2];

                if (!aConfig) {
                    cb("configError");
                    return;
                }

                buyConfig = aConfig[buyIdx]; // 购买的计划的配置
                if (!buyConfig) {
                    cb("configError");
                    return;
                }

                var aReward = buyConfig["reward"];
                var daysToGet = Object.keys(aReward).length; // 领奖需要的时间

                mThis.getRewardInfo(userUid, financialConfig[4], function(err, res){
                    if (err) cb(err);
                    else {
                        rgCnt = res["cnt"];
                        if (rgCnt >= daysToGet) { // 奖励已经全部领取
                            cb("alreadyGet");
                        } else {
                            cb(null);
                        }
                    }
                });
            },

            function(cb) { // 获取奖励配置
                var aReward = buyConfig["reward"];
                var daysToGet = Object.keys(aReward).length; // 领奖需要的时间

                maxRgCnt = daysToGet;

                // 把所有没有领取的奖励添加到数组
                for (;rgCnt < daysToGet; ++rgCnt) {
                    var rwItem = aReward[rgCnt + 1];
                    if (rwItem) {
                        rwList = rwList.concat(rwItem);
                    }
                }
                cb(null);
            },

            function(cb) { // 发邮件
                for(var i in rwList){
                    mail.addMail(userUid, -1, "理财计划奖励补发", JSON.stringify([rwList[i]]), "33333", function(err, res) {});
                }
                cb(null);
            },

            function(cb) { // 更新数据
                mThis.setRewardInfo(userUid, maxRgCnt, function(err, res){
                    if (err) console.error(err);
                    cb(null);
                });
            }
        ], function(err){
            callbackFn();
        });
    };
};