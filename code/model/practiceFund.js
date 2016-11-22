/**
 * 基金
 * User: luoxiaobin
 * Date: 14-3-31
 * Time: 上午10:54
 * To change this template use File | Settings | File Templates.
 */

var jutil = require("../utils/jutil");
var user = require("../model/user");
var practice = require("../model/practice");
var async = require("async");
var userVariable = require("../model/userVariable");
var configManager = require("../config/configManager");
var mongoStats = require("../model/mongoStats");


/**
 * 等級到位映射表
 * @type {{15: number, 20: number, 25: number, 30: number, 35: number, 40: number, 45: number}}
 * @private
 */
var _levelToBitIndexMap = {
    "15":0,
    "20":1,
    "25":2,
    "30":3,
    "35":4,
    "40":5,
    "45":6
};

/**
 * 检查奖励是否已领取
 * @param val
 * @param lv
 * @returns {*}
 * @private
 */
function __rewardLevelCheck(val, lv) {

    if (_levelToBitIndexMap.hasOwnProperty(lv)) {
        var index = _levelToBitIndexMap[lv];
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
    if (_levelToBitIndexMap.hasOwnProperty(lv)) {
        var index = _levelToBitIndexMap[lv];
        val = jutil.bitSetTrue(val, index);
    }

    return val;
}



/**
 * 玩家领取基金回报
 * @param userUid
 * @param level
 * @param callbackFn
 * @private
 */
function _reward(userUid, level, callbackFn){

    // 玩家数据
    var userData = null;
    // 玩家新元宝数据
    var newIngotData = null;
    // 奖励标志字
    var rwWord = 0;

    var configData = configManager.createConfig(userUid);
    var fundConfig = configData.getConfig("growth");

    // 领取的元宝数量
    var ingotGet = 0;

    async.auto({

        // 检查是否已加入
        "joinCheck" : function(cb) {
            userVariable.getVariableTime(userUid, "GrowthFund", function(err, res){
                if (err) {
                    cb(err);
                } else {
                    if (res == null || res["value"] == 0) {
                        cb("notJoin");
                    } else {
                        cb(null);
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

        // 檢查用戶等級
        "userLevelCheck":["getUser", "joinCheck", function(cb){
            //var userLevel = configData.userExpToLevel(userData["exp"]);
            if (userData["lv"]-0 >= level) {
                cb(null);
            } else {
                cb("playerLevelNotEnough");
            }
        }],

        // 检查獎勵是否已经领取
        "rwLvCheck" : ["userLevelCheck", function(cb) {
            userVariable.getVariableTime(userUid, "GrowthFundReward", function(err, res){
                if (err) {
                    cb(err);
                } else {
                    if (res == null) {
                        cb("notJoin");
                    } else {
                        rwWord = res["value"];
                        rwWord = parseInt(rwWord);
                        var checkPass = __rewardLevelCheck(rwWord, level);
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
            var rewardConfig = fundConfig["fund"]["reward"];
            var rewardList = rewardConfig[level];
            var rewardItem = rewardList[0];
            if (rewardItem["id"] == "ingot") {
                ingotGet = rewardItem["count"];
                newIngotData = {"ingot":userData["ingot"] * 1 + ingotGet * 1};
                user.updateUser(userUid, newIngotData, function(err, res) {
                    if (err) {
                        console.error(userUid, newIngotData,  err.stack);
                    } else {
                        // 记录元宝获取
                        mongoStats.dropStats("ingot", userUid, '127.0.0.1', null, mongoStats.FUND,ingotGet);
                    }
                    cb(null);
                });
            } else {
                cb("configError");
            }
        }],

        // 更新领奖状态
        "update" : ["reward", function(cb){
            rwWord = __maskRewardWord(rwWord, level);
            userVariable.setVariableTime(userUid, "GrowthFundReward", rwWord, jutil.now(), function(err, res){
                if (err) console.error(userUid, newIngotData,  err.stack);
                cb(null);
            });
        }]

    }, function(err){
        if (err) {
            callbackFn(err);
        } else {
            callbackFn(null, {
                "newUserData":newIngotData,
                "fundReward":rwWord
            });
        }
    });
}

/**
 * 加入基金
 * @param userUid
 * @param callbackFn
 */
function _joinFund(userUid,callbackFn) {

    // 用户数据
    var userData = null;
    // 加入基金需要的元宝
    var joinIngot = 0;
    // 加入基金需要的VIP等级
    var vipNeed = 0;
    //  新元宝数据
    var newIngotData = null;

    // 基金配置
    var fundConfig = configManager.createConfig(userUid).getConfig("growth");

    async.auto({

        // 检查是否已加入
        "joinCheck":function(cb) {
            userVariable.getVariableTime(userUid, "GrowthFund", function(err, res){
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
            joinIngot = fundConfig["fund"]["imeggaCost"];
            vipNeed = fundConfig["fund"]["vipNeed"];
            cb(null);
        },

        // 检查用户是否符合加入条件
        "joinVerify":["joinCheck", "getUser", "getFundJoinIngot", function(cb) {
            var userIngot = userData["ingot"];
            var userVip = userData["vip"];
            if (userIngot >= joinIngot) {
                if (userVip >= vipNeed) {
                    cb(null);
                } else {
                    cb("vipNotEnough");
                }
            } else {
                cb("noRMB");
            }
        }],

        // 加入基金
        "join":["joinVerify", function(cb){
            userVariable.setVariableTime(userUid, "GrowthFundReward", 0, jutil.now(), function(err, res){
                if (err) cb(err);
                else {
                    userVariable.setVariableTime(userUid,"GrowthFund",1,jutil.now(),function(err, res){
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
exports.join = _joinFund;