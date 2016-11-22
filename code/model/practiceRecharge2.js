/**
 * 累积充值2
 * User: joseppe
 * Date: 14-9-24
 * Time: 下午17:57
 * To change this template use File | Settings | File Templates.
 */

var async = require("async");
var jutil = require("../utils/jutil");
var activityData = require("../model/activityData");
var activityConfig = require("../model/activityConfig");
var mail = require("../model/mail");
var userVariable = require("../model/userVariable");
var stats = require("../model/stats");
var mongoStats = require("../model/mongoStats");


exports.addRecord = function(userUid, pay, callbackFn){
    var ACTIVITY_KEY = activityData.TOTAL_RECHARGE2;
    var ACTIVITY_CONFIG_NAME = "totalRecharge2";

    var currentConfig = null;
    var activityStartTime = 0;
    var adata = {};
    var reward = [];
    var language = "";
    var times = 0;
    var cpay = 0;
    var rewardpay = 0;
    async.series([
        // 获取活动配置数据
        function(cb) {
            activityConfig.getConfig(userUid, ACTIVITY_CONFIG_NAME, function(err, res){
                if (err || res == null) cb("CannotGetConfig");
                else {
                    if (res[0]) {
                        activityStartTime = res[4];
                        var activityArg = parseInt(res[1]);
                        if (isNaN(activityArg)) activityArg = "0";
                        if (activityArg == -1) {
                            // 取数据库配置，如果配置不存在取默认配置
                            currentConfig = res[2] || res[3]["1"];
                        } else {
                            // 取指定配置，如果配置不存在取默认配置
                            currentConfig = res[3][activityArg] || res[3]["0"];
                        }
                        if (!currentConfig) {
                            cb("configError");
                        } else {
                            cb(null);
                        }
                    } else {
                        var activityArg = parseInt(res[1]);
                        if (isNaN(activityArg)) activityArg = "0";
                        currentConfig = res[3][activityArg] || res[3]["0"];
                        cb("notOpen");
                    }
                }
            });
        },
        function(cb) {
            activityData.getActivityData(userUid, ACTIVITY_KEY, function(err, res){
                if (err) {
                    cb(err);
                } else {
                    if(res == null){
                        res = {
                            "dataTime" : 0,
                            "data" : 0,
                            "status" : 0,
                            "statusTime" : 0
                        };
                    }
                    var dataTime = parseInt(res["dataTime"]);
                    var data = parseInt(res["data"]);
                    var status = parseInt(res["status"]);
                    var statusTime = parseInt(res["statusTime"]);

                    if (dataTime < activityStartTime) data = 0;
                    if (statusTime < activityStartTime) status = 0;

                    adata = {
                        "dataTime" : dataTime, // 上次充值时间
                        "data" : data, // 累计的充值金额
                        "statusTime": statusTime, // 上次领取奖励的时间
                        "status" : status // 已领取金额
                    };
                    cb(null);
                }
            });
        },
        // 计算奖励数据
        function(cb) {

            cpay = pay + adata["data"] - adata["status"];//可以领取奖励的金额
            rewardpay = currentConfig["rewardpay"];
            console.log(cpay,rewardpay,"????");
            if(cpay >= rewardpay){
                stats.dropStats("ingot",userUid,"127.0.0.1",null,mongoStats.practiceRecharge2_count2,pay);
                times = Math.floor(cpay/currentConfig["rewardpay"]);
                console.log(times,cpay,currentConfig["rewardpay"],pay,adata["data"],adata["status"],"///");
                for(var i in currentConfig["reward"]){
                    reward[i] = {};
                    reward[i]["id"] = currentConfig["reward"][i]["id"];
                    reward[i]["count"] = currentConfig["reward"][i]["count"] * times;
                    stats.dropStats(reward[i]["id"],userUid,"127.0.0.1",null,mongoStats.practiceRecharge2_count,reward[i]["count"]);
                }
                adata["status"] += currentConfig["rewardpay"] * times; //已领取金额
                adata["dataTime"] = jutil.now();
                adata["data"] += pay;
                adata["statusTime"] = jutil.now();
                cb(null);
            }else{
//                adata["status"] += cpay;//已领取金额
                adata["dataTime"] = jutil.now();
                adata["data"] += pay;
                adata["statusTime"] = jutil.now();
                cb(null);
            }
        },
        //保存数据
        function(cb){
            activityData.updateActivityData(userUid, ACTIVITY_KEY, adata, cb);
        },
        //获取用户语言
        function(cb) {
            userVariable.getLanguage(userUid,function(err, res){
                if(!err && res)
                    language = res;
                cb(null);
            });
        },
        //发放奖励
        function(cb){
            if(cpay >= rewardpay){
                var msg = currentConfig["message"+language] == undefined?currentConfig["message"]:currentConfig["message"+language];
                //三国多语言
                if (typeof currentConfig["message"] == "object") {
                    msg = currentConfig["message"].hasOwnProperty(language) ? currentConfig["message"][language] : "none";
                }
                mail.addMail(userUid, -1, msg, JSON.stringify(reward), currentConfig["rewardId"], function(err, res) {
                    cb(null);
                });
            }else{
                cb(null);
            }
        }
    ], function(err){
        callbackFn();
    });
};