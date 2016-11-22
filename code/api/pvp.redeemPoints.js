/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 13-11-15
 * Time: 下午2:50
 * To change this template use File | Settings | File Templates.
 */
var jutil = require("../utils/jutil");
var async = require("async");
var userVariable = require("../model/userVariable");
var user = require("../model/user");
var item = require("../model/item");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var pvptop = require("../model/pvptop");
var mongoStats = require("../model/mongoStats");
function start(postData, response, query) {
    if (jutil.postCheck(postData,"type") == false) {
        response.echo("pvp.redeemPoints",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var pointInfo = {};   //积分信息
    var brothNum;//培养液
    var returnData = {};
    var currentUserTop;
    var exchangeNum = postData["type"];
    if (exchangeNum <= 0) {
        response.echo("pvp.redeemPoints",jutil.errorInfo("postError"));
        return;
    }


    var configData = configManager.createConfig(userUid);
    var gUserData;
    async.series([
        function(callback){ //获取总积分
            userVariable.getVariableTime(userUid,"redeemPoint",function(err,res){
                if(err){
                    callback(err);
                }else{
                    if(res == null){
                        pointInfo["value"] = 0;
                        pointInfo["time"] = jutil.now();
                    }else{
                        pointInfo = res;
                    }
                    callback(null);
                }
            });
        },
        function(cb) { //取userId
            user.getUser(userUid, function(err, res) {
                if (err || res == null) cb("dbError");
                else {
                    gUserData = res;
                    cb(null);
                }
            });
        },
        function(callback){ ///取用户当前排名
            pvptop.getUserTop(userUid,function(err,res){
                if(err || res == null){
                    callback("dateError");
                }else{
                    currentUserTop = res["top"];
                    callback(null);
                }
            })
        },
        function(callback){//获取培养丹的数量
            item.getItem(userUid,"150901",function(err,res){
                if(err){
                    callback(err);
                }else{
                    brothNum = res == null ? 0 : res["number"];
                    callback(null);
                }
            });
        },
        function(callback){
            var pvpRankConfig = configData.getConfig("pvpRank");
            var rankRewardPoint = pvpRankConfig["rankRewardPoint"];
            var rankItem;
            for(var key in rankRewardPoint){
                var item = rankRewardPoint[key];
                if(currentUserTop >= item["highestRank"] && currentUserTop <= item["lowestRank"]){
                    rankItem = item;
                    break;
                }
            }
            var pastTime = jutil.now() - (pointInfo["time"] - 0);
            var pastTimeByRewardTime = Math.floor(pastTime / pvpRankConfig["pointRewardTime"]);
            var pureValue = (pointInfo["value"] - 0) + pastTimeByRewardTime * rankItem["reward"];
            if((exchangeNum * 200) > pureValue){//不够
                callback("pointNotEnough");
            }else{
                pointInfo["value"] = pureValue - exchangeNum * 200;
                brothNum += exchangeNum;
                pointInfo["time"] = (pointInfo["time"]-0) + pastTimeByRewardTime * pvpRankConfig["pointRewardTime"];
                callback(null);
            }
        },
        function(callback){//更新培养丹
            item.updateItem(userUid,"150901",exchangeNum,function(err,res){
                   if(err){
                       callback(err);
                   }else{
                       var userIP = '127.0.0.1';//response.response.socket.remoteAddress;
                       mongoStats.dropStats("150901", userUid, userIP, gUserData, mongoStats.PVP_REDEEMPOINTS, exchangeNum);
                       callback(null);
                   }
            });
        },
        function(callback){
           userVariable.setVariableTime(userUid,"redeemPoint",pointInfo["value"],pointInfo["time"],function(err,res){
                if(err){
                    callback(err);
                }else{
                    callback(null);
                }
           });
        }
    ],function(err){
        returnData["brothNum"] = brothNum;
        returnData["currentPoint"] = pointInfo;
        if(err){
            response.echo("pvp.redeemPoints",jutil.errorInfo(err));
        }else{
            response.echo("pvp.redeemPoints",returnData);
        }
    })
}
exports.start = start;