/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 13-11-21
 * Time: 上午11:21
 * 点击参战接口,返回第一场队伍信息,修改缓存中的数据状态改变为4
 * To change this template use File | Settings | File Templates.
 */
var budokai = require("../model/budokai");
var jutil = require("../utils/jutil");
var async = require("async");
var configManager = require("../config/configManager");

var user = require("../model/user");
function start(postData, response, query){
//    if (jutil.postCheck(postData,"type") == false) {
//        response.echo("pvp.boduokaiInfo",jutil.errorInfo("postError"));
//        return;
//    }
    var userUid = query["userUid"];
    var dbBloodBattleInfo;
    var redisInfo;
    var returnData = {};
    var userData = {};
    var configData = configManager.createConfig(userUid);
    async.series([
        function(callback){//获取用户信息
            user.getUser(userUid,function(err,res){
                if(err || res == null){
                    callback("noThisUser",null)
                }else{
                    userData = res;
                    callback(null,null);
                }
            })
        },
        function(callback){  //获取数据库血战数据
            budokai.getBloodyBattleInfo(userUid,function(err,res){
                if(err || res == null){
                    callback("bloodBattleWrong",null);
                }else{
                    dbBloodBattleInfo = res;
                    var now = jutil.now();
                    if(jutil.compTimeDay(now,dbBloodBattleInfo["todayLastFightTime"]) == true){  //今天的这场是在今天超蛋疼好绕
                        if(dbBloodBattleInfo["challengingTimes"] > 0){
                            callback(null,null);
                        }else{
                            callback("changeTimesNotEnough",null);
                        }
                    }else{
                        callback(null,null);
                    }
                }
            });
        },
        function(callback){ //血战缓存数据
            budokai.getRedisBattleInfo(userUid,function(err,res){
                if(err){
                    callback(err,null);
                }else{
                    redisInfo = res;
                    if(redisInfo["status"] == 1 || redisInfo["status"] == 2) { //正在进行中
                        callback(null,null);
                        return;
                    }
                    redisInfo["todayLastTime"] = jutil.now();
                    if(jutil.compTimeDay((jutil.now() - 86400),dbBloodBattleInfo["lastFightTime"]) == false)  //上一次最后一次战斗部是在昨天绕吧
                    {
                        redisInfo["lastTotleStar"] = 0;
                        redisInfo["lastTotlePoints"] = 0;
                    }else{
                        redisInfo["lastTotleStar"] = dbBloodBattleInfo["lastTimeMostStar"];
                    }
                    callback(null,null);
                }
            });
        },
        function(callback){ //获取队伍信息
            if(redisInfo["status"] == 1 || redisInfo["status"] == 2) { //正在进行中
                callback(null,null);
                return;
            }
            var config = configData.getConfig("bloodBattle");
            var sameSizePro = config["sameSizeProb"];
            var random = Math.random();
            redisInfo["numberOfPoints"] = 1;
            var same;
            if(random < sameSizePro){
                same = true;
            }else{
                same = false;
            }
            //var level = configData.userExpToLevel(userData["exp"]);
            budokai.getBloodBattleTeam(configData, same, userData["lv"], redisInfo["numberOfPoints"],function(err,res){
                if(err){
                    callback(err,null);
                }else{
                    redisInfo["team"] = res;
                    redisInfo["status"] = 1;
                    returnData["team"] = res;
                    callback(null,null);
                }
            });
        },
        function(callback){//更新缓存数据
            budokai.updateBloodBattleToRedis(userUid,redisInfo,function(err,res){
                if(err){
                    callback(err);
                }else{
                    callback(null,null);
                }
            });
        }
    ],function(err,res){
        if(err){
            response.echo("pve.bloodBattleWar",jutil.errorInfo(err));
        }else{
            response.echo("pve.bloodBattleWar",redisInfo);
        }
    });
}
exports.start = start;
