/**
* 积分商城
* 1.判断活动是否开启
* 2.活动期间内消耗的伊美加币存入activityData表中
* 3.（消耗的伊美加币转换为积分）将积分存入activityData表
* User: za
* Date: 14-12-10
* Time: 下午 21:00
*/
var redis = require("../alien/db/redis");
var mysql = require("../alien/db/mysql");
var jutil = require("../utils/jutil");
var user = require("../model/user");
var userVariable = require("../model/userVariable");
var async = require("async");
var activityData = require("../model/activityData");
var activityConfig = require("../model/activityConfig");
var mail = require("../model/mail");
var stats = require("../model/stats");
var mongoStats = require("../model/mongoStats");

/**
* 获取玩家积分商城信息
* @param userUid
* @param callback
*/

var ACTIVITY_CONFIG_NAME = "scoreMall";
var ACTIVITY_CONFIG_TYPE = activityData.PRACTICE_SCOREMALL;
//获取数据（伊美加币消耗）
function getData(userUid, callbackFn, noOpen) {
    getConfig(userUid, function (err, res) {
        if (err) {
            callbackFn(err);
        } else {
            var activityStartTime = res[0];
            var activityEndTime = res[1];
            var currentConfig = res[2];
            var lang;
            async.series([function (cb) {
                userVariable.getLanguage(userUid, function (err, res) {
                    lang = res;
                    cb(err);
                });
            }, function (cb) {
                if (typeof currentConfig["msg"] == "object") {
                    var msg = currentConfig["msg"].hasOwnProperty(lang) ? currentConfig["msg"][lang] : "none";
                    var copy = jutil.deepCopy(currentConfig);
                    copy["msg"] = msg;
                    currentConfig = copy;
                }
                cb();
            }], function (err, res) {
                activityData.getActivityData(userUid, ACTIVITY_CONFIG_TYPE, function (err, res) {
                    var data = {"ingot": 0, "stime": activityStartTime, "point": 0, "etime": activityEndTime};
                    if (err) callbackFn(err);
                    else {
                        var rewards = currentConfig["reward"];
                        if (res != null && res["data"] - 0 != 0) {
                            data["ingot"] = res["data"] - 0;
                            data["stime"] = res["dataTime"];
                            data["point"] = res["status"] - 0;
                            data["etime"] = res["statusTime"];
                            rewards = JSON.parse(res["arg"]);
                        }
                        data["reward"] = [];
                        for (var i = 0; i < rewards.length; i++) {
                            var reward = {"id": rewards[i]["id"]};
                            if (rewards["count"] == undefined) {
                                reward["count"] = Math.ceil((data["ingot"] - 0) * (rewards[i]["percent"] - 0));
                            } else {
                                reward["count"] = rewards[i]["count"];
                            }
                            data["reward"].push(reward);
                        }
                        callbackFn(null, [activityStartTime, activityEndTime, currentConfig, data]);
                    }
                });
            });
        }
    }, noOpen);
}
//设定用户积分
function setPoint(userUid, point, callbackFn){
    var newData = {"status":point};
    activityData.updateActivityData(userUid,ACTIVITY_CONFIG_TYPE,
        newData,
        function(err, res){
            if (err) {
                callbackFn(err);
            } else {
                callbackFn(null);
            }
        }
    );
}
//设定用户过期
function setDataout(userUid, callbackFn){
    var newData = {"data":0};
    activityData.updateActivityData(userUid,ACTIVITY_CONFIG_TYPE,
        newData,
        function(err, res){
            if (err) {
                callbackFn(err);
            } else {
                callbackFn(null);
            }
        }
    );
}
//设置玩家消耗伊美加币得到多少积分
function setIngot(userUid, pay, callbackFn){
    stats.expendStats("ingot",userUid,"127.0.0.1",null,mongoStats.scoreMall_count,pay);
    getData(userUid, function(err, res){
        if (err){
            callbackFn(err);
            return ;
        }
        //var activityStartTime = res[0];
        var currentConfig = res[2];
        var data = res[3];
        var newData = {};
        newData["data"] = data["ingot"] + pay;
        newData["dataTime"] = data["stime"];
        newData["status"] = Math.floor(data["point"] + pay * currentConfig["point"]);
        newData["statusTime"] = data["etime"];
        newData["arg"] = JSON.stringify(currentConfig["reward"]);
        activityData.updateActivityData(userUid,
            ACTIVITY_CONFIG_TYPE,
            newData,
            function(err, res){
                if (err) {
                    callbackFn(err);
                } else {
                    callbackFn(null);
                }
            }
        );
    });
}
//获取配置文件
function getConfig(userUid, callbackFn, noOpen){
    var currentConfig;
    if(noOpen == undefined)noOpen = false;
    activityConfig.getConfig(userUid, ACTIVITY_CONFIG_NAME, function(err, res){
        if (err || res == null) callbackFn("CannotGetConfig");
        else {
            if (res[0] || (noOpen && res[1] == "-1")) {
                var activityStartTime = res[4];
                var activityEndTime = res[5];
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
                    callbackFn("configError");
                } else {
                    callbackFn(null, [activityStartTime, activityEndTime, currentConfig]);
                }
            } else {
                callbackFn("notOpen");
            }
        }
    });
}
//获取登录时奖励邮件
function login(userUid){
    getData(userUid, function(err, res){
        if(err){
            return ;
        }
        var activityStartTime = res[0];
        var activityEndTime = res[1];
        var currentConfig = res[2];
        var data = res[3];
        if((activityStartTime != data["stime"] || activityEndTime <= jutil.now()) && data["ingot"] -0 > 0){
	        //判断活动是否关闭，如果活动已过期，并且没有消耗伊美加币的情况
            setDataout(userUid, function(err, res){
                if(!err){//发放奖励
                    mail.addMail(userUid, -1, currentConfig["msg"], JSON.stringify(data["reward"]), "150901", function(err, res) {});
                }
            })
        }
    }, true);
}
exports.getData = getData;//获取数据
exports.setIngot = setIngot;//设定伊美加币
exports.setPoint = setPoint;//设定积分
exports.login = login;
exports.setDataout = setDataout;