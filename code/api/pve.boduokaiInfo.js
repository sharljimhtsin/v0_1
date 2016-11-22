/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 13-11-19
 * Time: 下午12:26
 * 血战信息
 * To change this template use File | Settings | File Templates.
 */
var budokai = require("../model/budokai");
var jutil = require("../utils/jutil");
var async = require("async");
//var bloodReward = require("../model/bloodReward");
function start(postData, response, query){
    if (jutil.postCheck(postData,"type") == false) {
        response.echo("pve.boduokaiInfo",jutil.errorInfo("postError"));
        return;
    }
    var type = postData["type"];
    var returnData = {};
    var userUid = query["userUid"];
    //bloodReward.addSever(userUid);
    var dbBloodBattleInfo = {};
    var redisInfo = {};
    var addInfo;
    var yesterdayIsFight = false;   //昨天没有打
    var yesterdayInTop = false; //昨天没有入榜
    var upDataDb = {};
    var needUpDataDb = false;
    async.series([
        function(callBack){//判断昨天是否入榜
            budokai.judgeUserInTop(userUid,type,function(err,res){
                if(err) callBack(err,null);
                else{
                    yesterdayInTop = res;
                    callBack(null,null);
                }
            })
        },
        function(callBack){///获取数据库中血战信息
            budokai.getBloodyBattleInfo(userUid,function(err,res){
                if(err || res == null){
                    callBack("bloodBattleWrong",null);
                }else{
                    dbBloodBattleInfo = res;
                    var now = jutil.now();
                    if(jutil.compTimeDay(now,dbBloodBattleInfo["todayLastFightTime"]) == false && dbBloodBattleInfo["todayLastFightTime"] != dbBloodBattleInfo["lastFightTime"]){  //最后一次战斗不是在今天，拷贝最后一次战斗时间到数据库
                        needUpDataDb = true;
                        upDataDb["lastFightTime"] = dbBloodBattleInfo["todayLastFightTime"];
                        upDataDb["lastTimeMostStar"] = dbBloodBattleInfo["todayMostStar"];
                        upDataDb["challengingTimes"] = 3;
                        upDataDb["todayMostStar"] = 0;
                        upDataDb["todayMostPoints"] = 0;
                    }else if(dbBloodBattleInfo["todayLastFightTime"] == 0){ //新玩家
                        upDataDb["challengingTimes"] = 3;
                    }
                    var yesterdayTime = (now - 86400);
                    var trueLastFightTime = upDataDb["lastFightTime"] != null ? upDataDb["lastFightTime"] : dbBloodBattleInfo["lastFightTime"];
                    var judgeFightYesterday = jutil.compTimeDay(yesterdayTime,trueLastFightTime);
                    if(judgeFightYesterday == false)  //上一次战斗部是在昨天
                    {
                        needUpDataDb = true;
                        addInfo = 0.15; //默认百分之15加成
                        upDataDb["lastTimeMostStar"] = 0;
                        yesterdayIsFight = false;
                    }else if(yesterdayInTop == true){   //昨天入榜了
                        addInfo = 0; //百分之0加成
                        yesterdayIsFight = true;
                    }else{  //上一次战斗在昨天
                        var star = upDataDb["lastTimeMostStar"] != null ? upDataDb["lastTimeMostStar"] : dbBloodBattleInfo["lastTimeMostStar"];
                        addInfo = Math.ceil((star / 4)) / 100;
                        addInfo = Math.round(addInfo*100)/100;
                        yesterdayIsFight = true;
                    }
                    callBack(null,null);
                }
            });
        },
        function(callBack){ //从缓存中获取battle信息
            budokai.getRedisBattleInfo(userUid,function(err,res){
               if(err){
                   callBack(err,null);
               }else{
                   var now = jutil.now();
                   if(jutil.compTimeDay(now,res["todayLastTime"]) == false){ //不在同一天,今天没有打
                       redisInfo =budokai.getDefaultBattleRedis();
                       redisInfo["todayStart"] = 0;
                       redisInfo["todayPoints"] = 0;
                   }else{
                       redisInfo = res;
                       redisInfo["todayStart"] = dbBloodBattleInfo["todayMostStar"];
                       redisInfo["todayPoints"] = dbBloodBattleInfo["todayMostPoints"];
                   }
                   redisInfo["lastTimeMostStar"] = upDataDb["lastTimeMostStar"] ? upDataDb["lastTimeMostStar"]:dbBloodBattleInfo["lastTimeMostStar"];
                   redisInfo["bigestJumpPoints"] = dbBloodBattleInfo["bigestJumpPoints"];
                   redisInfo["challengingTimes"] = upDataDb["challengingTimes"] ? upDataDb["challengingTimes"]:dbBloodBattleInfo["challengingTimes"];
                   redisInfo["freeAdd"] = addInfo;
                   callBack(null,null);
               }
            });
        },
        function(callBack){  //更新数据库数据
            if(needUpDataDb == false){
                callBack(null,null);
                return;
            }
            budokai.upDateBattleInfo(userUid,upDataDb,function(err,res){
                if(err){
                    callBack(err,null);
                }else{
                    callBack(null,null);
                }
            })
        },
        function(callBack){//更新缓存数据
            budokai.updateBloodBattleToRedis(userUid,redisInfo,function(err,res){
                if(err){
                    callBack(err);
                }else{
                    callBack(null,null);
                }
            });
        }
    ],function(err,res){
        if(err){
            response.echo("pve.boduokaiInfo",jutil.errorInfo("postError"));
        }else{
            response.echo("pve.boduokaiInfo",redisInfo);
        }
    });
}
exports.start = start;