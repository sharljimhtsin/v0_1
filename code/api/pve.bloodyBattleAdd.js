/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 13-11-20
 * Time: 上午10:53
 * 血战信息加成
 * To change this template use File | Settings | File Templates.
 */
var budokai = require("../model/budokai");
var jutil = require("../utils/jutil");
var async = require("async");
var bloodyBattle = require("../model/bloodyBattle");
function start(postData, response, query){
    if (jutil.postCheck(postData,"addInfo") == false) {
        response.echo("pve.bloodyBattleAdd",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var redisInfo = {};
    var addType = postData["addInfo"];
    async.series([
        function(callback){//缓存数据
            budokai.getRedisBattleInfo(userUid,function(err,res){
                if(err || res == null){
                    callback("bloodBattleWrong",null);
                }else{
                    if(res["addInfo"] == null && res["status"] != 1){
                        callback("bloodBattleWrong",null);
                    }else{
                        var addInfo = res["addInfo"];
                        redisInfo = res;
                        if(redisInfo["status"] == 1){
                            redisInfo["status"] = 2;
                            redisInfo[addType] = redisInfo[addType] + redisInfo["freeAdd"];
                            callback(null,null);
                            return;
                        }else{
                            var addItem;
                            for(var i = 0 ; i < addInfo.length ; i ++){
                                if(addInfo[i]["type"] == addType){
                                    addItem = addInfo[i];
                                    break;
                                }
                            }
                            if(addItem == null){
                                callback("starNotEnough",null);
                                return;
                            }
                            if(redisInfo["leastStar"] >= addItem["needStar"]){
                                redisInfo["leastStar"] -= addItem["needStar"];
                                redisInfo[addType] = redisInfo[addType] + addItem["num"];
                                redisInfo[addType] = Math.ceil(redisInfo[addType] * 100) / 100;
                                redisInfo["addInfo"] = null;
                                callback(null,null);
                            }else{
                                callback("starNotEnough",null);
                            }
                        }
                    }
                }
            });
        },
        function(callback){//更新缓存数据
            budokai.updateBloodBattleToRedis(userUid,redisInfo,function(err,res){
                if(err){
                    callback(err,null);
                }else{
                    callback(null,null);
                }
            });
        }
    ],function(err,res){
        if(err){
            response.echo("pve.bloodyBattleAdd",jutil.errorInfo(err));
        }else{
            response.echo("pve.bloodyBattleAdd",redisInfo);
        }
    });
}
exports.start = start;