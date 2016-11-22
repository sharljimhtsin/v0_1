/**
 * Created with JetBrains WebStorm.
 * User: hewei
 * Date: 14-6-23
 * Time: 上午10:32
 * To change this template use File | Settings | File Templates.
 */
var activityConfig = require("../model/activityConfig");
var mail = require("../model/mail");
var activityData = require("../model/activityData");
var jutil = require("../utils/jutil");
var async = require("async");
var userVariable = require("../model/userVariable");
var stats = require("../model/stats");
var mongoStats = require("../model/mongoStats");
/**
 * 添加充值记录
 * @param userUid
 * @param ingot 充值获得的伊美加币
 * @param callbackFn
 */
function addRecord(userUid, ingot, callbackFn) {
    var ACTIVITY_CONFIG_NAME = "oneRecharge4";
    var ACTIVITY_KEY = activityData.ONE_RECHARGE4;

    var currentConfig = null;
    var language = "";

    async.series([
        // 获取活动配置数据
        function(cb) {
            activityConfig.getConfig(userUid,ACTIVITY_CONFIG_NAME, function(err, res){
                if (err || res == null) cb("CannotGetConfig");
                else {
                    if (res[0]) {
                        var activityArg = parseInt(res[1]);
                        if (isNaN(activityArg)) activityArg = 0;
                        if (activityArg == -1) {// 取数据库配置，如果配置不存在取默认配置
                            currentConfig = res[2] || res[3]["1"];
                        } else {// 取指定配置，如果配置不存在取默认配置
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

        //获取活动数据 判断是否是当天首冲
        function(cb) {
            stats.events(userUid, "127.0.0.1", null, mongoStats.DAILYCHARGE);
            stats.dropStats("ingot",userUid,"127.0.0.1",null,mongoStats.DAILYCHARGE_count,ingot);
            activityData.getActivityData(userUid, ACTIVITY_KEY, function(err, res){
                if (err) {
                    cb(err);
                } else {
                    if (res == null) {
                        cb("error");
                    } else {
                        var dataTime = parseInt(res["dataTime"]);//获取上次单日首冲时间
                        if (!jutil.compTimeDay(jutil.now(), dataTime)) {//单日首冲
                            cb(null);
                        } else {
                            cb("notFirstCharge");
                        }
                    }
                }
            });
        },
        //获取用户语言
        function(cb) {
            userVariable.getLanguage(userUid,function(err, res){
                if(!err && res)
                    language = res;
                cb(null);
            });
        },
        // 活动期间内给玩家额外奖励
        function(cb) {
            var ratio = currentConfig["ratio"];
            var reward = [{"id":"ingot", "count":Math.ceil(ingot * ratio)}];
            var msg = currentConfig["msg"+language] == undefined?currentConfig["msg"]:currentConfig["msg"+language];
            //三国多语言
            if (typeof currentConfig["msg"] == "object") {
                msg = currentConfig["msg"].hasOwnProperty(language) ? currentConfig["msg"][language] : "none";
            }
            mail.addMail(userUid, -1, msg, JSON.stringify(reward), 99999, function(err, res) {
                if (err)
                    cb(err);
                else
                    cb(null);
            });
        },

        //更新活动数据
        function(cb) {
            activityData.updateActivityData(userUid,
                ACTIVITY_KEY,
                {
                    "dataTime" : jutil.now()
                },
                function(err, res){
                    if (err) {
                        cb(err);
                    } else {
                        cb(null);
                    }
                }
            );
        }
    ], function(err){
        callbackFn();
    });
}

exports.addRecord = addRecord;