/**
 * Created with JetBrains WebStorm.
 * User: hewei
 * Date: 14-6-20
 * Time: 下午4:45
 * To change this template use File | Settings | File Templates.
 */

var activityConfig = require("../model/activityConfig");
var mail = require("../model/mail");
var async = require("async");
var userVariable = require("../model/userVariable");

/**
 * 添加充值记录
 * @param userUid
 * @param ingot 充值获得的伊美加币
 * @param callbackFn
 */
function addRecord(userUid, ingot, callbackFn) {
    var ACTIVITY_CONFIG_NAME = "oneRecharge3";

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
            var rewardData = null;
            var configList = currentConfig["list"];
            for (var i = 0; i < configList.length; i ++) {
                var configObj = configList[i];
                if (ingot >= configObj["payMin"] && ingot <= configObj["payMax"]) {
                    rewardData = configObj["reward"];
                    break;
                }
            }
            if (rewardData != null) {//邮件发奖励
                var reward = [];
                for (var j = 0; j < rewardData.length; j ++) {
                    var rewardObj = rewardData[j];
                    if (rewardObj["rewardType"] == "imegga")
                        reward.push({"id":"ingot", "count":Math.ceil(ingot * rewardObj["ratio"])});
                    else if (rewardObj["rewardType"] == "zeni")
                        reward.push({"id":"gold", "count":Math.ceil(ingot * rewardObj["ratio"])});
                }
                var msg = currentConfig["msg"+language] == undefined?currentConfig["msg"]:currentConfig["msg"+language];
                //三国多语言
                if (typeof currentConfig["msg"] == "object") {
                    msg = currentConfig["msg"].hasOwnProperty(language) ? currentConfig["msg"][language] : "none";
                }
                mail.addMail(userUid, -1, msg, JSON.stringify(reward), 564892, function(err, res) {
                    if (err)
                        cb(err);
                    else
                        cb(null);
                });
            } else {
                cb(null);
            }
        }
    ], function(err){
        callbackFn();
    });
}

exports.addRecord = addRecord;