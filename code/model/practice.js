/**
 * 修行（奇遇） 数据层
 * User: liyuluan
 * Date: 13-11-14
 * Time: 下午6:28
 */

var userVariable = require("../model/userVariable");
var configManager = require("../config/configManager");
var teach = require("../model/teach");
var user = require("../model/user");
var jutil = require("../utils/jutil");
var async = require("async");
var redis = require("../alien/db/redis");
var activityConfig = require("../model/activityConfig");
var timeLimitMall = require("../model/limitMall");
var practiceOneRecharge = require("../model/practiceOneRecharge");
var oneRecharge2Mod = require("../model/oneRecharge2");
var practiceTotalConsume = require("../model/practiceTotalConsume");
var dailyConsume = require("../model/dailyCumulativeConsume");
var practiceRecharge = require("../model/practiceRecharge");
var dailyRecharge = require("../model/dailyCumulativeRecharge");
var gsData = require("../model/gsData");
var timeLimitActivity = require("../model/timeLimitActivityReward");
var signInMod = require("../model/signIn");
var financial = require("../model/financialPlan");
var vitalityMod = require("../model/vitality");
var achievementMod = require("../model/achievement");
var activityData = require("../model/activityData");

/**
 * @param userUid
 * @param callbackFn
 */
function getPracticeList(userUid,callbackFn) {
    var practiceFnList = [monthCard, alchemy, continuousLogin, eatbean, daily,
        levelUpReward, teachData, worldBossTeachData, growthFund, growthFinPlanNewUser, totalRecharge, totalConsume,
        powerBridging, oneRecharge, oneRecharge2, monopoly, limitMall, review, dailyCumulativeRecharge,
        dailyCumulativeConsume, oneRecharge3, oneRecharge4, timeLimitActivityReward, getVipActivityData, getCostListActivity, luckySeven,
        signIn, getFinancialPlanActivity, redRibbon, vitality, achievement, doubleFeast, groupPurchase, groupPurchase2, groupPurchase3, scoreMall, rechargeRanking,
        consumeRanking, cosmosEvaluation, cosmosLeague, forge, regress, dailyMustRecharge, smashEgg, gemCompose, practiceCross, messiah, tribute, wheel,
        vipClub, morphPromo, scratch, fire, catalyst, limitSummon, growSign, cashCow, luckyConvert, paradiseSearch, practiceEndorse, practiceDarker, slots,
        blackSmith, rebateShop, mailBinding, bejeweled, quarterCard, pvpTopCross
    ];//leagueTeam,gallants
    /*
    * doubleFeast--双节活动（za）;scoreMall--积分商城（za）;rechargeRanking--充值排行榜(za);consumeRanking--充值排行榜(za)
    * cosmosEvaluation--宇宙第一评选;cosmosLeague--宇宙第一联盟评选;regress--回归活动；dailyMustRecharge--每日必买
    * practiceCross--夺宝奇兵 practiceWheel--金币摩天轮 ,vipClub--vip俱乐部，scratch--刮刮乐,fire--神龟射射射
    * limitSummon --限时抽将，growSign--新成长基金，cashCow--摇钱树,luckyConvert--幸运兑换，paradiseSearch--神龙卡片翻翻翻
    * practiceEndorse--龙神祝福,practiceDarker--vip黑洞,slots--新拉霸，blackSmith--铁匠铺, rebateShop--折扣商店,mailBinding--邮箱绑定
    * gallants--巡游（武道会擂台赛）,bejeweled--宝石迷阵，matrix--图阵,quarterCard--季卡,leagueTeam--联盟战,integralBattle--擂台积分赛
    * */

    var resultList = {};
    async.forEach(practiceFnList,function(item,forCb) {
        item.call(null,userUid,function(err,res) {
            if (err) forCb(err);
            else {
                if (res[1] == true) {
                    resultList[res[0]] = res[2];
                }
                forCb(null);
            }
        });
    }, function(err) {
        if (err) callbackFn(err);
        else {
            callbackFn(null,resultList);
        }
    });
}


/**====================================================================
 *  每项奇遇的数据为一函数，
 *  函数回调 err res
 *  res => [open:Boolean,value:Object]
 *
 ====================================================================*/

/**
 * 成就
 * @param userUid
 * @param callbackFn
 */
function achievement(userUid, callbackFn) {
    achievementMod.hasRewardToGet(userUid, function(hasRewardCount){
        callbackFn(null, ["achievement", true, (hasRewardCount > 0) ? hasRewardCount : null]);
    });
}

/**
*  双节活动接口
* @param userUid
* @param callbackFn
*/
function doubleFeast(userUid, callbackFn) {
    var language = "";
    activityConfig.getConfig(userUid, "doubleFeast", function(err, res){
        if (err) {
            callbackFn(null, ["doubleFeast", false, null]);
        }
        else {
            if (res[0]) {
                var config = res[2] == null?res[3]:res[2];
                var newConfig = {};
                userVariable.getLanguage(userUid,function(err, res){
                    if(!err && res)
                        language = res;
                    var title = config["title"+language] == undefined?config["title"]:config["title"+language];
                    newConfig["title"] = jutil.toBase64(title);
                    newConfig["list"] = [];
                    for(var i in config["list"]){
                        var newData = {};
                        for(var j in config["list"][i]){
                            newData[j] = config["list"][i][j];
                        }
                        var msg = config["list"][i]["msg"+language] == undefined?config["list"][i]["msg"]:config["list"][i]["msg"+language];
                        newData["msg"] = jutil.toBase64(msg);
                        newConfig["list"].push(newData);
                    }
                    callbackFn(null, ["doubleFeast", true, newConfig]);
                });
            } else {
                callbackFn(null, ["doubleFeast", false, null]);
            }
        }
    });
}

/**
 *  积分商城接口--za
 * @param userUid
 * @param callbackFn
 */
function scoreMall(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "scoreMall", function(err, res){
        if (err || !res[0]) {
            callbackFn(null, ["scoreMall", false, null]);
        }
        else {
            callbackFn(null, ["scoreMall", true, null]);
        }
    });
}

/**
 *  充值排行榜--za
 * @param userUid
 * @param callbackFn
 */
function rechargeRanking(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "rechargeRanking", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["rechargeRanking", false, null]);
        } else {
            if (res[0]) {
                callbackFn(null, ["rechargeRanking", true, null]);
            } else {
                callbackFn(null, ["rechargeRanking", false, null]);
            }
        }
    });
}
/**
 *  消费排行榜--za
 * @param userUid
 * @param callbackFn
 */
function consumeRanking(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "consumeRanking", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["consumeRanking", false, null]);
        } else {
            if (res[0]) {
                callbackFn(null, ["consumeRanking", true, null]);
            } else {
                callbackFn(null, ["consumeRanking", false, null]);
            }
        }
    });
}
/**
 *  宇宙第一评选--za
 * @param userUid
 * @param callbackFn  cosmosEvaluation
 */
function cosmosEvaluation(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "cosmosEvaluation", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["cosmosEvaluation", false, null]);
        } else {
            if (res[0]) {
                callbackFn(null, ["cosmosEvaluation", true, null]);
            } else {
                callbackFn(null, ["cosmosEvaluation", false, null]);
            }
        }
    });
}
/**
 *  宇宙第一联盟评选--za
 * @param userUid
 * @param callbackFn  cosmosLeague
 */
function cosmosLeague(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "cosmosLeague", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["cosmosLeague", false, null]);
        } else {
            if (res[0]) {
                callbackFn(null, ["cosmosLeague", true, null]);
            } else {
                callbackFn(null, ["cosmosLeague", false, null]);
            }
        }
    });
}
/**
 *  回归活动接口
 * @param regress
 * @param userUid
 * @param callbackFn
 */
function regress(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "regress", function (err, res) {
        if (err || res == null) {
            callbackFn(null, ["regress", false, null]);
        } else {
            if (res[0]) {
                var sTime = res[4];
                var currentConfig = res[2];
                activityData.getActivityData(userUid, activityData.PRACTICE_REGRESS, function(err, res){
                    if(!err && res != null && res["dataTime"] == sTime && res["status"] == 1){
                        callbackFn(null, ["regress", true, currentConfig]);
                    } else {
                        callbackFn(null, ["regress", false, null]);
                    }
                });
            } else {
                callbackFn(null, ["regress", false, null]);
            }
        }
    });
}

/*
 * 聚宝盆活动入口
 * */
function forge(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "forge", function (err, res) {
        if (err || res == null) {
            callbackFn(null, ["forge", false, null]);
        } else {
            if (res[0]) {
                callbackFn(null, ["forge", true, null]);
            } else {
                callbackFn(null, ["forge", false, null]);
            }
        }
    });
}

/*
 * 跨服激戰活动入口
 * */
function pvpTopCross(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "pvpTopCross", function (err, res) {
        if (err || res == null) {
            callbackFn(null, ["pvpTopCross", false, null]);
        } else {
            if (res[0]) {
                callbackFn(null, ["pvpTopCross", true, null]);
            } else {
                callbackFn(null, ["pvpTopCross", false, null]);
            }
        }
    });
}

/*
 * 铁匠铺活动入口
 * */
function blackSmith(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "blackSmith", function (err, res) {
        if (err || res == null) {
            callbackFn(null, ["blackSmith", false, null]);
        } else {
            if (res[0]) {
                callbackFn(null, ["blackSmith", true, null]);
            } else {
                callbackFn(null, ["blackSmith", false, null]);
            }
        }
    });
}
/*
 * 折扣商店活动入口
 * */
function rebateShop(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "rebateShop", function (err, res) {
        if (err || res == null) {
            callbackFn(null, ["rebateShop", false, null]);
        } else {
            if (res[0]) {
                callbackFn(null, ["rebateShop", true, null]);
            } else {
                callbackFn(null, ["rebateShop", false, null]);
            }
        }
    });
}
/*
 * 宝石迷阵活动入口
 * */
function bejeweled(userUid, callbackFn) {
    var configData = configManager.createConfig(userUid);
    var lvMin = configData.getConfig("main")["gem_open"];//取宝石等级配置
    user.getUser(userUid, function (err, res) {
        if (err || res == null) {
            callbackFn(null, ["bejeweled", false, null]);
        } else {
            if (parseInt(res["lv"]) >= lvMin) {
                callbackFn(null, ["bejeweled", true, null]);
            } else {
                callbackFn(null, ["bejeweled", false, null]);
            }
        }
    });
}

/*
 * 巡游活动入口--gallants
 * */
function gallants(userUid, callbackFn) {
    var configData = configManager.createConfig(userUid);
    var galConfig = configData.getConfig("main");
    var needLv = galConfig["gallantsOpen"];
    user.getUser(userUid,function(err,res){
        if (err || res == null) {
            callbackFn(null, ["gallants", false, null]);
        } else {
            if (res["lv"] >= needLv) {
                callbackFn(null, ["gallants", true, null]);
            } else {
                callbackFn(null, ["gallants", false, null]);
            }
        }
    });
}

/*
 * 联盟战活动入口--leagueTeam
 * */
function leagueTeam(userUid,callbackFn){
    user.getUser(userUid,function(err,res){
        if (err || res == null) {
            callbackFn(null, ["leagueTeam", false, null]);
        } else {
            callbackFn(null, ["leagueTeam", true, null]);
        }
    });
}

/*
 * 邮箱绑定活动入口
 * */
function mailBinding(userUid, callbackFn) {
    callbackFn(null, ["mailBinding", true, null]);
}

/**
 * 活跃度奖励
 * @param userUid
 * @param callbackFn
 */
function vitality(userUid, callbackFn) {
    vitalityMod.hasRewardToGet(userUid, function(hasRewardCount){
        callbackFn(null, ["vitality", true, (hasRewardCount > 0) ? hasRewardCount : null]);
    });
}

/**
 * 紅緞帶軍團
 * @param userUid
 * @param callbackFn
 */
function redRibbon(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "redRibbonTreasure", function(err, res){
        if (err) {
            callbackFn(null, ["redRibbon", false, null]);
        }
        else {
            var eTime = res[5];
            var endTime = eTime + 60 * 60 * 24 * 1; // 推迟一天
            if ((jutil.now() > res[4]) && (jutil.now() < endTime)) {
                callbackFn(null, ["redRibbon", true, null]);
            } else {
                callbackFn(null, ["redRibbon", false, null]);
            }
        }
    });
}

/**
 * 每日签到
 * @param userUid
 * @param callbackFn
 */
function signIn(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "signIn", function(err, res) {
        if (err || res == null) {
            callbackFn(null, ["signIn", false, null]);
        } else {
            var sTime = res[4];
            var eTime = res[5];
            if (eTime > sTime && (jutil.now() >= sTime)) {
                signInMod.hasRewardToGet(userUid, function(rwCnt){
                    callbackFn(null, ["signIn", true, rwCnt]);
                });
            } else {
                callbackFn(null, ["signIn", false, null]);
            }
        }
    });
}

/**
 * 幸运777
 * @param userUid
 * @param callbackFn
 */
function luckySeven(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "lucky777", function(err, res) {
        if (res != null) {
            if (res[0]) {//开启
                var config = res[3];
                var reward = res[2];
                user.getUser(userUid, function(err, res) {
                    if (err || res == null)
                        callbackFn(null, ["luckySeven", false, null]);
                    else {
                        var vip = res["vip"] + "";
                        userVariable.getVariableTime(userUid, "luckySevenFreeTimes", function(err, res) {
                            if (res == null) {
                                callbackFn(null, ["luckySeven", true, {"freeTimes":getFreeTimesByVip(vip, config["dailyFreeTime"]),"time":0,"reward":reward}]);
                            }
                            else {
                                if (!jutil.compTimeDay(jutil.now(), res["time"])) {//不是同一天
                                    callbackFn(null, ["luckySeven", true, {"freeTimes":getFreeTimesByVip(vip, config["dailyFreeTime"]),"time":res["time"],"reward":reward}]);
                                } else {
                                    if (res["value"] > 0) {//还有免费次数
                                        callbackFn(null, ["luckySeven", true, {"freeTimes":res["value"],"time":res["time"],"reward":reward}]);
                                    } else {
                                        callbackFn(null, ["luckySeven", true, {"freeTimes":0,"time":res["time"],"reward":reward}]);
                                    }
                                }
                            }
                        });
                    }
                });
            } else {//关闭
                callbackFn(null, ["luckySeven", false, null])
            }
        } else {
            callbackFn(null, ["luckySeven", false, null])
        }
    })
}

/**
 * 根据vip获取拉拔免费次数
 * @param vip
 * @param config
 * @returns {*}
 */
function getFreeTimesByVip(vip, config) {
    if (config.hasOwnProperty(vip))
        return config[vip];
    return 0;
}

/**
 * 限时活动奖励
 * @param userUid
 * @param callbackFn
 */
function timeLimitActivityReward(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "timeLimitActivity", function(err, res) {
        if (res != null) {
            var activityConfigData = res;
            var isOpen = activityConfigData[0];
            if (isOpen !== true) {
                callbackFn(null, ["timeLimitActivity", false, null]);
            } else {
                timeLimitActivity.hasRewardToGet(userUid, function(rewardCnt){
                    callbackFn(null, ["timeLimitActivity", true, (rewardCnt > 0) ? rewardCnt : null]);
                });
            }
        } else {
            callbackFn(null, ["timeLimitActivity", false, null]);
        }
    });
}

/**
 * 评价奖励
 * @param userUid
 * @param callbackFn
 */
function review(userUid, callbackFn) {

    activityConfig.getConfig(userUid, "review", function(err, res) {
        if (res != null) {
            var activityConfigData = res;
            var isOpen = activityConfigData[0];
            if (isOpen !== true) {
                callbackFn(null, ["review", false, {}]);
            } else {
                callbackFn(null, ["review", true, {}]);
            }
        } else {
            callbackFn(null, ["review", false, {}]);
        }
    });
//
//    userVariable.getVariable(userUid, "review", function(err, res) {
//        if (err || res == 1) {
//            callbackFn(null, ["review", false, {}]);
//        } else {
//            callbackFn(null, ["review", true, {}]);
//        }
//    });
}


/**
 * 限时商城
 * @param userUid
 * @param callbackFn
 */
function limitMall(userUid, callbackFn) {
    timeLimitMall.isActivityOpen(userUid, function(err, isOpen){
        if (err) callbackFn(err);
        else {
            callbackFn(null, ["timeLimitShop", isOpen, {}]);
        }
    });
}

/**
* 大富翁
* @param userUid
* @param callbackFn
*/
function monopoly(userUid, callbackFn) {
    callbackFn(null, ["monopoly", true, {}]);
}

/**
 * 单笔充值活动
 * @param userUid
 * @param callbackFn
 */
function oneRecharge(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "oneRecharge", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["oneRecharge", false, null]);
        } else {
            if (res[0]) {
                practiceOneRecharge.hasRewardToGet(userUid, function(rewardCnt){
                    callbackFn(null, ["oneRecharge", true, (rewardCnt > 0) ? rewardCnt : null]);
                });
            } else {
                callbackFn(null, ["oneRecharge", false, null]);
            }
        }
    });
}


/**
 * 单笔充值在某区间内
 * @param userUid
 * @param callbackFn
 */
function oneRecharge3(userUid, callbackFn) {

    activityConfig.getConfig(userUid, "oneRecharge3", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["oneRecharge3", false, null]);
        } else {
            if (res[0]) {
                var returnData = {};
                returnData["data"] = res[2];
                returnData["sTime"] = res[4];
                returnData["eTime"] = res[5];
                callbackFn(null, ["oneRecharge3", true, returnData]);
            } else {
                callbackFn(null, ["oneRecharge3", false, null]);
            }
        }
    });

}


/**
 * 单笔充值首次
 * @param userUid
 * @param callbackFn
 */
function oneRecharge4(userUid, callbackFn) {

    activityConfig.getConfig(userUid, "oneRecharge4", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["oneRecharge4", false, null]);
        } else {
            if (res[0]) {
                var returnData = {};
                returnData["data"] = res[2];
                returnData["sTime"] = res[4];
                returnData["eTime"] = res[5];
                callbackFn(null, ["oneRecharge4", true, returnData]);
            } else {
                callbackFn(null, ["oneRecharge4", false, null]);
            }
        }
    });
}



/**
 * 单笔充值活动2
 * @param userUid
 * @param callbackFn
 */
function oneRecharge2(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "oneRecharge2", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["oneRecharge2", false, null]);
        } else {
            if (res[0]) {
                oneRecharge2Mod.hasRewardToGet(userUid, function(rewardCnt){
                    callbackFn(null, ["oneRecharge2", true, (rewardCnt > 0) ? rewardCnt : null]);
                });
            } else {
                callbackFn(null, ["oneRecharge2", false, null]);
            }
        }
    });
}

/**
 * 每日累计充值
 * @param userUid
 * @param callbackFn
 */
function dailyCumulativeRecharge(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "dailyTotalRecharge", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["dailyTotalRecharge", false, null]);
        } else {
            if (res[0]) {
                dailyRecharge.hasRewardToGet(userUid, function(rewardCnt){
                    callbackFn(null, ["dailyTotalRecharge", true, (rewardCnt > 0) ? rewardCnt : null]);
                });
            } else {
                callbackFn(null, ["dailyTotalRecharge", false, null]);
            }
        }
    });
}

/**
 * 每日累计消费
 * @param userUid
 * @param callbackFn
 */
function dailyCumulativeConsume(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "dailyTotalConsume", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["dailyTotalConsume", false, null]);
        } else {
            if (res[0]) {
                dailyConsume.hasRewardToGet(userUid, function(rewardCnt){
                    callbackFn(null, ["dailyTotalConsume", true, (rewardCnt > 0) ? rewardCnt : null]);
                });
            } else {
                callbackFn(null, ["dailyTotalConsume", false, null]);
            }
        }
    });
}

/**
 * 能量晋阶
 * @param userUid
 * @param callbackFn
 */
function powerBridging(userUid, callbackFn) {
    callbackFn(null, ["enegyBall", true, {}]);
}

/**
 * 累积消费
 * @param userUid
 * @param callbackFn
 */
function totalConsume(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "totalConsume", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["totalConsume", false, null]);
        } else {
            if (res[0]) {
                practiceTotalConsume.hasRewardToGet(userUid, function(rewardCnt){
                    callbackFn(null, ["totalConsume", true, (rewardCnt > 0) ? rewardCnt : null]);
                });
            } else {
                callbackFn(null, ["totalConsume", false, null]);
            }
        }
    });
}

/**
 * 累积充值
 * @param userUid
 * @param callbackFn
 */
function totalRecharge(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "totalRecharge", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["totalRecharge", false, null]);
        } else {
            if (res[0]) {
                practiceRecharge.hasRewardToGet(userUid, function(rewardCnt){
                    callbackFn(null, ["totalRecharge", true, (rewardCnt > 0) ? rewardCnt : null]);
                });
            } else {
                callbackFn(null, ["totalRecharge", false, null]);
            }
        }
    });
}

/**
 * 成长基金
 * @param userUid
 * @param callbackFn
 */
function growthFund(userUid, callbackFn) {
    var rstObj = {};
    var bOpen = true;

    var configData = configManager.createConfig(userUid);
    var fundConfig = configData.getConfig("growth")["fund"];

    userVariable.getVariableTime(userUid, "GrowthFund", function(err, res){
        if (err) {
            callbackFn(null, ["fund", false, rstObj]);
        } else {
            if (res != null) {
                rstObj["joinFund"] = res["value"];
            }

            userVariable.getVariableTime(userUid, "GrowthFundReward", function(err, res){
                if (!err) {
                    if (res != null) {
                        rstObj["fundReward"] = res["value"];

                        var value = parseInt(res["value"]);
                        if (isNaN(value)) value = 0;

                        // 检查奖励是否已经全部领取
                        var rwMap = fundConfig["reward"];
                        if (!rwMap) {
                            bOpen = false;
                            console.error("configError");
                        } else {
                            var index = 0;
                            var allRW = true;
                            for (var key in rwMap) {
                                if (jutil.bitGet(value, index) == 0) {
                                    allRW = false;
                                    break;
                                }
                                ++index;
                            }

                            if (allRW) bOpen = false;
                        }
                    }
                } else {
                    bOpen = false;
                }
                callbackFn(null, ["fund", bOpen, rstObj]);
            });
        }
    });
}

/**
 * 新成长基金(类似于签到)
 * @param userUid
 * @param callbackFn
 */
function growSign(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "growSign", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["growSign", false, null]);
        } else {
            callbackFn(null, ["growSign", res[0], null]);
        }
    });
}

/**
 * 摇钱树
 * @param userUid
 * @param callbackFn
 */
function cashCow(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "cashCow", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["cashCow", false, null]);
        } else {
            callbackFn(null, ["cashCow", res[0], null]);
        }
    })
}

/**
 * 幸运兑换
 * @param userUid
 * @param callbackFn
 */
function luckyConvert(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "luckyConvert", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["luckyConvert", false, null]);
        } else {
            callbackFn(null, ["luckyConvert", res[0], null]);
        }
    })
}

/**
 * 神龙卡片翻翻翻--paradiseSearch
 * @param userUid
 * @param callbackFn
 */
function paradiseSearch(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "paradiseSearch", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["paradiseSearch", false, null]);
        } else {
            callbackFn(null, ["paradiseSearch", res[0], null]);
        }
    })
}


/**
* 神龙祝福（改签）--practiceEndorse
* @param userUid
* @param callbackFn
*/
function practiceEndorse(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "practiceEndorse", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["practiceEndorse", false, null]);
        } else {
            callbackFn(null, ["practiceEndorse", res[0], null]);
        }
    })
}

/**
 * vip黑洞--practiceDarker
 * @param userUid
 * @param callbackFn
 */
function practiceDarker(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "practiceDarker", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["practiceDarker", false, null]);
        } else {
            callbackFn(null, ["practiceDarker", res[0], null]);
        }
    })
}
/**
 * 新拉霸--practiceSlots
 * @param userUid
 * @param callbackFn
 */
function slots(userUid, callbackFn) {
    var sTime = 0;
    var eTime = 0;
    var currentConfig;
    user.getUserDataFiled(userUid, "lv", function (err, res) {
        if (err) {
            callbackFn(err);
        } else {
            var level = res;
            activityConfig.getConfig(userUid, "slots", function (err, res) {
                if (err || res == null) {
                    callbackFn(null, ["slots", false, null]);
                } else {
                    if (res[0]) {
                        sTime = res[4]-0;
                        eTime = sTime + 604800;
                        currentConfig = res[2];
                        if(level < currentConfig["slotsList"]["openSlotsLv"] || jutil.now() >= eTime){//1.等级限制
                            callbackFn(null, ["slots", false, null]);
                        }else{
                            callbackFn(null, ["slots", true, currentConfig]);
                        }
                    } else {
                        callbackFn(null, ["slots", false, null]);
                    }
                }
            });
        }
    });
}
/**
 * 欢乐扭蛋--capsule
 * @param userUid
 * @param callbackFn
 */
function capsule(userUid, callbackFn){
    activityConfig.getConfig(userUid, "capsule", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["capsule", false, null]);
        } else {
            callbackFn(null, ["capsule", res[0], null]);
        }
    });
}
/**
 * 新用户理财计划
 * @param userUid
 * @param callbackFn
 */
function growthFinPlanNewUser(userUid, callbackFn) {
    var rstObj = {};

    var bOpen = true;

    var createTime = 0;

    var configData = configManager.createConfig(userUid);
    var financialConfig = configData.getConfig("growth")["financialPlanNewUser"];

    if(financialConfig==undefined)
    {
        callbackFn(null, ["finPlanNewUser", false, rstObj]);
        return;
    }

    user.getUser(userUid,function(err,res){
        if(err || res == null) callbackFn(null, ["finPlanNewUser", false, rstObj]);
        else{
            createTime = res["createTime"];

            userVariable.getVariableTime(userUid, "GrowthFinPlanNewUser", function(err, res){
                if (err) {
                    callbackFn(null, ["finPlanNewUser", false, rstObj]);
                } else {
                    if (res != null) {
                        rstObj["joinFinPlanNewUser"] = res["value"];

                        // 加入天数
                        if(jutil.compTimeDay(jutil.now(), res["time"])) {
                            rstObj["joinDays"] = 0;
                        }else{
                            var joinDays = Math.ceil((jutil.todayTime() - res["time"])/86400);
                            if(joinDays>0){
                                rstObj["joinDays"] = joinDays;
                            }else{
                                rstObj["joinDays"] = 0;
                            }
                        }
                    }

                    userVariable.getVariableTime(userUid, "GrowthFinPlanNewUserReward", function(err, res){
                        if (!err) {
                            if (res != null) {
                                rstObj["finPlanNewUserReward"] = res["value"];

                                var value = parseInt(res["value"]);
                                if (isNaN(value)) value = 0;

                                // 检查奖励是否已经全部领取
                                var rwMap = financialConfig["reward"];
                                if (!rwMap) {
                                    bOpen = false;
                                    console.error("configError");
                                } else {
                                    var index = 0;
                                    var allRW = true;
                                    for (var key in rwMap) {
                                        if (jutil.bitGet(value, index) == 0) {
                                            allRW = false;
                                            break;
                                        }
                                        ++index;
                                    }

                                    if (allRW) bOpen = false;
                                }
                            }else{// 未加入，创角是否在3天内
                                var checkDay =  Math.ceil((jutil.now() - createTime)/86400);
                                var configDay = financialConfig["days"] - 0;
                                if(checkDay>configDay){
                                    bOpen = false;
                                }
                            }
                        } else {
                            bOpen = false;
                        }

                        callbackFn(null, ["finPlanNewUser", bOpen, rstObj]);
                    });
                }
            });
        }
    });

}


/**
* 团购活动
* @param userUid
* @param callbackFn
*/
function groupPurchase(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "groupPurchase", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["groupPurchase", false, null]);
        } else {
            callbackFn(null, ["groupPurchase", res[0], null]);
        }
    });
}
/**
 * 团购活动2(跨服)
 * @param userUid
 * @param callbackFn
 */
function groupPurchase2(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "groupPurchase2", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["groupPurchase2", false, null]);
        } else {
            callbackFn(null, ["groupPurchase2", res[0], null]);
        }
    });
}

/**
 * 团购活动3(跨服)
 * @param userUid
 * @param callbackFn
 */
function groupPurchase3(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "groupPurchase3", function (err, res) {
        if (err || res == null) {
            callbackFn(null, ["groupPurchase3", false, null]);
        } else {
            callbackFn(null, ["groupPurchase3", res[0], null]);
        }
    });
}

/**
 * 神位争夺(跨服)
 * @param userUid
 * @param callbackFn
 */
function tabletsCompete(userUid, callbackFn) {
    gsData.getActivityConfig(userUid, gsData.GS_TABLETSCOMPETE, function (err, res) {
        if (err || res == null) {
            callbackFn(null, [gsData.GS_TABLETSCOMPETE, false, null]);
        } else if (res[1] == 0) {
            callbackFn(null, [gsData.GS_TABLETSCOMPETE, false, null]);
        } else {
            callbackFn(null, [gsData.GS_TABLETSCOMPETE, true, null]);
        }
    })
}
/**
 * 魔人 炼金
 * @param userUid
 * @param callbackFn
 */
function alchemy(userUid, callbackFn) {
    user.getUser(userUid, function(err, res) {
        if (err || res == null) callbackFn(err||"dbError");
        else {
            var createTime = res["createTime"] - 0;
            var startTime = Math.floor(new Date(2014,2,21,0,0).getTime() / 1000);
            if (createTime < startTime) createTime = startTime;
            if (jutil.now() - createTime > 345600) { //4天有效期
                callbackFn(null, ["alchemy", false, null]);
            } else {
                var configData = configManager.createConfig(userUid);
                var mainConfig = configData.getConfig("alchemy");
                var times = Object.keys(mainConfig).length;
                userVariable.getVariableTime(userUid, "metals", function(err, res) {
                    if (err) callbackFn(err);
                    else {
                        var currentTimes = (res == null) ? 1: res["value"]; //已完成次数
                        if (currentTimes > times) {
                            callbackFn(null, ["alchemy", false, null]);
                        } else {
                            getAlchemyNews(userUid, function(err, res) {
                                var newsList = [];
                                if (res != null) {
                                    for (var i = 0; i < res.length; i++) {
                                        var mInfo = res[i].split("|");
                                        newsList.push({"name":mInfo[0], "count":mInfo[1]});
                                    }
                                }
                                callbackFn(null, ["alchemy", true, {
                                    "sTime":createTime,
                                    "eTime":createTime + 345600,
                                    "current":currentTimes,
                                    "news":newsList
                                }]);
                            });
                        }
                    }
                });
            }
        }
    });
}


function monthCard(userUid, callbackFn){
    userVariable.getVariableTime(userUid,"monthCard",function(err,res) {
        if (err) callbackFn(err);
        else {
            var mRewardTime = (res == null)?0:(res['time'] || 0);
            var isGet = res == null || mRewardTime > jutil.todayTime()?true:false;
            callbackFn(null, ["monthCard", true, {"status":isGet,"rewardTime":mRewardTime}]);
        }
    });
}


function quarterCard(userUid, callbackFn){
    userVariable.getVariableTime(userUid,"quarterCard",function(err,res) {
        if (err) callbackFn(err);
        else {
            var mRewardTime = (res == null)?0:(res['time'] || 0);
            var isGet = res == null || mRewardTime > jutil.todayTime()?true:false;
            callbackFn(null, ["quarterCard", true, {"status":isGet,"rewardTime":mRewardTime}]);
        }
    });
}



/**
 * 取吃豆 (吃鸡) 数据
 * @param userUid
 * @param callbackFn
 */
function eatbean(userUid,callbackFn) {
    var mValue = {};
    userVariable.getVariableTime(userUid,"eatbean12",function(err,res) {
        if (err) callbackFn(err);
        else {
            mValue["eatbean12"] = (res == null)?0:res["time"];
            userVariable.getVariableTime(userUid,"eatbean18",function(err,res) {
                if (err) callbackFn(err);
                else {
                    mValue["eatbean18"] = (res == null)?0:res["time"];
                    mValue["multiple"] = 1;
                    activityConfig.getConfig(userUid, "eatBean", function(err, res) {
                        var eatBeanConfig = res;
                        if (eatBeanConfig[0] == true) {
                            mValue["multiple"] = 2;
                        } else {
                            mValue["multiple"] = 1;
                        }
                        callbackFn(null,["eatBean",true,mValue]);
                    });
                }
            });
        }
    });
}

function catalyst(userUid, callbackFn) {
    user.getUserDataFiled(userUid, "lv", function (err, res) {
        if (err) {
            callbackFn(err);
        } else {
            var level = res;
            activityConfig.getConfig(userUid, "main", function (err, res) {
                var jsonConfig = res[3];
                if (level > jsonConfig["catalystOpen"]) {
                    callbackFn(null, ["catalyst", true, null]);
                } else {
                    callbackFn(null, ["catalyst", false, null]);
                }
            });
        }
    });
}

/**
 * 取参拜数据
 * @param userUid
 * @param callbackFn
 */
function daily(userUid,callbackFn) {
    getDailyData(userUid,function(err,res) {
        if (err) callbackFn(err);
        else {
            callbackFn(null,["daily",true,res["dayData"]]);
        }
    });
}


/**
 * 取升级奖励数据 （升级送元宝，VIP）
 */
function levelUpReward(userUid,callbackFn) {
    userVariable.getVariable(userUid,"luRewardReceive",function(err,res) {
        if (err) callbackFn(err);
        else {
            var mValue = (res || 0) - 0;
            var allReceived = jutil.newBit(1,1,1,1,1,1,1,1);
            if (mValue >= allReceived) { //如果已全部领取
                callbackFn(null,["levelUpReward",false,0]);
            } else {
                var returnData = {};
                returnData["3"] = jutil.bitGet(mValue,0);
                returnData["5"] = jutil.bitGet(mValue,1);
                returnData["10"] = jutil.bitGet(mValue,2);
                returnData["15"] = jutil.bitGet(mValue,3);
                returnData["20"] = jutil.bitGet(mValue,4);
                returnData["25"] = jutil.bitGet(mValue,5);
                returnData["30"] = jutil.bitGet(mValue,6);
                returnData["35"] = jutil.bitGet(mValue,7);
                callbackFn(null,["levelUpReward",true,returnData]);
            }
        }
    });
}



/**
 * 连续登录奖励
 * @param userUid
 * @param callbackFn
 */
function continuousLogin(userUid, callbackFn) {
    userVariable.getVariableTime(userUid, "ctLogin", function(err, res) {
        if (err) callbackFn(err);
        else {
            var mValue = 0;
            if (res != null && res["value"] != null) {
                mValue = res["value"] - 0;
            }
            var allReceived = parseInt("1111111",2);
            if (mValue >= allReceived) {
                callbackFn(null,["ctLogin",false,0]);
            } else {
                var returnData = {};
                returnData[0] = jutil.bitGet(mValue,0);
                returnData[1] = jutil.bitGet(mValue,1);
                returnData[2] = jutil.bitGet(mValue,2);
                returnData[3] = jutil.bitGet(mValue,3);
                returnData[4] = jutil.bitGet(mValue,4);
                returnData[5] = jutil.bitGet(mValue,5);
                returnData[6] = jutil.bitGet(mValue,6);


                userVariable.getVariableTime(userUid, "loginLog", function(err, res) {
                    if (err) callbackFn(err);
                    else {
                        var mLog = res || {"value":1,"time":0};
                        var mLogValue = mLog["value"] - 0;
                        callbackFn(null,["ctLogin",true,{"value":returnData,"days":mLogValue}]);
                    }
                });
            }
        }
    });
}




/**
 * 取点拨数据（单体指点）
 * @param userUid
 * @param callbackFn
 */
function teachData(userUid,callbackFn) {
    teach.getTeachList(userUid,function(err,res) {
        if (err) callbackFn(err);
        else {
            if (res == null || res.length == 0) {
                callbackFn(null,["teach",false,0]);
            } else {
                var data = res.slice(0, 100);
                callbackFn(null,["teach",true,data]);
            }
        }
    });
}


/**
 * 取指点数据
 * @param userUid
 * @param callbackFn
 */
function worldBossTeachData(userUid,callbackFn) {
    teach.getWorldBossTeachList(userUid,function(err,res) {
        if (err) callbackFn(err);
        else {
            if (res == null || res.length == 0) {
                callbackFn(null,["worldBossTeach",false,0]);
            } else {
                callbackFn(null,["worldBossTeach",true,res]);
            }
        }
    });
}

/**
 * 每日必买
 * @param userUid
 * @param callbackFn
 */
function dailyMustRecharge(userUid, callbackFn){
    activityConfig.getConfig(userUid, "dailyMustRecharge", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["dailyMustRecharge", false, null]);
        } else {
            callbackFn(null, ["dailyMustRecharge", res[0], null]);
        }
    });
}

/**
 * 砸金蛋
 * @param userUid
 * @param callbackFn
 */
function smashEgg(userUid, callbackFn){
    activityConfig.getConfig(userUid, "smashEgg", function(err, res){
        callbackFn(null, ["smashEgg", !err && res != null && res[0], null]);
    });
}

/**
* 夺宝奇兵
* @param userUid
* @param callbackFn
*/
function practiceCross(userUid, callbackFn){
    activityConfig.getConfig(userUid, "practiceCross", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["practiceCross", false, null]);
        } else {
            callbackFn(null, ["practiceCross", res[0], null]);
        }
    });
}

/**
 * 金币摩天轮
 * @param userUid
 * @param callbackFn
 */
function wheel(userUid, callbackFn){
    activityConfig.getConfig(userUid, "wheel", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["wheel", false, null]);
        } else {
            callbackFn(null, ["wheel", res[0], null]);
        }
    });
}

/**
 * 刮刮乐
 * @param userUid
 * @param callbackFn
 */
function scratch(userUid, callbackFn){
    activityConfig.getConfig(userUid, "scratch", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["scratch", false, null]);
        } else {
            callbackFn(null, ["scratch", res[0], null]);
        }
    });
}

/**
 * 神龟射射射
 * @param userUid
 * @param callbackFn
 */
function fire(userUid, callbackFn){
    activityConfig.getConfig(userUid, "fire", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["fire", false, null]);
        } else {
            callbackFn(null, ["fire", res[0], null]);
        }
    });
}
/**
 * 限时抽将
 * @param userUid
 * @param callbackFn
 */
function limitSummon(userUid, callbackFn){
    activityConfig.getConfig(userUid, "limitSummon", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["limitSummon", false, null]);
        } else {
            callbackFn(null, ["limitSummon", res[0], null]);
        }
    });
}
/**
 * vip俱乐部
 * @param userUid
 * @param callbackFn
 */
function vipClub(userUid, callbackFn){
    activityConfig.getConfig(userUid, "vipClub", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["vipClub", false, null]);
        } else {
            callbackFn(null, ["vipClub", res[0], null]);
        }
    });
}

/**
 * 赛亚娃娃献礼
 * @param userUid
 * @param callbackFn
 */
function morphPromo(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "morphPromo", function (err, res) {
        if (err || res == null) {
            callbackFn(null, ["morphPromo", false, null]);
        } else {
            callbackFn(null, ["morphPromo", res[0], null]);
        }
    });
}

/**
 * 赛亚巨献
 * @param userUid
 * @param callbackFn
 */
function messiah(userUid, callbackFn){
    activityConfig.getConfig(userUid, "messiah", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["messiah", false, null]);
        } else {
            callbackFn(null, ["messiah", res[0], null]);
        }
    });
}

/**
 * 赛亚娃娃献礼
 * @param userUid
 * @param callbackFn
 */
function tribute(userUid, callbackFn){
    activityConfig.getConfig(userUid, "tribute", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["tribute", false, null]);
        } else {
            callbackFn(null, ["tribute", res[0], null]);
        }
    });
}

/**
 *
 * 练习
 * @param userUid
 * @param callbackFn
 */
function amuse(userUid,callbackFn){
    activityConfig.getConfig(userUid,"amuse",function(err,res){
        if (err || res == null) {
            callbackFn(null, ["amuse", false, null]);
        } else {
            callbackFn(null, ["amuse", res[0], null]);
        }
    });
}
/**
 * 实际参拜数据获取
 * @param userUid
 * @param callbackFn
 */
function getDailyData(userUid, callbackFn) {
    var mValue = {};
    var configData = configManager.createConfig(userUid);
    userVariable.getVariable(userUid,"dailyReceive",function(err,res) { //取参拜领取次数
        if (err) callbackFn(err);
        else {
            var dailyReceive = (res || 0) - 0 ; //取当前是第几次完整参拜
            userVariable.getVariableTime(userUid,"preDaily",function(err,res) { //取上次参拜的次数和时间
                if (err) callbackFn(err);
                else {
                    var preDaily = res || {"value":0,"time":0};
                    var dailyConfig = configData.getConfig("growth")["daily"];
                    var dailyGrowthConfig = dailyConfig["reward"];
                    var currentKey = 0;
                    for (var key in dailyGrowthConfig) {
                        var mItem = dailyGrowthConfig[key];
                        if (dailyReceive + 1 >= mItem["times"] - 0 && dailyReceive + 1 > currentKey) {
                            currentKey = mItem["times"] - 0;
                        }
                    }
                    mValue["completedDay"] = preDaily["value"];
                    mValue["completeDay"] = dailyGrowthConfig[currentKey]["completeDay"];
                    mValue["lastTime"] = preDaily["time"];
                    callbackFn(null,{"dayData":mValue,"dailyReceive":dailyReceive,"dailyIndex":currentKey});
                }
            });
        }
    });
}

function gemCompose(userUid, callbackFn){
    activityConfig.getConfig(userUid, "gemCompose", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["gemCompose", false, null]);
        } else {
            var currentConfig = {"list":[],"sTime":res[4],"eTime":res[5]};
            if(res[2] != null){
                var confitData = configManager.createConfig(userUid);
                var itemConfig = confitData.getConfig("item");
                var defaultDes = confitData.getConfig("mail")["gemCompose"];
                for(var i in res[2]){
                    var des = res[2][i]["des"]?res[2][i]["des"]:defaultDes;
                    var reward = [];
                    for(var j in res[2][i]["reward"]){
                        reward.push(itemConfig[res[2][i]["reward"][j]["id"]]["name"]+"*"+res[2][i]["reward"][j]["count"]);
                    }
                    currentConfig["list"].push({"id":res[2][i]["id"], "des":jutil.toBase64(jutil.formatString(des, [itemConfig[res[2][i]["id"]]["name"], reward.join(',')]))});
                }
            }
            callbackFn(null, ["gemCompose", res[0], currentConfig]);
        }
    });
}

/**
 * 设置参拜数据写入
 * @param userUid
 * @param dailyReceive 参拜领取次数
 * @param preDaily 新的参拜次数和时间
 * @param callbackFn
 */
function setDailyData(userUid, dailyReceive, preDaily, preTime, callbackFn) {
    userVariable.setVariableTime(userUid, "preDaily" , preDaily, preTime, function(err,res) {
        if (err) callbackFn(err);
        else {
            userVariable.setVariable(userUid,"dailyReceive",dailyReceive, function(err,res) {
                callbackFn(null);
            });
        }
    });
}


/**
 * 设置连续登录奖励的某一天为已领取
 * @param userUid
 * @param dayIndex 某天的索引，从0开始
 * @param callbackFn
 */
function setCtLoginData(userUid, dayIndex, callbackFn) {
    userVariable.getVariable(userUid, "ctLogin", function(err, res) {
        if (err) callbackFn(err);
        else {
            var mValue = (res || 0) - 0;
            var mNewValue = jutil.bitSetTrue(mValue, dayIndex);
            userVariable.setVariable(userUid, "ctLogin", mNewValue, function(err, res) {
                if (err) callbackFn(err);
                else callbackFn(null, 1);

            });
        }
    });
}

/**
 * 获取连续登录中某一天的领取状态
 * @param userUid
 * @param dayIndex
 * @param callbackFn
 */
function getCtLoginData(userUid, dayIndex, callbackFn) {
    userVariable.getVariable(userUid, "ctLogin", function(err, res) {
        if (err) callbackFn(err);
        else {
            var mValue = (res || 0) - 0;
            var mNewValue = jutil.bitGet(mValue, dayIndex);
            callbackFn(null, mNewValue);
        }
    });
}


//添加炼金的玩家的news  xxx获得金币等
function addAlchemyNews(userUid, userName, ingot) {
    redis.domain(userUid).l("alchemyNews").leftPush(userName + "|" + ingot , function(err, res) {
        if ( res != null && res > 10) {
            redis.domain(userUid).l("alchemyNews").trim(0, 10);
        }
    });
}

//获取炼玩家的数据
function getAlchemyNews(userUid, callbackFn) {
    redis.domain(userUid).l("alchemyNews").range(0, 10, function(err, res) {
        if (err) {
            callbackFn(err,null);
        } else {
            callbackFn(null,res);
        }
    });
}

/**
 * 得到VipActivityConFig
 * @param userUid
 * @param callbackFn
 */
function getVipActivityData(userUid, callbackFn) {
    //[isOpen, arg, aConfig, jsonConfig, sTime, eTime]
    activityConfig.getConfig(userUid, "vipPackage", function(err, res){
        var result = {};
        if (err || res == null) {
            callbackFn(null, ["vipActivity", false, "vipPackage_dataErr"]);
        } else {
            if (res[0]) {
                result["vipConfig"] = res;
                userVariable.getVariableTime(userUid, "vipActivity", function(err, data) {
                    if (err) {
                        callbackFn(null, ["vipActivity", true, result]);
                    } else {
                        if (data != null && jutil.compTimeDay(data["time"], jutil.now()) == true ) {
                            result["isGet"] = true;
                        }
                        callbackFn(null, ["vipActivity", true, result]);
                    }
                });
            } else {
                callbackFn(null, ["vipActivity", false, null]);
            }
        }
    });
}
/**
 * 得到消费排行活动配置文件
 * @param userUid
 * @param callbackFn
 */
function getCostListActivity(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "costListActivity", function(err, res){
        var result = {};
        if (err || res == null) {
            callbackFn(null, ["costListActivity", false, "costListActivity_dataErr"]);
        } else {
            if (res[0]) {
                callbackFn(null, ["costListActivity", true, res]);
            } else if(jutil.now() >=res[4]*1 && jutil.now() <= (res[5]*1 + 86400)) {
                callbackFn(null, ["costListActivity", true, res]);
            } else {
                callbackFn(null, ["costListActivity", false, null]);
            }
        }
    });
}

/**
 * 得到理财活动配置文件
 * @param userUid
 * @param callbackFn
 */
function getFinancialPlanActivity(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "financialPlan", function(err, res){
        if (err || res == null) {
            callbackFn(null, ["financialPlan", false, null]);
        } else {
            if (res[0]) {
                if (!res[2]) {
                    callbackFn("configError");
                    return;
                }

                var buyConfig = res[2]["1"]; // 取任意配置
                if (!buyConfig) {
                    callbackFn("configError");
                    return;
                }

                var aReward = buyConfig["reward"];
                var daysToGet = Object.keys(aReward).length; // 领奖需要的时间

                var midTime = res[5] - daysToGet * 60 * 60 * 24;
                if (midTime <= res[4]) {
                    console.error("活动时间配置错误，请检查配置【活动总时间=购买时间+奖励领取时间】");
                    callbackFn(null, ["financialPlan", false, null]);
                    return;
                }

                if (jutil.now() > midTime) { // 已经过了购买期，检查玩家有没有购买计划
                    financial.getBuyInfo(userUid, res[4], function(err, buyIdx){
                        if (buyIdx < 0) { // 玩家没有购买，那么他不应该看到这个界面
                            callbackFn(null, ["financialPlan", false, null]);
                        } else { // 玩家购买了计划，那么应该看到领取界面
                            callbackFn(null, ["financialPlan", true, null]);
                        }
                    });
                } else { // 还没有过购买期，所有人能看到购买界面
                    callbackFn(null, ["financialPlan", true, null]);
                }

            } else {
                callbackFn(null, ["financialPlan", false, null]);
            }
        }
    });
}



exports.getPracticeList = getPracticeList;
exports.levelUpReward = levelUpReward;
exports.monopoly = monopoly;
exports.daily = daily;
exports.totalRecharge = totalRecharge;
exports.totalConsume = totalConsume;
exports.oneRecharge = oneRecharge;
exports.continuousLogin = continuousLogin;
exports.growthFund = growthFund;
exports.growSign = growSign;
exports.growthFinPlanNewUser = growthFinPlanNewUser;
exports.tabletsCompete = tabletsCompete;
exports.getDailyData = getDailyData;
exports.setDailyData = setDailyData;
exports.setCtLoginData = setCtLoginData;
exports.getCtLoginData = getCtLoginData;
exports.getAlchemyNews = getAlchemyNews;
exports.addAlchemyNews = addAlchemyNews;
exports.pvpTopCross = pvpTopCross;