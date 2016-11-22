/**
 * Created with JetBrains WebStorm.
 * 宝石迷阵model
 * User: za
 * Date: 16-2-26
 * Time: 上午10:15(预计一周)
 * To change this template use File | Settings | File Templates.
 */
var async = require("async");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var redis = require("../alien/db/redis");
var bitUtil = require("../alien/db/bitUtil");

var ACTIVITY_CONFIG_NAME = "bejeweled";
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
function getUserData(userUid, callbackFn) {
    activityData.getActivityData(userUid, activityData.BEJEWELED, function (err, res) {
        var obj;
        var returnData = {};
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
        callbackFn(err, returnData);
    });
}
//设置用户当前数据
function setUserData(userUid, data, callbackFn){
    var mObj = {};
    mObj["data"] = 0;
    mObj["dataTime"] = 0;
    mObj["status"] = 0;
    mObj["statusTime"] = 0;
    mObj["arg"] = JSON.stringify(data);
    activityData.updateActivityData(userUid, activityData.BEJEWELED, mObj, callbackFn);
}
//获取排名榜用户列表
function getRankList(userUid, callbackFn) {
    redis["domain"](userUid).z("bejTopList:").revrange(0, 9, "WITHSCORES", function (err, res) {
        if (res != null && res.length > 0){
            var rankList = [];
            for(var i = 0; i < res.length; i+=2){
                var number = res[i+1]-0;
                rankList.push({"userUid":res[i],"number":number});
            }
            callbackFn(err, rankList);
        }else
            callbackFn(err, null);
    });
}
//获取积分
function getNumber(userUid, callbackFn){
    redis["domain"](userUid).z("bejTopList:").score(userUid,function(err, res){
        var number = res-0;
        callbackFn(err, number);
    });
}
//保存积分
function add(userUid, number, callbackFn) {//"loginFromUserUid"--全服  "domain"--跨服
    redis["domain"](userUid).z("bejTopList:").add(number,userUid, callbackFn);
}
//删除排行榜
function del(userUid,callbackFn){
    redis["domain"](userUid).z("bejTopList:").del(callbackFn);
}
//检查宝石迷阵中没有重复的（上下左右的重复不能超过3个）
function checkedUnRepeat(bejeweledLine,bejeweledType){
    var lit = [];
    var a = -1;
    var c = -1;
    for(var i=0;i<bejeweledLine;i++){
        for(var j=0;j<bejeweledType;j++){
            var x = Math.floor(Math.random() * bejeweledType);
            if( lit[i-0-1]!=undefined && lit[i-0-1][j] != undefined )
            {
                a = lit[i-0-1][j];
            }
            if( lit[i]!=undefined && lit[i][j-0-1] != undefined)
            {
                c = lit[i][j-0-1];
            }
            while(x==a||x==c)
            {
                var y = Math.floor(Math.random() * bejeweledType);
                x = y;
            }
            if(lit[i]==undefined)
            {
                lit[i] = [];
            }
            lit[i][j]=x;
        }
    }
    return lit;
}

exports.getConfig = getConfig;//获取配置
exports.getUserData = getUserData;//获取用户数据
exports.setUserData = setUserData;//设置用户数据
exports.getRankList = getRankList;//获取排名榜用户列表
exports.getNumber = getNumber;//获取积分
exports.add = add;
exports.del = del;//删除排行榜
exports.checkedUnRepeat = checkedUnRepeat;