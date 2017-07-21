/**
 * Created with JetBrains WebStorm.
 * User: kongyajie
 * Date: 14-5-14
 * Time: 上午11:32
 * To change this template use File | Settings | File Templates.
 */
/**
 * 返回所有需要提示的信息（豆子、签到、升级奖励等）
 * @param postData
 * @param response
 * @param query
 */
var async = require("async");
var userVariable = require("../model/userVariable");
var practice = require("../model/practice");
var jutil = require("../utils/jutil");
var user = require("../model/user");
var configManager = require("../config/configManager");
var item = require("../model/item");

var practiceOneRecharge = require("../model/practiceOneRecharge");
var oneRecharge2 = require("../model/oneRecharge2");
var practiceTotalConsume = require("../model/practiceTotalConsume");
var dailyConsume = require("../model/dailyCumulativeConsume");
var practiceRecharge = require("../model/practiceRecharge");
var dailyRecharge = require("../model/dailyCumulativeRecharge");

var timeLimitActivity = require("../model/timeLimitActivityReward");
var signInMod = require("../model/signIn");
var vitality = require("../model/vitality");
var achievement = require("../model/achievement");

function start(postData, response, query) {
    var userUid = query["userUid"];
    var tipInfo = {};

    tipInfo["test"] = 0;//for test

    async.series([
        function(cb){
            getTipInfo(userUid,function(err,res){
                if(err) cb(err);
                else{
                    tipInfo = res;
                    cb(null);
                }
            });
        }
    ],function(err){
        if(err){
            response.echo("user.getTipInfo",jutil.errorInfo(err));
        }else{
            tipInfo["test"] = 0;//for test
            response.echo("user.getTipInfo",{"tipInfo":tipInfo});
        }
    });
}

/**
 * 构造tipInfo（不需要提示的字段不传）{"levelUpReward":1,"daily":0...}
 * @param userUid
 * @param callback
 */
function getTipInfo(userUid,callback){
    var info = {};
    var value = 0;
    var createTime = 0;
    var userLevel = 0;
    var monopoly_itemNum = 0;
    var monopoly_newDay = false;

    var configData = configManager.createConfig(userUid);

    async.series([
        //玩家等级
        function(cb){
            user.getUser(userUid, function (err, res) {
                if (res) {
                    var exp = res["exp"];
                    userLevel = res["lv"] - 0;
                    createTime = res["createTime"];
                    cb(err);
                } else {
                    cb("userNotExist");
                }
            });
        },


        //----------------------修行----------------------------
        //仙豆（前端处理）
        //占卜
        function(cb){
            practice.daily(userUid,function(err,res){
                if(err) cb(err);
                else{
                    var lastTime = res[2]["lastTime"];//上次参拜时间
                    if(!jutil.compTimeDay(lastTime, jutil.now())){
                        info["daily"] = 1;
                    }
                    cb(null);
                }
            });
        },

        //大富翁道具数量
        function(cb){
            item.getItem(userUid,"152501",function(err,res){
                if(err) cb(err);
                else{
                    if(res){
                        monopoly_itemNum = res["number"] - 0;
                    }
                    cb(null);
                }
            });
        },

        //大富翁是否是新的一天
        function(cb) {
            userVariable.getVariableTime(userUid, "monopoly_newday", function(err, res){
                if (err) cb(err);
                else {
                    if (res) {
                        var lastRWTime = parseInt(res["time"]);
                        if (isNaN(lastRWTime)) lastRWTime = 0;
                        monopoly_newDay = !jutil.compTimeDay(jutil.now(), lastRWTime);
                    }
                    cb(null);
                }
            });
        },

        //大富翁
        function(cb){
            practice.monopoly(userUid,function(err,res){
                if(err) cb(err);
                else{
                    var isOpen = res[1];
                    if(isOpen && (monopoly_itemNum > 0 || monopoly_newDay)){
                        info["monopoly"] = 1;
                    }
                    cb(null);
                }
            });
        },

        //----------------------活动----------------------------
        //累计充值
        function(cb){
            practiceRecharge.hasRewardToGet(userUid, function(hasReward){
                if (hasReward > 0) {
                    info["totalRecharge"] = hasReward;
                }
                cb(null);
            });
        },

        //每日累计充值
        function(cb){
            dailyRecharge.hasRewardToGet(userUid, function(hasReward){
                if (hasReward > 0) {
                    info["dailyTotalRecharge"] = hasReward;
                }
                cb(null);
            });
        },

        //累计消费
        function(cb){
            practiceTotalConsume.hasRewardToGet(userUid, function(hasReward){
                if (hasReward > 0) {
                    info["totalConsume"] = hasReward;
                }
                cb(null);
            });
        },

        //每日累计消费
        function(cb){
            dailyConsume.hasRewardToGet(userUid, function(hasReward){
                if (hasReward > 0) {
                    info["dailyTotalConsume"] = hasReward;
                }
                cb(null);
            });
        },

        //单笔充值
        function(cb){
            practiceOneRecharge.hasRewardToGet(userUid, function(hasReward){
                if (hasReward > 0) {
                    info["oneRecharge"] = hasReward;
                }
                cb(null);
            });
        },

        // 单笔充值2
        function(cb) {
            oneRecharge2.hasRewardToGet(userUid, function(hasReward){
                if (hasReward > 0) {
                    info["oneRecharge2"] = hasReward;
                }
                cb(null);
            });
        },

        // 限时活动奖励
        function(cb) {
            timeLimitActivity.hasRewardToGet(userUid, function(hasReward){
                if (hasReward > 0) {
                    info["timeLimitActivity"] = hasReward;
                }
                cb(null);
            });
        },

        // 每日签到
        function(cb) {
            signInMod.hasRewardToGet(userUid, function(hasReward){
                if (hasReward > 0) {
                    info["signIn"] = hasReward;
                }
                cb(null);
            });
        },

        // 活跃度
        function(cb) {
            vitality.hasRewardToGet(userUid, function(hasReward){
                if (hasReward > 0) {
                    info["vitality"] = hasReward;
                }
                cb(null);
            });
        },

        // 成就
        function(cb) {
            achievement.hasRewardToGet(userUid, function(hasReward){
                if (hasReward > 0) {
                    info["achievement"] = hasReward;
                }
                cb(null);
            });
        },

        //升级奖励
        function(cb){
            practice.levelUpReward(userUid,function(err,res){
                if(err) cb(err);
                else{
                    var notAllReceived = res[1];
                    var rewardData = res[2];
                    if(notAllReceived == true){
                        for(var level in rewardData){
                            if(userLevel >= level - 0 && rewardData[level] == 0){
                                info["levelUpReward"] = 1;
                                break;
                            }
                        }
                    }
                    cb(null);
                }
            });
        },

        //七天签到
        function(cb){
            practice.continuousLogin(userUid,function(err,res){
                if(err) cb(err);
                else{
                    var open = res[1];
                    var rewardData = res[2];
                    var value = rewardData["value"];
                    var continueDays = rewardData["days"];
                    if(open == true){
                        for(var day in value){
                            if(continueDays > day - 0 && value[day] == 0){
                                info["ctLogin"] = 1;
                                break;
                            }
                        }
                    }
                    cb(null);
                }
            });
        },

        //基金
        function(cb){
            practice.growthFund(userUid,function(err,res){
                if(err) cb(err);
                else{
                    var open = res[1];//已领取完open会变成false
                    var rewardData = res[2];
                    var joinFund = rewardData["joinFund"];
                    var fundReward = rewardData["fundReward"];
                    var hasAvailableReward = false;

                    if(fundReward == null){
                        cb(null);
                    } else {
                        var configData = configManager.createConfig(userUid);
                        var fundConfig = configData.getConfig("growth")["fund"]["reward"];
                        var index = 0;
                        for(var level in fundConfig){
                            var bit = jutil.bitGet(fundReward,index);
                            if(userLevel >= level && bit == 0){
                                hasAvailableReward = true;
                                break;
                            }
                            index ++;
                        }

                        if(open && joinFund == 1 && hasAvailableReward){
                            info["fund"] = 1;
                        }
                        cb(null);
                    }
                }
            });
        },

        //新用户理财（条件:刚创号3天内 或 已加入理财且奖励未领取完）
        function(cb){
            practice.growthFinPlanNewUser(userUid, function (err, res) {
                if (err) cb(err);
                else {
                    var open = res[1];//已领取完open会变成false
                    if(!open){
                        cb(null);
                    } else {
                        var rewardData = res[2];
                        var joinFin = rewardData["joinFinPlanNewUser"];
                        var finReward = rewardData["finPlanNewUserReward"];
                        var hasAvailableReward = false;

                        if (finReward == null) {
                            cb(null);
                        } else {
                            var configData = configManager.createConfig(userUid);
                            var finConfig = configData.getConfig("growth")["financialPlanNewUser"]["reward"];
                            var index = 1;
                            var hasAvailableCount = 0;
                            for (var level in finConfig) {
                                var bit = jutil.bitGet(finReward, index);
                                if (userLevel >= level && bit == 0) {
                                    hasAvailableReward = true;
                                    hasAvailableCount++;
                                }
                                index++;
                            }

                            if (open && joinFin == 1 && hasAvailableReward) {
                                info["finPlanNewUser"] = hasAvailableCount;
                            }
                            cb(null);
                        }
                    }
                }
            });
        }
    ],function(err){
        if(err) callback(err);
        else{
            callback(null,info);
        }
    });
}

exports.start = start;