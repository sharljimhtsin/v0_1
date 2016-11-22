/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 13-11-20
 * Time: 下午2:38
 * 血战领取奖励接口
 * To change this template use File | Settings | File Templates.
 */
var budokai = require("../model/budokai");
var jutil = require("../utils/jutil");
var async = require("async");
var modelUtil = require("../model/modelUtil");
var user = require("../model/user");
var bloodyBattle = require("../model/bloodyBattle");
var mongoStats = require("../model/mongoStats");

function start(postData, response, query){
//    if (jutil.postCheck(postData,"rewardType") == false) {
//        response.echo("pvp.bloodyBattleAdd",jutil.errorInfo("postError"));
//        return;
//    }
    var userUid = query["userUid"];
    var redisInfo = {};
    var returnData = {};
    var rewardItem = null;
    var userData = {};
    async.series([
        function(callback){
            user.getUser(userUid,function(err,res){
                if(err || res == null){
                    callback("noThisUser",null);
                }else{
                    userData = res;
                    callback(null,null);
                }
            })
        },
        function(callback){//缓存数据
            budokai.getRedisBattleInfo(userUid,function(err,res){
                if(err || res == null){
                    callback("bloodBattleWrong",null);
                }else{
                    if(res["reward"] == null){
                        callback("bloodBattleWrong",null);
                    }else{
                        redisInfo = res;
//                        if(jutil.compTimeDay(redisInfo["todayLastTime"],jutil.now()) == false){
//                            bloodyBattle.upDataDb(userUid,redisInfo,function(err,res){
//                                var da = {};
//                                da["error"] = "bloodBattleTimeOver";
//                                response.echo("pve.bloodBattleGetReward",da);
//                                return;
//                            });
//                        }else{
                            var reward = redisInfo["reward"];
                            if(reward != null){
                                rewardItem = reward;
                            }
                            callback(null,null);
                        }
//                    }
                }
            });
        },
        function (callback){//更新item信息
            async.forEach(rewardItem,function(item,callBackArr){
                returnData["upDateUser"] = {};
                var itemType = item["type"];
                var userIP = '127.0.0.1';//response.response.socket.remoteAddress;
                if(itemType == "gold" || itemType == "ingot"){
                    var updataData = {};
                    updataData[itemType] = userData[itemType] - 0 + item["count"];
                    mongoStats.dropStats(itemType, userUid, userIP, userData, mongoStats.BLOOD5, item["count"]);
                    user.updateUser(userUid,updataData,function(err,res){
                        if(err){
                            callBackArr(err);
                        }else{
                            returnData["upDateUser"][itemType] = updataData[itemType];
                            callBackArr(null);
                        }
                    })
                }else{
                    mongoStats.dropStats(itemType, userUid, userIP, userData, mongoStats.BLOOD5, item["count"]);

                    modelUtil.addDropItemToDB(itemType,item["count"],userUid,false,1,function(err,res){
                        if(err || res == null){
                            callBackArr("bloodBattleWrong");
                        }else{
                            if(returnData["dropData"] == null) returnData["dropData"] = [];
                            returnData["dropData"].push(res);
                            callBackArr(null);
                        }
                    })
                }
            },function(err){
                if(err){
                    callback("bloodBattleWrong",null);
                }else{
                    callback(null,null);
                }
            });
        },
        function(callback){//更新缓存数据
            redisInfo["reward"] = null;
            budokai.updateBloodBattleToRedis(userUid,redisInfo,function(err,res){
                if(err){
                    callback(err,null);
                }else{
                    returnData["redisInfo"] = redisInfo;
                    callback(null,null);
                }
            });
        }
    ],function(err,res){
        if(err){
            response.echo("pve.bloodBattleGetReward",jutil.errorInfo(err));
        }else{
            response.echo("pve.bloodBattleGetReward",returnData);
        }
    });
}
exports.start = start;