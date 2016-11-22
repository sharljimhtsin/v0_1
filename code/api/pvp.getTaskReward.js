/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 13-12-11
 * Time: 下午3:58
 * To change this template use File | Settings | File Templates.
 */

var pvptop = require("../model/pvptop");
var item = require("../model/item");
var async = require("async");
var userVariable = require("../model/userVariable");
var user = require("../model/user");
var jutil = require("../utils/jutil");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var mongoStats = require("../model/mongoStats");

function start(postData, response, query){
    var userUid = query["userUid"];
    //var sendRewardTop = postData["rewardTop"];
    var configData = configManager.createConfig(userUid);

    var gUserData;
    var highestTop = 0;
    var rewardTop = 0;
    var returnData = {};
    var rankConfig = configData.getConfig("pvpRank");
    var rankRewardLiquid = rankConfig["rankRewardLiquid"];

    async.series([
        function(cb) { //取userId
            user.getUser(userUid, function(err, res) {
                if (err || res == null) cb("dbError");
                else {
                    gUserData = res;
                    cb(null);
                }
            });
        },
        function(callBack){
            pvptop.getTopTaskReward(userUid,function(err,res){
                if(err || res == null){
                    callBack("pvpGetTaskRewardWrong",null);
                }else{
                    rewardTop = res - 0;
                    callBack(null,null);
                }
            });
        },
        function(callBack){
            pvptop.getHighest(userUid,function(err,res){
                if(err || res == null){
                    callBack("pvpGetTaskRewardWrong",null);
                }else{
                    highestTop = res - 0;
                    callBack(null,null);
                }
            });
        },
        function(callBack){
            if(rewardTop != 0 && highestTop <= rewardTop){ //当前奖励正好是没有领的，那么可以领取
                var rewardId = rankRewardLiquid[rewardTop]["rewardId"];
                var rewardCount = rankRewardLiquid[rewardTop]["rewardCount"];
                item.updateItem(userUid,rewardId,rewardCount,function(err,res){
                    if(err || res == null){
                        callBack("pvpGetTaskRewardWrong",null);
                    }else{
                        returnData["getReward"] = res;
                        returnData["rewardCount"] = rewardCount;
                        var userIP = '127.0.0.1';//response.response.socket.remoteAddress;
                        mongoStats.dropStats(rewardId, userUid, userIP, gUserData, mongoStats.PVP_TASK, rewardCount);
                        callBack(null,null);
                    }
                })
            }else{
                callBack("pvpGetTaskRewardWrong",null);
            }
        },
        function(callBack){ //获取奖励
            var nextRewardTop = rankRewardLiquid[rewardTop]["nextRank"];
            if(nextRewardTop == 0){
                nextRewardTop = -1;//所有的奖励都领取完毕
            }
            userVariable.setVariable(userUid,"pvpTaskReward",nextRewardTop,function(err,res){
                if(err || res == null){
                    callBack("pvpGetTaskRewardWrong",null);
                }else{
                    returnData["rewardTop"] = nextRewardTop;
                    callBack(null,null);
                }
            });
        }
    ],function(err,res){
        if(err){
            response.echo("pvp.getTaskReward",jutil.errorInfo(err));
        }else{
            response.echo("pvp.getTaskReward",returnData);
        }
    });
}
exports.start = start;