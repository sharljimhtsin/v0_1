/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-3-10
 * Time: 下午7:11
 * To change this template use File | Settings | File Templates.
 */
var jutil = require("../utils/jutil");
var budokai = require("../model/budokai");
var bloodyLeaderboard = require("../model/bloodyLeaderboard");
var async = require("async");
var battleModel = require("../model/battle");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var user = require("../model/user");
var item = require("../model/item");
function upDataDb(userData,battleInfo,callBack){
    var dbInfo;
    var userUid = userData["userUid"];
    var configData = configManager.createConfig(userUid);
    var userLevel = userData["lv"] - 0;
    var upDateData = {};
    var returnData = {};
    async.series([
        function(cb){
            budokai.getBloodyBattleInfo(userUid,function(err,res){
                if(err || res == null){
                    cb("noThisUser",null);
                }else{
                    dbInfo = res;
                    cb(null,null);
                }
            })
        },
        function(cb){
            if(dbInfo["todayMostStar"] < battleInfo["currentTotleStar"]){
                upDateData["todayMostStar"] = battleInfo["currentTotleStar"];
            }
            if(dbInfo["todayMostPoints"] < battleInfo["numberOfPoints"] - 1){
                upDateData["todayMostPoints"] = battleInfo["numberOfPoints"] - 1;
            }
            if(dbInfo["bigestJumpPoints"] < battleInfo["bigestJumpPoints"]){
                upDateData["bigestJumpPoints"] = battleInfo["bigestJumpPoints"];
            }
            upDateData["challengingTimes"] = dbInfo["challengingTimes"] - 1;
            upDateData["todayLastFightTime"] = battleInfo["todayLastTime"];
            budokai.upDateBattleInfo(userUid,upDateData,function(err,res){
                if(err || res == null){
                    cb("noThisUser",null);
                }else{
                    returnData = upDateData;
                    returnData["todayMostStar"] = returnData["todayMostStar"] == null ? dbInfo["todayMostStar"] : returnData["todayMostStar"];
                    returnData["todayMostPoints"] = returnData["todayMostPoints"] == null ? dbInfo["todayMostPoints"] : returnData["todayMostPoints"];
                    cb(null,res);
                }
            })
        },
        function(cb){ //写入排行榜
            var topKey = budokai.getTeamType(configData, userLevel);
            if(topKey == ""){
                cb("levelIsNotEnough",null);
                return;
            }
            var day = jutil.day();
            if(jutil.compTimeDay(jutil.now(),battleInfo["todayLastTime"] == false)){
                day = day - 1;
            }
            bloodyLeaderboard.addPlayerInBoard(day,userUid,topKey,function(err,res){
                if(err){
                    cb(err,null);
                }else{
                    cb(null,null);
                }
            });
        }
    ],function(err,res){
        if(err){
            callBack(err,null);
        }else{
            callBack(null,returnData);
        }
    });
}
exports.upDataDb = upDataDb;

function c(fn) {
    function inner(len, arg) {
        if (len <= 0) {
            return fn.apply(null, arg);
        }
        return function() {
            return inner(len - arguments.length, arg.concat(Array.apply([], arguments)));
        }
    }
    return inner(fn.length, []);
}

function fn(a, b, c, d) {
    return a + b + c + d;
}