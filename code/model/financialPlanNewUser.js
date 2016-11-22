/******************************************************************************
 * 创角3天新用户理财计划
 * Create by peter.wang.
 * Create at 14-10-11.
 *****************************************************************************/
var jutil = require("../utils/jutil");
var user = require("../model/user");
var practice = require("../model/practice");
var async = require("async");
var userVariable = require("../model/userVariable");
var configManager = require("../config/configManager");
var mongoStats = require("../model/mongoStats");


/**
 * 位映射表
 * @type {{"1":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7}}
 * @private
 */

var _dayToBitIndexMap = {};

function __createBitIndexMap(userUid){
    if(!_dayToBitIndexMap.hasOwnProperty(1)){
        var configData = configManager.createConfig(userUid);
        var planConfig = configData.getConfig("growth")["financialPlanNewUser"];
        var rewardList = planConfig["reward"]
        for(var key in rewardList){
            _dayToBitIndexMap[key] = key;
        }
    }
}

/**
 * 检查奖励是否已领取
 * @param val
 * @param lv
 * @returns {*}
 * @private
 */
function __rewardLevelCheck(val, lv) {
    if (_dayToBitIndexMap.hasOwnProperty(lv)) {
        var index = _dayToBitIndexMap[lv];
        if (jutil.bitGet(val, index) == 0) {
            return true;
        } else {
            return "alreadyReward";
        }
    } else {
        return "configError";
    }
}

/**
 * 标记奖励字
 * @param val
 * @param lv
 * @private
 */
function __maskRewardWord(val, lv) {
    
    if (_dayToBitIndexMap.hasOwnProperty(lv)) {
        var index = _dayToBitIndexMap[lv];
        val = jutil.bitSetTrue(val, index);
    }

    return val;
}



/**
 * 玩家领取奖励
 * @param userUid
 * @param day
 * @param callbackFn
 * @private
 */
function _reward(userUid, day, callbackFn){

    __createBitIndexMap(userUid);

    // 玩家数据
    var userData = null;
    // 玩家新元宝数据
    var newUserData = null;
    // 奖励标志字
    var rwWord = 0;

    var configData = configManager.createConfig(userUid);
    var planConfig = configData.getConfig("growth");

    // 领取的元宝数量
    var ingotGet = 0;

    async.auto({

        // 检查是否已加入，且领取时间day是否正确
        "joinCheck" : function(cb) {
            userVariable.getVariableTime(userUid, "GrowthFinPlanNewUser", function(err, res){
                if (err) {
                    cb(err);
                } else {
                    if (res == null || res["value"] == 0) {
                        cb("notJoin");
                    } else {
                        var checkDay =  Math.ceil((jutil.todayTime() - res["time"])/86400);
                        if(!jutil.compTimeDay(jutil.now(), res["time"]) && checkDay>=day && day>0){
                            cb(null);
                        }else{
                            cb("playerDayError");
                        }
                    }
                }
            });
        },

        // 獲取用戶
        "getUser":function(cb) {
            user.getUser(userUid, function(err, res) {
                if (err || res == null) cb("dbError");
                else {
                    userData = res;
                    cb(null);
                }
            });
        },

        // 检查獎勵是否已经领取
        "rwLvCheck" : ["getUser", "joinCheck", function(cb) {
            userVariable.getVariableTime(userUid, "GrowthFinPlanNewUserReward", function(err, res){
                if (err) {
                    cb(err);
                } else {
                    if (res == null) {
                        cb("notJoin");
                    } else {
                        rwWord = res["value"];
                        rwWord = parseInt(rwWord);
                        var checkPass = __rewardLevelCheck(rwWord, day);
                        if (checkPass === true) {
                            cb(null);
                        } else {
                            cb(checkPass);
                        }
                    }
                }
            });
        }],

        // 发奖励
        "reward" : ["rwLvCheck", function(cb) {
            var rewardConfig = planConfig["financialPlanNewUser"]["reward"];
            var rewardList = rewardConfig[day];

            var errGet = 0;
            var ingotGet = 0;
            var goldGet = 0;
            for(var ikey in rewardList){
                if(rewardList[ikey]["id"]=="ingot"){
                    ingotGet = rewardList[ikey]["count"];
                }else if(rewardList[ikey]["id"]=="gold"){
                    goldGet = rewardList[ikey]["count"];
                }else{
                    errGet = 1;
                }
            }

            if(errGet==0){
                newUserData = {"ingot":userData["ingot"] * 1 + ingotGet * 1, "gold":userData["gold"] * 1 + goldGet * 1};
                user.updateUser(userUid, newUserData, function(err, res) {
                    if (err) {
                        console.error(userUid, newUserData,  err.stack);
                    } else {
                        // 记录元宝获取
                        mongoStats.dropStats("ingot", userUid, '127.0.0.1', null, mongoStats.FUND,ingotGet);
                    }
                    cb(null);
                });
            }else{
                cb("configError");
            }

        }],

        // 更新领奖状态
        "update" : ["reward", function(cb){
            rwWord = __maskRewardWord(rwWord, day);
            userVariable.setVariableTime(userUid, "GrowthFinPlanNewUserReward", rwWord, jutil.now(), function(err, res){
                if (err) console.error(userUid, newUserData,  err.stack);
                cb(null);
            });
        }]

    }, function(err){
        if (err) {
            callbackFn(err);
        } else {
			var returnData = {"newUserData":newUserData,"finPlanNewUserReward":rwWord};
            callbackFn(null, returnData);
        }
    });
}

/**
 * 加入新用户理财计划
 * @param userUid
 * @param callbackFn
 */
function _joinPlanNewUser(userUid,callbackFn) {

    __createBitIndexMap(userUid);

    // 用户数据
    var userData = null;
    // 加入需要的元宝
    var joinIngot = 0;
    //  新元宝数据
    var newIngotData = null;

    // 配置
    var planConfig = configManager.createConfig(userUid).getConfig("growth");

    async.auto({

        // 检查是否已加入
        "joinCheck":function(cb) {
            userVariable.getVariableTime(userUid, "GrowthFinPlanNewUser", function(err, res){
                if (err) {
                    cb(err);
                } else {
                    if (res != null) {
                        if (res["value"] == 1) cb("alreadyJoin");
                        else cb(null);
                    } else {
                        cb(null);
                    }
                }
            });
        },

        // 获取用户
        "getUser":function(cb) {
            user.getUser(userUid, function(err, res) {
                if (err || res == null) cb("dbError");
                else {
                    userData = res;
                    cb(null);
                }
            });
        },

        // 获取加入条件
        "getFundJoinIngot":function(cb) {
            joinIngot = planConfig["financialPlanNewUser"]["price"];
            cb(null);
        },

        // 检查用户是否符合加入条件
        "joinVerify":["joinCheck", "getUser", "getFundJoinIngot", function(cb) {
            var userIngot = userData["ingot"];
            if (userIngot < joinIngot) {
                cb("noRMB");
            }else{
                var createTime = userData["createTime"];
                var checkDay =  Math.ceil((jutil.now() - createTime)/86400);
                var configDay = planConfig["financialPlanNewUser"]["days"] - 0;
                if(checkDay>configDay){
                    cb("outOfTime");
                }else {
                    cb(null);
                }
            }
        }],

        // 加入
        "join":["joinVerify", function(cb){

            userVariable.setVariableTime(userUid, "GrowthFinPlanNewUserReward", 0, jutil.now(), function(err, res){
                if (err) cb(err);
                else {
                    userVariable.setVariableTime(userUid,"GrowthFinPlanNewUser",1,jutil.now(),function(err, res){
                        if (err) {
                            cb(err);
                        } else {
                            cb(null);
                        }
                    });
                }
            });
        }],

        // 扣除用户货币
        "pay":["join", function(cb){
            newIngotData = {"ingot":userData["ingot"] - joinIngot};
            user.updateUser(userUid, newIngotData, function(err, res) {
                if (err) {
                    console.error(userUid, newIngotData,  err.stack);
                } else {
                    // 记录元宝消耗
                    mongoStats.expendStats("ingot", userUid, '127.0.0.1', userData, mongoStats.E_FUND, joinIngot);
                }
                cb(null);
            });
        }]

    }, function(err){
        if (err) {
            callbackFn(err);
        } else {
            callbackFn(null, newIngotData);
        }
    });
}


exports.reward = _reward;
exports.join = _joinPlanNewUser;