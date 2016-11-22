/**
 * Created with JetBrains WebStorm.
 * User: hewei
 * Date: 14-2-17
 * Time: 下午2:42
 * To change this template use File | Settings | File Templates.
 */
var variable = require("../model/userVariable");
var jutil = require("../utils/jutil");
var bitUtil = require("../alien/db/bitUtil");
var activityConfig = require("../model/activityConfig");
var async = require("async");
var practiceVipClub = require("../model/practiceVipClub");
var activityData = require("../model/activityData");
function start(postData, response, query) {
    var userUid = query["userUid"];
    var returnData = {"isFirstCharge":1, "totalCharge":0,"gemWish":0,"config":{}};
    var firstChargeKey = "isFirstCharge";

    var sTime;
    var config;
//    var dwei = {};
    async.series([
        function(cb){
            activityConfig.getConfig(userUid, "firstCharge", function(err, res){
                if (!err && res != null && res[0]) {
                    var activityArg = parseInt(res[1]);
                    if (isNaN(activityArg)) activityArg = 0;
                    if (activityArg == -1) {
                        // 取数据库配置，如果配置不存在取默认配置
                        firstChargeKey = res[2] || res[3]["1"];
                    } else {
                        // 取指定配置，如果配置不存在取默认配置
                        firstChargeKey = res[3][activityArg] || res[3]["1"];
                    }
                    firstChargeKey = firstChargeKey["key"];
                }
                cb(err, res);
            });
        },
        function(cb) {
            practiceVipClub.getConfig(userUid, function(err, res){// * vipClub活动（类似充值送vip）
                if (err || res == undefined){
                    cb(null);
                }else {
                    sTime = res[0];
                    config = res[2];
                    cb(null);
                }
            });
        },
        function(cb){
            practiceVipClub.getUserData(userUid, sTime, function(err,res){// * vipClub活动（类似充值送vip）
                if(err){
                    cb(err);
                }else{
                    returnData["isCharge"] = {};
                    for(var i in config){
                        returnData["isCharge"][i] = res[i] == undefined?config[i]:0;
                    }
                    cb(null);
                }
            });
        },
        function(cb){
            variable.getVariable(userUid, firstChargeKey, function(err, res) {
                if (!err && res != null)
                    returnData["isFirstCharge"] = 0;
                cb(err, res);
            });
        },
        function(cb){
            variable.getVariable(userUid, "totalCharge", function(err, res) {
                if (!err && res != null)
                    returnData["totalCharge"] = res;
                cb(err, res);
            });
        },
        function(cb){
            variable.getVariable(userUid, "gemWish", function(err, res) {
                if (!err && res != null)
                    returnData["gemWish"] = res;
                cb(err, res);
            });
        },
        function(cb){
            variable.getPlatformId(userUid, function(err, res) {
                if (!err && res != null && res.indexOf("thaiios") != -1)
                    returnData["totalCharge"] = Math.ceil(returnData["totalCharge"] * 10/ 3) / 100;
                cb(err, res);
            });
        }, function (cb) {//南美首充双倍
            activityData.getActivityData(userUid, activityData.PRACTICE_BAXIRecharge, function (err, res) {
                var arg;
                if (!err && res != null) {
                    var argStr = res["arg"];
                    if (argStr != "") {
                        arg = JSON.parse(argStr);
                    }
                }
                returnData["baxiRecharge"] = arg;
                cb(err, res);
            });
        }
    ], function(err, res){
        if(err){
            response.echo("charge.isFirstCharge", jutil.errorInfo(err));
        } else {
            response.echo("charge.isFirstCharge", returnData);
        }
    });
}

exports.start = start;