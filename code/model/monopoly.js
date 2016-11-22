/**
 * Created with JetBrains WebStorm.
 * User: luoxiaobin
 * Date: 14-4-16
 * Time: 下午5:32
 * To change this template use File | Settings | File Templates.
 */

/******************************************************************************
 * 大富翁
 */

var userVariable = require("../model/userVariable");
var configManager = require("../config/configManager");
var teach = require("../model/teach");
var user = require("../model/user");
var jutil = require("../utils/jutil");
var async = require("async");
var redis = require("../alien/db/redis");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var itemModel = require("../model/item");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");

/******************************************************************************
 * HELPERS
 */


/**
 * 获取玩家大富翁分数
 * @param userUid
 * @param callBackFn
 * @private
 */
function __getScore(userUid, callBackFn) {
    userVariable.getVariableTime(userUid, "monopoly_score", function(err, res){
        if (err) callBackFn(err, 0);
        else {
            var score = 0;
            if (res) {
                score = parseInt(res["value"]);
            }
            if (isNaN(score)) score = 0;
            callBackFn(null, score);
        }
    });
}


/**
 * 修改玩家大富翁分数
 * @param userUid
 * @param iScore    修改分数，正数加分，负数减分
 * @param callbackFn
 * @param curScore  当前分数
 * @private
 */
function __incScore(userUid, iScore, callbackFn, curScore) {

    var setFunc = function(userUid, newScore) {
        userVariable.setVariableTime(userUid, "monopoly_score", newScore, jutil.now(), function(err, res){
            if (err) callbackFn(err);
            else callbackFn(null);
        });
    };

    if (curScore == null || curScore == undefined) {
        __getScore(userUid, function(err, res){
            if (err) callbackFn(err);
            else {
                setFunc(userUid, res + iScore);
            }
        });
    } else {
        setFunc(userUid, curScore + iScore);
    }
}


/**
 * 获取玩家筋斗云数量
 * @param userUid
 * @param callbackFn
 * @private
 */
function __getDice(userUid, callbackFn) {
    itemModel.getItem(userUid, "152501", function(err, res) {
        if (err) callbackFn(err);
        else {
            var count = 0;
            if (res) {
                count = res["number"];
            }
            callbackFn(null, count);
        }
    });
}


/**
 * 更新玩家筋斗云数量
 * @param userUid
 * @param updateNum 需要添加获取扣除的数据
 * @param callbackFn
 * @private
 */
function __updateDice(userUid, updateNum, callbackFn) {
    itemModel.updateItem(userUid, "152501", updateNum, function(err, res) {
        if (err) {
            callbackFn(err);
        }
        callbackFn(null, res);
    });
}


/**
 * 返回0～max的随机整数
 * @param max
 * @returns {number}
 * @private
 */
function __random(max) {
    return Math.round(Math.random() * max);
}


/**
 * 随机获取数组的一个元素
 * @param arr
 * @param prop 元素的概率
 * @returns {*}
 * @private
 */
function __randomElementFromArray(arr, prop) {

    if (arr.length == 1) {
        return arr[0];
    }

    prop = prop || "prob";

    var randomV = Math.floor(Math.random() * 1000) + 1;
    var randMap = {};

    var start = 0;
    for (var i= 0,j=arr.length;i<j;++i) {
        var item = arr[i];
        var cfgV = item[prop] * 1000;

        var min = start + 1;
        var max = cfgV + start;

        randMap[i] = {
            "min" : min,
            "max" : max
        };
        start += cfgV;
    }

    var index = 0;

    for (var key in randMap) {
        var range = randMap[key];
        if (randomV >= range.min && randomV <= range.max) {
            index = key;
            break;
        }
    }

    return arr[index];
}

/**
 * 生成物品配置数据
 * @param userUid
 * @param monopolyConfig
 * @param curScore
 * @param callbackFn
 * @private
 */
function __buildItemMap(userUid, monopolyConfig, curScore, callbackFn) {
    var itemMap = {};

    var itemCellArr = [];

    var cellArr = monopolyConfig["cell"];

    // 前19个配置
    for (var i=0;i<19;i++) {
        var configArr = cellArr[i];
        if (!configArr) {
            callbackFn("configError");
            return;
        }

        itemCellArr.push(__randomElementFromArray(configArr));
    }

    var lastSpecial = false;
    var lastCell = monopolyConfig["lastCell"];

    if (curScore >= lastCell["goodNeedPoint"]) {
        lastSpecial = true;
        itemCellArr.push(__randomElementFromArray(lastCell["good"]));
    } else {
        itemCellArr.push(__randomElementFromArray(lastCell["bad"]));
    }

    itemMap["lastSpecial"] = lastSpecial;
    itemMap["itemList"] = itemCellArr;

    if (lastSpecial) {
        // 扣分
        var decScore = lastCell["goodHitReducePoint"];
        __incScore(userUid, -decScore, function(err, res){
            if (err) callbackFn(err);
            else {
                callbackFn(null, itemMap);
            }
        }, curScore);
    }
    callbackFn(null, itemMap);
}

/**
 * 获取下一次走的随机步数
 * @param monopolyConfig
 * @returns {*}
 * @private
 */
function __getNextStepCount(monopolyConfig) {
    var diceProb = monopolyConfig["diceProb"];
    var randomV = Math.floor(Math.random() * 100) + 1;
    var randMap = {};

    var start = 0;
    for (var key in diceProb) {
        var cfgV = diceProb[key] * 100;

        var min = start + 1;
        var max = cfgV + start;

        randMap[key] = {
            "min" : min,
            "max" : max
        };
        start += cfgV;
    }


    for (key in randMap) {
        var range = randMap[key];
        if (randomV >= range.min && randomV <= range.max) {
            var step = parseInt(key);
            if (isNaN(step)) step = 1;
            return step;
        }
    }

    console.error("计算随机数错误");
    return 1;
}

/**
 * 获取保存的大富翁数据
 * @param userUid
 * @param callbackFn
 * @private
 */
function __getSavedMonopolyData(userUid, callbackFn) {
    redis.user(userUid).s("Monopoly").getObj(function(err, res){
        if (err) callbackFn("dbError");
        else {
            callbackFn(null, res);
        }
    });
}

/**
 * 保存玩家数据
 * @param userUid
 * @param data
 * @param callbackFn
 * @private
 */
function __saveMonopolyData(userUid, data, callbackFn) {
    if (data == null) {
        redis.user(userUid).s("Monopoly").del();
        callbackFn(null, null);
    } else {
        redis.user(userUid).s("Monopoly").setObjex(86400, data, function(err, res){
            if (err) callbackFn("dbError");
            else {
                callbackFn(null, res);
            }
        });
    }

}

/**
 * 给玩家发奖励
 * @param userData
 * @param id
 * @param count
 * @param level
 * @param callbackFn
 * @private
 */
function __rwHandler(userData, id, count, level, callbackFn) {
    var userUid = userData["userUid"];
    var gRes = [];

    mongoStats.dropStats(id, userUid, '127.0.0.1', null, mongoStats.MONOPOLY, count);

    async.series([

        // 发放物品
        function(cb) {

            var dropId = id + "";

            switch(dropId.substr(0,2)){
                case "11":// 技能，一个一个的加

                    var iCnt = 0;

                    async.until(function(){
                        return (iCnt >= count);
                    },function(ucb){
                        modelUtil.addDropItemToDB(id,1,userUid,0,level,function(err,res) {
                            iCnt++;

                            if (err) {
                                console.error(err);
                                ucb(null);
                            }
                            else {
                                gRes.push(res);
                                ucb(null);
                            }
                        });
                    }, function(err){
                        cb(null);
                    });
                    break;

                default:

                    modelUtil.addDropItemToDB(id,count,userUid,0,level,function(err,res) {
                        if (err) cb("dbError");
                        else {
                            gRes.push(res);
                            cb(null);
                        }
                    });
                    break;
            }
        },

        // 添加到每日获取列表
        function(cb) {
            __insertItemToDailyRewardList(userUid, id, count, function(err, res){
                cb(null);
            });
        }

    ], function(err){
        if (err) callbackFn(err);
        else callbackFn(null, gRes);
    });
}

/**
 * 检测是否新的一天
 * @param userUid
 * @param monopolyConfig
 * @param callbackFn
 * @private
 */
function __newDayTest(userUid, monopolyConfig, callbackFn) {

    var lastRWTime = 0;
    var gRes = null;

    async.series([

        // 获取上次发奖时间
        function(cb) {
            userVariable.getVariableTime(userUid, "monopoly_newday", function(err, res){
                if (err) cb(err);
                else {
                    if (res) {
                        lastRWTime = parseInt(res["time"]);
                        if (isNaN(lastRWTime)) lastRWTime = 0;
                    }
                    cb(null);
                }
            });
        },

        // 检查是否同一天
        function(cb) {
            if (jutil.compTimeDay(jutil.now(), lastRWTime)) {
                cb("alreadyReward");
            } else {
                cb(null);
            }
        },

        // 保存新筋斗云
        function(cb) {
            var diceAdd = monopolyConfig["cloudDaily"];
            __updateDice(userUid, diceAdd, function(err, res){
                if (err) cb(err);
                else {
                    gRes = res;
                    cb(null);
                }
            });
        },

        // 设置发奖时间
        function(cb) {
            userVariable.setVariableTime(userUid, "monopoly_newday", 0, jutil.now(), function(err, res){
                cb(null);
            });
        }

    ], function(err){
        if (err && err != "alreadyReward") {
            callbackFn(err);
        } else {
            callbackFn(null, gRes);
        }
    });
}

/**
 * 保存奖励到当日奖励获取列表
 * @param userUid
 * @param item
 * @param itemCount
 * @param callbackFn
 * @private
 */
function __insertItemToDailyRewardList(userUid, item, itemCount, callbackFn){

    var drwMap = null;

    async.series([

        // 获取奖励列表
        function(cb){
            redis.user(userUid).s("Monopoly_DRWMap").getObj(function(err, res){
                if (err) cb("dbError");
                else {
                    drwMap = res;
                    cb(null);
                }
            });
        },

        // 检查时间
        function(cb) {
            if (drwMap && drwMap.hasOwnProperty("lastInsertTime")) {
                var lastInserTime = drwMap["lastInsertTime"];
                if (!jutil.compTimeDay(jutil.now(), lastInserTime)) {
                    drwMap = {};
                }
            }

            cb(null);
        },

        // 插入数据
        function(cb) {
            drwMap = drwMap || {};
            drwMap["itemList"] = drwMap["itemList"] || {};
            var saveItemCount = drwMap["itemList"][item];
            if (isNaN(saveItemCount)) saveItemCount = 0;
            drwMap["itemList"][item] = saveItemCount + itemCount;
            drwMap["lastInsertTime"] = jutil.now();

            redis.user(userUid).s("Monopoly_DRWMap").setObjex(86400, drwMap, function(err, res){
                if (err) cb("dbError");
                else {
                    cb(null);
                }
            });
        }

    ], function(err){
        if (err) callbackFn(err);
        else callbackFn(null);
    });

}

/**
 * 获取每日获取的奖励列表
 * @param userUid
 * @param callbackFn
 * @private
 */
function __getDailyRewardList(userUid, callbackFn){

    var drwMap = null;

    async.series([

        // 获取奖励列表
        function(cb){
            redis.user(userUid).s("Monopoly_DRWMap").getObj(function(err, res){
                if (err) cb("dbError");
                else {
                    drwMap = res || {};
                    cb(null);
                }
            });
        },

        // 检查时间
        function(cb) {
            if (drwMap && drwMap.hasOwnProperty("lastInsertTime")) {
                var lastInserTime = drwMap["lastInsertTime"];
                if (!jutil.compTimeDay(jutil.now(), lastInserTime)) {
                    drwMap = {};
                }
            }

            cb(null);
        }

    ], function(err){
        if (err) callbackFn(err);
        else callbackFn(null, drwMap["itemList"] || {});
    });
}

exports.__getScore = __getScore;
exports.__incScore = __incScore;
exports.__getDice = __getDice;
exports.__updateDice = __updateDice;
exports.__buildItemMap = __buildItemMap;
exports.__getNextStepCount = __getNextStepCount;
exports.__getSavedMonopolyData = __getSavedMonopolyData;
exports.__saveMonopolyData = __saveMonopolyData;
exports.__rwHandler = __rwHandler;
exports.__newDayTest = __newDayTest;
exports.__insertItemToDailyRewardList = __insertItemToDailyRewardList;
exports.__getDailyRewardList = __getDailyRewardList;