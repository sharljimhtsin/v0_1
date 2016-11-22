/******************************************************************************
 * 累积充值
 * 奖励领取接口
 * Create by MR.Luo.
 * Create at 14-6-10.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var mongoStats = require("../model/mongoStats");
var user = require("../model/user");
var modelUtil = require("../model/modelUtil");
var activityConfig = require("../model/activityConfig");
var practiceRecharge = require("../model/practiceRecharge");
var stats = require("../model/stats");

exports.start = function(postData, response, query){

    if (jutil.postCheck(postData,"pay") == false) {
        response.echo("totalRecharge.reward",jutil.errorInfo("postError"));
        return;
    }

    var ACTIVITY_CONFIG_NAME = "totalRecharge";

    var userUid = query["userUid"];
    var pay = parseInt(postData["pay"]);

    var currentConfig = null; // 当前活动配置
    var rewardData = null; // 奖励数据
    var sTime = 0; // 活动开始时间
    var payIndex = 0;
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
            practiceRecharge.getRewardData(userUid, sTime, function(err, res){
                if (err) cb(err);
                else {
                    rewardData = res || {};
                    cb(null);
                }
            });
        },
        // 判断能否领奖
        function(cb) {
            var cashCharge = rewardData["cashCharge"];
            var rewardsGetMask = rewardData["rewardsGetMask"];

            if (cashCharge < pay) {
                cb("noRewardToGet");
            } else {
                payIndex = __getPayIndex(currentConfig, pay);
                if (payIndex < 0) {
                    cb("configError");
                    return;
                }
                if (jutil.bitGet(rewardsGetMask, payIndex) === 0) {
                    cb(null);
                } else {
                    cb("noRewardToGet");
                }
            }
        },

        // 更新奖励数据(把这个操作放在发奖前面是为了防止刷数据)
        function (cb) {
            practiceRecharge.updateRewardData(userUid, payIndex, false, sTime, function(err){
                if (err) console.error(err);
                cb(err);
            });
        },

        // 发放奖励
        function(cb) {
            var payConfig = __getPayConfig(currentConfig, pay);
            if (!payConfig) {
                cb("configError");
                return;
            }
            //TODO: 根据 pay 分支
            activityConfig.getConfig(userUid, "totalRecharge", function (err, res) {
                if (err || res[0] != true) {
                    return;
                }
                stats.recordWithLevel(pay, res[2]["list"], true, "pay", "", [mongoStats.practiceRecharge1, mongoStats.practiceRecharge2, mongoStats.practiceRecharge3, mongoStats.practiceRecharge4, mongoStats.practiceRecharge5, mongoStats.practiceRecharge6, mongoStats.practiceRecharge7, mongoStats.practiceRecharge8, mongoStats.practiceRecharge9, mongoStats.practiceRecharge10], function (tag) {
                    stats.events(userUid, "127.0.0.1", null, tag);
                });
            });
            stats.dropStats("ingot",userUid,"127.0.0.1",null,mongoStats.practiceRecharge_count,pay);
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
            response.echo("totalRecharge.reward",  jutil.errorInfo(err));
        } else {
            response.echo("totalRecharge.reward",  rtnArr);
        }
    });
};

function __getPayIndex(currentConfig, pay) {
    var index = -1;
    var configList = currentConfig["list"];
    for (var key in configList) {
        if (configList.hasOwnProperty(key)) {
            var subConfig = configList[key];
            if (pay == subConfig["pay"]) {
                break;
            }
            ++index;
        }
    }
    return (index + 1);
}

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

    mongoStats.dropStats(id, userUid, 0, null, mongoStats.PRACTICE_RECHARGE, count);
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