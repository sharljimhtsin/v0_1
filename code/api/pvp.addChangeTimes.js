/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-2-25
 * Time: 下午4:25
 * To change this template use File | Settings | File Templates.
 *///"pvp.addChangeTimes
var item = require("../model/item");
var userVariable = require("../model/userVariable");
var configManager = require("../config/configManager");
var user = require("../model/user");
var jutil = require("../utils/jutil");
var async = require("async");
var mongoStats = require("../model/mongoStats");
function start(postData, response, query) {
    var userUid = query["userUid"];
    var configData = configManager.createConfig(userUid);
    var vipConfig = configData.getConfig("vip");
    var mainConfig = configData.getConfig("main");
    var itemConfig = configData.getConfig("item");
    var itemData = {};
    var pvpData = {};
    var userData = {};
    var updateItem = {};
    var updateVariable = {};
    var returnData;
    async.auto({
        "getUser":function(cb){
            user.getUser(userUid,function(err,res){
                if(err || res == null){
                    cb("noThisUser");
                    return;
                }else{
                    userData = res;
                    cb(null);
                }
            });
        },
        "getFightBookNum":function(cb){
            item.getItem(userUid,"151201",function(err,res){
                if(err || res == null){
                    cb("fightBookNotEnough");
                    return;
                }else{
                    itemData = res;
                    cb(null);
                }
            })
        },
        "getPvpTimes":["getUser",function(cb){
            userVariable.getVariableTime(userUid,"pvpChangeTime",function(err,res){
                if(err){
                    cb("getPVPTimesWrong");
                }else{
                    if(res == null){
                        var userVipLevel = "" + userData["vip"];
                        pvpData["time"] = 0;
                        pvpData["value"] = vipConfig[userVipLevel]["pvpTimes"];
                        cb(null);
                    }else{
                        pvpData = res;
                        cb(null);
                    }
                }
            });
        }],
        "setPvpTimes":["getUser","getPvpTimes","getFightBookNum",function(cb){
            itemData["number"] = 100;
            if(userData["level"] < mainConfig["rankBattleOpen"]){//等级不够
                cb("fiveLevelOpen");
            }else if((itemData["number"] - 0) < 1){ //战书不足
                cb("fightBookNotEnough");
            }else{
                var itemC = itemConfig["151201"];
                updateVariable["value"] = (pvpData["value"] - 0) + (itemC["typeValue"] - 0);
                updateVariable["time"] = jutil.now();
                updateItem["number"] = (itemData["number"] - 0) - 1;
                userVariable.setVariableTime(userUid,"pvpChangeTime",updateVariable["value"],updateVariable["time"],function(err,res){
                      if(err){
                          cb(err);
                      }else{
                          cb(null);
                      }
                });
            }
        }],
        "setItemNum":["setPvpTimes",function(cb){
            item.updateItem(userUid,"151201",-1,function(err,res){
                if(err){
                    cb(err)
                }else{
                    returnData = res;
                    var userIP = '127.0.0.1';//response.response.socket.remoteAddress;
                    mongoStats.expendStats("151201", userUid, userIP, userData, mongoStats.ADDCHANGETIMES, 1);
                    cb(null);
                }
            })
        }]
    },function(err){
        if(err){
            response.echo("pvp.addChangeTimes",jutil.errorInfo(err));
        }else{
            response.echo("pvp.addChangeTimes",returnData);
        }
    });
}
exports.start = start;