/******************************************************************************
 * 单笔充值2
 * 领取奖励
 * Create by MR.Luo.
 * Create at 14-6-6.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var mongoStats = require("../model/mongoStats");
var user = require("../model/user");
var modelUtil = require("../model/modelUtil");
var activityConfig = require("../model/activityConfig");
var oneRecharge2 = require("../model/oneRecharge2");

exports.start = function(postData, response, query){

    if (jutil.postCheck(postData,"pay") == false) {
        response.echo("oneRecharge2.reward",jutil.errorInfo("postError"));
        return;
    }

    var ACTIVITY_CONFIG_NAME = "oneRecharge2";

    var userUid = query["userUid"];
    var pay = parseInt(postData["pay"]);

    var currentConfig = null; // 当前活动配置
    var rewardData = null; // 奖励数据
    var sTime = 0; // 活动开始时间
    var timeLimit = 0; // PAY对应的项目的充值次数上限
    var payConfig = null;
    var rtnArr = [];

    async.series([
        // 判断USER IF VALID
        function(cb) {
            user.getUser(userUid, function(err, res){
                if (err) {
                    cb(err);
                } else if (res == null) {
                    cb("dbError");
                } else {
                    cb(null);
                }
            });
        },
        // 获取活动配置数据
        function(cb) {
            activityConfig.getConfig(userUid,ACTIVITY_CONFIG_NAME, function(err, res){
                if (err || res == null) cb("CannotGetConfig");
                else {
                    if (res[0]) {
                        sTime = res[4];
                        var activityArg = parseInt(res[1]);
                        if (isNaN(activityArg)) activityArg = 1;
                        res[3] = res[3] || {};

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
            oneRecharge2.getRewardData(userUid, sTime, function(err, res){
                if (err) cb(err);
                else {
                    rewardData = res || {};
                    cb(null);
                }
            });
        },
        // 判断能否领奖
        function(cb) {
            var canGetNum = 0;
            var rewards = rewardData["rewards"];
            if (rewards.hasOwnProperty(pay)) {
                var payReward = rewards[pay];
                canGetNum = payReward["c"] - (payReward["g"] || 0);
            }

            if (canGetNum > 0) {
                cb(null);
            } else {
                cb("noRewardToGet");
            }
        },

        function(cb) {
            payConfig = __getPayConfig(currentConfig, pay);
            if (!payConfig) {
                cb("configError");
                return;
            }

            timeLimit = payConfig["timeLimit"];
            cb(null);
        },

        // 更新奖励数据
        function (cb) {
            oneRecharge2.updateRewardData(userUid, pay, false, timeLimit, sTime, function(err){
                if (err) console.error(err);
                cb(null);
            });
        },

        // 发放奖励
        function(cb) {

            var rewardConfig = payConfig["reward"];

            async.forEach(Object.keys(rewardConfig), function(i, forCb){
                var itemData = rewardConfig[i];
                __rwHandler(userUid, itemData["id"], itemData["count"], function(err, res){
                    if (res) {
                        rtnArr.push(res);
                    }
                    forCb(null);
                });
            }, function(err){
                cb(null);
            });
        }
    ], function(err){
        if (err) {
            response.echo("oneRecharge2.reward",  jutil.errorInfo(err));
        } else {
            response.echo("oneRecharge2.reward",  rtnArr);
        }
    });
};

function __getPayConfig(currentConfig, pay) {
    var configList = currentConfig["list"];
    for (var key in configList) {
        if (configList.hasOwnProperty(key)) {
            var subConfig = configList[key];
            if (pay == subConfig["pay"]) {
                return subConfig;
            }
        }
    }
    return null;
}

function __rwHandler(userUid, id, count, cb) {

    mongoStats.dropStats(id, userUid, 0, null, mongoStats.ONERECHARGE2, count);
    switch (id) {
        default:
            modelUtil.addDropItemToDB(id,count,userUid,0,1,function(err,res) {
                if (err) cb("dbError");
                else {
                    cb(null, res);
                }
            });
            break;
    }
}