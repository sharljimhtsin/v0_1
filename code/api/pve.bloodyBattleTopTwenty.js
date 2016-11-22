/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 13-11-22
 * Time: 下午12:10
 * To change this template use File | Settings | File Templates.
 */
var bloodyLeaderboard = require("../model/bloodyLeaderboard");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var userVariable = require("../model/userVariable");


function start(postData, response, query) {
    if (jutil.postCheck(postData,"type") == false) {
        response.echo("pve.bloodyBattleTopTwenty",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var type = postData["type"];
    var topTwenty;
    var returnData = [];
    var configData = configManager.createConfig(userUid);
    var key = "bloodBattle:times";//连续进榜天数
    var reduceNum = postData["day"] == "yesterday" ? 1 : 0;
    async.series([
        function(callback){ //获取前二十名
            bloodyLeaderboard.getTopTwenty(userUid,type,jutil.day() - reduceNum,function(err,res){
                if(err){
                    callback(err,null);
                }else{
                    topTwenty = res;
                    callback(null,null);
                }
            });
        },
        function(callback){//获取前二十名用户信息
            async.forEach(topTwenty,function(item,callbackEach){
                user.getUser(item["userId"],function(err,res){
                    if(err || res == null){
                        callbackEach("noThisUser",null);
                    }else{
                        item["userName"] = res["userName"];
                        item["level"] = res["lv"];
                        returnData.push(item);
                        callbackEach(null,null);
                    }
                });
            },function(err,res){
                if(err){
                    callback(err,null);
                }else{
                    callback(null,null);
                }
            });
        },
        function(callback){ //获取连续进榜天数
            async.forEach(topTwenty,function(item,callbackEach){
                userVariable.getVariableTime(userUid,key,function(err,res){
                    if(err){
                        callbackEach("noThisUser",null);
                    }else{
                        if(res == null){
                            item["day"] = 1;
                        }else{
                            item["day"] = res["value"];
                        }
                        callbackEach(null,null);
                    }
                });
            },function(err,res){
                if(err){
                    callback(err,null);
                }else{
                    callback(null,null);
                }
            });
        }
    ],function(err,res){
        if(err){
            response.echo("pve.bloodyBattleTopTwenty",jutil.errorInfo(err));
        }else{
           // returnData["topTwenty"] = topTwenty;
            response.echo("pve.bloodyBattleTopTwenty",returnData);
        }
    });
}

exports.start = start;