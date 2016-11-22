/******************************************************************************
 * 折扣商店模型层 practiceRebateShop
 * Create by za.
 * Create at 16-1-7 （到14号结）.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var redis = require("../alien/db/redis");
var bitUtil = require("../alien/db/bitUtil");
var user = require("../model/user");
var gsData = require("../model/gsData");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");

var ACTIVITY_CONFIG_NAME = "rebateShop";

//获取配置
function getConfig(userUid,callbackFn){
    // 1.获取活动配置数据
    activityConfig.getConfig(userUid,ACTIVITY_CONFIG_NAME,function(err,res){
        if(err || res ==null)callbackFn("CannotgetConfig");
        else{
            if(res[0]){
                var sTime = res[4];
                var eTime = res[5];
                var currentConfig = res[2];
                callbackFn(null, [sTime, eTime, currentConfig]);
            }else{
                callbackFn("notOpen");
            }
        }
    });
}
//获取用户数据
function getUserData(userUid, sTime, callbackFn) {
    var returnData = {};
    activityData.getActivityData(userUid, activityData.PRACTICE_REBATESHOP, function (err, res) {
//        console.log(res,"1");
        var aSTime = 0;
        async.series([function(cb){
            getConfig(userUid,function(err,res){
                aSTime = res[0];
                cb(null);
            });
        },function(cb){
//            console.log(aSTime == sTime,aSTime,sTime,"2");
            if(res != null && aSTime == sTime){//判断是否同一期活动
                var obj;
                if (res["arg"] == "") {
                    obj = null;
                } else {
                    try {
                        obj = JSON.parse(res["arg"]);
                    } catch (e) {
                        returnData["arg"] = null;
                    } finally {
                        returnData["arg"] = obj;
                    }
                }
                cb(null);
            }else{
                cb(null);
            }
        }],function(err,res){
//            console.log(returnData,"3");
            callbackFn(err, returnData);
        });

    });
}
//设置用户当前数据
function setUserData(userUid, data, callbackFn){
//    console.log(data,"33333");
    var mObj = {};
    mObj["data"] = 0;
    mObj["dataTime"] = 0;
    mObj["status"] = 0;
    mObj["statusTime"] = 0;
    mObj["arg"] = JSON.stringify(data);
    activityData.updateActivityData(userUid, activityData.PRACTICE_REBATESHOP, mObj, callbackFn);
}
exports.getConfig = getConfig;//获取配置
exports.getUserData = getUserData;//获取用户数据
exports.setUserData = setUserData;//设置用户数据


