/**
 * Created with JetBrains WebStorm.
 * User: kongyajie
 * Date: 14-3-10
 * Time: 下午8:40
 * To change this template use File | Settings | File Templates.
 */
var user = require("../model/user");
var itemModel = require("../model/item");
var async = require("async");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var userVariable = require("../model/userVariable");
var modelUtil = require("../model/modelUtil");

/**
 * 请求玩家升级 user.levelUp
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    if (jutil.postCheck(postData,"level") == false) {
        response.echo("user.levelUp",jutil.errorInfo("postError"));
        return;
    }

    var newLevel = postData["level"];
    var userUid = query["userUid"];
    var lastLevelUpReward;//旧的变量值
    var newUserData = {};
    var newUserReward = [];
    var addGold = 0;
    var addIngot = 0;
    var userGold = 0;
    var userIngot = 0;
    var newLevelUpReward;//新的变量值
    var rewardOther = [];

    var configData = configManager.createConfig(userUid);

    async.series([
        //等级验证，防止玩家篡改等级提前领取奖励
        function(cb){
            user.getUser(userUid,function(err,res){
                if(err) cb("dbError");
                else{
                    var exp = res["exp"];
                    var userLevel = res["lv"] - 0;
                    if(userLevel < newLevel){
                        cb("valueError");
                    }else{
                        userGold = res["gold"] - 0;
                        userIngot = res["ingot"] - 0;
                        cb(null);
                    }
                }
            });
        },
        //等级奖励验证，可能领取多等级奖励
        function(cb){
            userVariable.getVariable(userUid,"lastLevelUpReward",function(err,res){
                if(err) cb("dbError");
                else{
                    if(res == null){lastLevel = 1;}
                    else{
                        var value = res;
                        lastLevel = value - 0;
                    }
                    if(lastLevel >= newLevel){
                        cb("haveReceive");
                    }else{
                        lastLevelUpReward = lastLevel;
                        newLevelUpReward = newLevel;
                        var playerConfig = configData.getConfig("player");
                        for(var i = lastLevel + 1; i <= newLevel; i++){
                            addGold += (playerConfig[i]["rewardZeniLevelUp"] - 0);
                            addIngot += (playerConfig[i]["rewardImeggaLevelUp"] - 0);

                            var rewardOther = playerConfig[i]["rewardOtherLevelUp"];
                            if(rewardOther!=undefined) {
                                for (var k in rewardOther) {
                                    newUserReward.push(rewardOther[k])
                                }
                            }
                        }
                        newUserData["gold"] = userGold - 0 + (addGold - 0);
                        newUserData["ingot"] = userIngot - 0 + (addIngot - 0);
                        cb(null);
                    }
                }
            });
        },
        //添加等级奖励，更新用户数据(new)
        function(cb){
            user.updateUser(userUid,newUserData,function(err,res){
                if(err) cb("dbError");
                else{
                    if(newUserReward.length>0) {
                        async.forEach(newUserReward, function (reward, forCb) {
                            modelUtil.addDropItemToDB(reward["id"], reward["count"], userUid, 0, 1, function (err, res) {
                                if (err) forCb(err, null);
                                else {
                                    rewardOther.push(res);
                                    forCb(null, null);
                                }
                            });
                        }, function (err) {
                            if (err) cb(err, null);
                            else {
                                cb(null, null);
                            }
                        });
                    }else{
                        cb(null, null);
                    }
                }
            });
        },
        //更新variable
        function(cb){
            userVariable.setVariableTime(userUid, "lastLevelUpReward", newLevelUpReward, jutil.now(), function(err, res) {
                if (err) console.error(userUid, newLevelUpReward, jutil.now(), err.stack);
                cb(null);
            });
        }
    ], function(err) {
        if(err){
            response.echo("user.levelUp",jutil.errorInfo(err));
        }else{
            response.echo("user.levelUp",{"result":1,"gold":newUserData["gold"],"ingot":newUserData["ingot"],"reward":rewardOther});
        }
    });
}

exports.start = start;