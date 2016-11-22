/******************************************************************************
 * 单笔充值活动2
 * 数据获取接口
 * Create by MR.Luo.
 * Create at 14-6-6.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var oneRecharge2 = require("../model/oneRecharge2");

exports.start = function(postData, response, query){

    var ACTIVITY_CONFIG_NAME = "oneRecharge2";

    var userUid = query["userUid"];
    var currentConfig = null;
    var rewardData = null;
    var gRes = null;
    var eTime = 0;
    var sTime = 0;

    async.series([
        // 获取活动配置数据
        function(cb) {
            activityConfig.getConfig(userUid,ACTIVITY_CONFIG_NAME, function(err, res){
                if (err || res == null) cb("CannotGetConfig");
                else {
                    sTime = res[4];
                    eTime = res[5];
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
        // 生成返回对象
        function(cb) {
            var configList = currentConfig["list"];
            gRes = {
                "list" : [],         // 数据项列表
                "canGetNum" : 0,    // 可领取次数
                "eTime" : eTime,     // 活动结束时间
                "sTime" : sTime      // 活动开始时间
            };
            var rewards = rewardData["rewards"];
            for (var key in configList) {
                if (configList.hasOwnProperty(key)) {
                    var subConfig = configList[key];
                    var subConfigKey = subConfig["pay"];
                    var subRtnItem = {
                        "config" : subConfig
                    };
                    if (rewards.hasOwnProperty(subConfigKey)) {
                        var keyRewardData = rewards[subConfigKey];
                        subRtnItem["num"] = keyRewardData["c"] - (keyRewardData["g"] || 0);
                        gRes.canGetNum += subRtnItem["num"];
                    }
                    gRes.list.push(subRtnItem);
                }
            }
            cb(null);
        }
    ], function(err){
        if (err) {
            response.echo("oneRecharge2.get",  jutil.errorInfo(err));
        } else {
            response.echo("oneRecharge2.get",  gRes);
        }
    });
};