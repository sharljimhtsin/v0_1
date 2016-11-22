/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-4-15
 * Time: 下午4:04
 * To change this template use File | Settings | File Templates.
 */
var userVariable = require("../model/userVariable");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var mongoStats = require("../model/mongoStats");

function start(postData, response, query){
    var userUid = query["userUid"];
    var vipConfig = configManager.createConfig(userUid).getConfig("vip");
    var mainConfig = configManager.createConfig(userUid).getConfig("main");
    var returnData = {};
    var needCleanCDData = {};
    var userData;
    var needIngot;
    async.series([
        function(cb){//获取连战CD
            userVariable.getVariableTime(userUid,"continueValue",function(err,res){
                if(err){
                    cb(err,null);
                }else{
                    if(res == null){
                        needCleanCDData["time"] = jutil.now();
                        needCleanCDData["value"] = 0;
                    }else{
                        needCleanCDData = res;
                    }
                    cb(null,null);
                }
            });
        },
        function (cb){//判断VIP等级，金币数量是否足够
            user.getUser(userUid,function(err,res){
                if(err || res == null) cb("noThisUser",null);
                else{
                    var userVip = res["vip"];
                    var dbError = jutil.dataConfirm([vipConfig,mainConfig],[[userVip + ".canClearSuccessiveBattleCd"],["clearSuccessiveBattleTime",
                    "clearSuccessiveBattleCost"]]);
                    if(dbError != null){
                        cb(dbError,null);
                    }else{
                        userData = res;
                        var canClearSuccessiveBattleCd = vipConfig[userVip]["canClearSuccessiveBattleCd"] - 0;
                        var clearSuccessiveBattleTime = mainConfig["clearSuccessiveBattleTime"] - 0;
                        var clearSuccessiveBattleCost = mainConfig["clearSuccessiveBattleCost"] - 0;
                        var cd = (needCleanCDData["value"] - 0) + (needCleanCDData["time"] - 0) - jutil.now();
                        cd = cd < 0 ? 0 : cd;
                        needIngot = (Math.floor(cd / clearSuccessiveBattleTime) + 1) * clearSuccessiveBattleCost;
                        if(canClearSuccessiveBattleCd != 1){
                            cb("vipNotEnough",null);
                        }else if(needIngot > res["ingot"]){
                            cb("ingotNotEnough",null);
                        }else{
                            cb(null,null);
                        }//else
                    }//else
                }//else
            });
        },
        function(cb){//设置CD
            userVariable.setVariableTime(userUid,"continueValue",0,jutil.now(),function(err,res){
                var continueData = {};
                if(err){
                    cb(err,null);
                }else{
                    continueData["time"] = jutil.now();
                    continueData["value"] = 0;
                    returnData["continueData"] = continueData;
                    cb(null,null);
                }
            });
        },
        function(cb){//更新用户信息
            var updateUser = {};
            updateUser["ingot"] = userData["ingot"] - needIngot;
            user.updateUser(userUid,updateUser,function(err,res){
                if(err){
                    cb(err,null);
                }else{
                    mongoStats.expendStats("ingot", userUid, '127.0.0.1', userData, mongoStats.E_CLEAR_CONTINUE,needIngot);
                    returnData["updateUser"] = updateUser;
                    cb(null,null);
                }
            });
        }
    ],function(err,res){
        if(err){
            response.echo("pve.cleanContinueCD",jutil.errorInfo(err));
        }else{
            response.echo("pve.cleanContinueCD",returnData);
        }
    });
}
exports.start = start;