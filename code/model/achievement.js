/******************************************************************************
 * 成就
 * Create by MR.Luo.
 * Create at 14-8-12.
 *****************************************************************************/

var jutil = require("../utils/jutil");
var redis = require("../alien/db/redis");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var configManager = require("../config/configManager");
var mysql = require("../alien/db/mysql");
var async = require("async");
var mail = require("../model/mail");
var user = require("../model/user");
var userVariable = require("../model/userVariable");
var specialTeam = require("../model/specialTeam");

///////////////////////////////////////////////////////////////////////////////
// DATABASE

/**
 * 查询玩家对应类型的成就数据
 * @param userUid
 * @param type
 * @param callbackFn
 */
function queryData(userUid, type, callbackFn) {
    redis.user(userUid).h("achievement").getJSON(type, function(err, res){
        if (err) callbackFn(err);
        else {
            res = null;
            if (res != null) {
                callbackFn(null, res);
            } else {
                var sql = "SELECT * FROM achievement WHERE userUid = " + mysql.escape(userUid)
                    + " AND type = " + mysql.escape(type);
                mysql.game(userUid).query(sql, function (err, res) {
                    if (err || res == null || res.length == 0) {
                        if (err) console.error(sql, err.stack);
                        callbackFn(err, null);
                    } else {
                        try {res[0]["data"] = JSON.parse(res[0]["data"]);} catch (e){
                            res[0]["data"] = null;
                        }
                        redis.user(userUid).h("achievement").setJSONex(86400, type, res[0], function(){
                            callbackFn(null, res[0]);
                        });
                    }
                });
            }
        }
    });
}

function insertData(userUid, type, data, callbackFn) {
    var sql = 'INSERT INTO achievement SET ?';
    var newData = {};
    newData["userUid"] = userUid;
    newData["type"] = type;
    newData["data"] = JSON.stringify(data);
    newData["updateTime"] = jutil.now();

    mysql.game(userUid).query(sql,newData,function(err,res) {
        if (err) {
            callbackFn(err);
        } else {
            newData["data"] = data;
            redis.user(userUid).h("achievement").setJSONex(86400, type, newData, function(){
                callbackFn(null, newData);
            });
        }
    });
}

function updateData(userUid, type, data, callbackFn) {
    var sql = "UPDATE achievement SET ? WHERE userUid = " + mysql.escape(userUid)
        + " AND type = " + mysql.escape(type);
    var newData = {};
    newData["data"] = JSON.stringify(data);
    newData["updateTime"] = jutil.now();

    mysql.game(userUid).query(sql,newData,function(err,res){
        if (err) {
            callbackFn(err,null);
        } else {
            newData["data"] = data;
            redis.user(userUid).h("achievement").setJSONex(86400, type, newData, function(){
                callbackFn(null, newData);
            });
        }
    });
}

/**
 * 更新数据
 * @param userUid
 * @param score
 * @param data
 * @param callbackFn
 * @private
 */
function __updateData(userUid, type, data, callbackFn) {
    queryData(userUid, type, function(err, res){
        if (err) callbackFn(err);
        else {
            if (res == null) {
                insertData(userUid, type, data, callbackFn);
            } else {
                updateData(userUid, type, data, callbackFn)
            }
        }
    });
}

///////////////////////////////////////////////////////////////////////////////

exports = module.exports = new function() {


    function __getConfig(userUid, type) {
        var configData = configManager.createConfig(userUid);
        var achievementConfig = configData.getConfig("achievement") || {};
        for (var key in achievementConfig) {
            if (achievementConfig.hasOwnProperty(key)) {
                var subConfig = achievementConfig[key];
                if (subConfig["type"] == type) {
                    return subConfig;
                }
            }
        }
        return null;
    }

    function __getConfigLanguage(userUid,type,callBackFun){
        var configData = configManager.createConfig(userUid);

        configData.getConfigLanguage("achievement",userUid, function(err,res){
            var achievementConfig = res || {};

            var subConfig = {};
            for (var key in achievementConfig) {
                if (achievementConfig.hasOwnProperty(key)) {
                    var subConfig = achievementConfig[key];
                    if (subConfig["type"] == type) {
                        break;
                    }
                }
            }

            callBackFun(null,subConfig);
        });
    }

    /**
     * 增加累积完成的成就计数
     * @param userUid
     * @param count
     * @param callbackFn
     * @private
     */
    function __incAchievementNum(userUid, count, callbackFn) {
        __getAchievementNum(userUid, function(num){
            num += count;
            userVariable.setVariableTime(userUid, "AchievementNum", num,
                jutil.now(), function(err, res){
                    if (err) callbackFn(err);
                    else {
                        callbackFn(null, num);
                    }
                });
        });
    }

    /**
     * 获取完成的成就数量
     * @param userUid
     * @param callbackFn
     * @private
     */
    function __getAchievementNum(userUid, callbackFn) {
        userVariable.getVariableTime(userUid, "AchievementNum", function(err, res){
            if (err) callbackFn(0);
            else {
                var num = 0;
                if (res) {
                    num = res["value"] - 0;
                }
                callbackFn(num);
            }
        });
    }

    /**
     * 增加成就奖励数量
     * @param userUid
     * @param count
     * @param callbackFn
     * @private
     */
    function __incAchievementRewardNum(userUid, count, callbackFn) {
        __getAchievementRewardNum(userUid, function(num){
            num += count;
            num = Math.max(0, num);
            userVariable.setVariableTime(userUid, "AchievementRewardNum", num,
                jutil.now(), function(err, res){
                    if (err) callbackFn(err);
                    else {
                        callbackFn(null, num);
                    }
                });
        });
    }

    /**
     * 获取可领取的成就奖励的数量
     * @param userUid
     * @param callbackFn
     * @private
     */
    function __getAchievementRewardNum(userUid, callbackFn) {
        userVariable.getVariableTime(userUid, "AchievementRewardNum", function(err, res){
            if (err) callbackFn(0);
            else {
                var num = 0;
                if (res) {
                    num = res["value"] - 0;
                }
                callbackFn(num);
            }
        });
    }

    /**
     * 同时增加完成的成就和可以领取的奖励数量
     * @param userUid
     * @param count
     * @param callbackFn
     * @private
     */
    function __incAchievementNumAndRewardNum(userUid, count, callbackFn) {
        async.series([
            function(cb) { // 增加成就计数
                __incAchievementNum(userUid, count, function(err, res){
                    if (err) console.error(err);
                    cb(null);
                });
            },
            function(cb) { // 增加可领取奖励计数
                __incAchievementRewardNum(userUid, count, function(err, res){
                    if (err) console.error(err);
                    cb(null);
                });
            }
        ], function(err){
            if (err) callbackFn(err);
            else callbackFn(null);
        });
    }

    ///////////////////////////////////////////////////////////////////////////

    /**
     * 连续数据统计
     * @param userUid
     * @param num
     * @param type
     * @param callbackFn
     * @private
     */
    function __continueTimeCount(userUid, num, type, callbackFn) {
        var savedData = null;
        var config = null;
        async.series([
            function(cb) {
                __getConfigLanguage(userUid, type,function(err,res){
                    config = res;
                    cb(null);
                });
            },
            function(cb) { // 取配置
                //config = __getConfig(userUid, type);
                if (!config) cb("configError");
                else cb(null);
            },
            function(cb) { // 取数据
                queryData(userUid, type, function(err, res){
                    if (err) cb(err);
                    else {
                        savedData = {};
                        if (res) {
                            savedData = res["data"] || {};
                        }
                        cb(null);
                    }
                });
            },
            function(cb) {
                var itemGet = savedData[type] || 0;
                itemGet += num;

                var rewardMap = savedData["rewardMap"] || {}; // 可领取列表
                var rewardedMap = savedData["rewardedMap"] || {}; // 已领取列表
                var contentArr = config["content"];

                var matchList = [];

                for (var key in contentArr) {
                    if (contentArr.hasOwnProperty(key)) {
                        var subContent = contentArr[key];
                        var complete = subContent["complete"];
                        if (itemGet >= complete) {
                            matchList.push(complete);
                        }
                    }
                }

                var finishCnt = 0; // 本次完成的成就数量

                for (var i= 0,j=matchList.length;i<j;++i) {
                    var _mapTime = matchList[i];
                    if (!rewardedMap.hasOwnProperty(_mapTime)
                        && !rewardMap.hasOwnProperty(_mapTime)) {
                        rewardMap[_mapTime] = 1;
                        finishCnt++;
                    }
                }

                savedData[type] = itemGet; // 更新获取的S装备
                savedData["rewardMap"] = rewardMap; // 更新奖励列表

                __updateData(userUid, type, savedData, function(err, res){
                    if (err) cb(err);
                    else {
                        if (finishCnt > 0) {
                            // 增加完成的成就数量和可领取的奖励数量
                            __incAchievementNumAndRewardNum(userUid, finishCnt, function(err, res){
                                if (err) console.error(err);
                                cb(null);
                            });
                        } else {
                            cb(null);
                        }
                    }
                });
            }
        ], function(err){
            callbackFn(err);
        });
    }

    /**
     * 最大数据统计
     * @param userUid
     * @param num
     * @param type
     * @param callbackFn
     * @private
     */
    function __maxTimeCount(userUid, num, type, callbackFn) {
        var savedData = null;
        var config = null;
        async.series([
            function(cb) {
                __getConfigLanguage(userUid, type,function(err,res){
                    config = res;
                    cb(null);
                });
            },
            function(cb) { // 取配置
                //config = __getConfig(userUid, type);
                if (!config) cb("configError");
                else cb(null);
            },
            function(cb) { // 取数据
                queryData(userUid, type, function(err, res){
                    if (err) cb(err);
                    else {
                        savedData = {};
                        if (res) {
                            savedData = res["data"] || {};
                        }
                        cb(null);
                    }
                });
            },
            function(cb) {
                var maxTime = num;

                var rewardMap = savedData["rewardMap"] || {}; // 可领取列表
                var rewardedMap = savedData["rewardedMap"] || {}; // 已领取列表
                var contentArr = config["content"];

                var matchList = [];

                for (var key in contentArr) {
                    if (contentArr.hasOwnProperty(key)) {
                        var subContent = contentArr[key];
                        var complete = subContent["complete"];
                        if (maxTime >= complete) {
                            matchList.push(complete);
                        }
                    }
                }

                var finishCnt = 0; // 本次完成的成就数量

                for (var i= 0,j=matchList.length;i<j;++i) {
                    var _mapTime = matchList[i];
                    if (!rewardedMap.hasOwnProperty(_mapTime)
                        && !rewardMap.hasOwnProperty(_mapTime)) { // 对应奖励没有领取且没有加入可领取列表
                        rewardMap[_mapTime] = 1;
                        finishCnt++;
                    }
                }

                savedData[type] = Math.max(maxTime, savedData[type] || 0); // 更新获取的S装备
                savedData["rewardMap"] = rewardMap; // 更新奖励列表

                __updateData(userUid, type, savedData, function(err, res){
                    if (err) cb(err);
                    else {
                        if (finishCnt > 0) {
                            // 增加完成的成就数量和可领取的奖励数量
                            __incAchievementNumAndRewardNum(userUid, finishCnt, function(err, res){
                                if (err) console.error(err);
                                cb(null);
                            });
                        } else {
                            cb(null);
                        }
                    }
                });
            }
        ], function(err){
            callbackFn(err);
        });
    }

    function __oneTimeGet(userUid, id, type, callbackFn) {
        var savedData = null;
        var config = null;
        async.series([
            function(cb) {
                __getConfigLanguage(userUid, type, function(err,res){
                    config = res;
                    cb(null);
                });
            },
            function(cb) { // 取配置
                if (!config) cb("configError");
                else cb(null);
            },
            function(cb) { // 取数据
                queryData(userUid, type, function(err, res){
                    if (err) cb(err);
                    else {
                        savedData = {};
                        if (res) {
                            savedData = res["data"] || {};
                        }
                        cb(null);
                    }
                });
            },
            function(cb) {
                var rewardMap = savedData["rewardMap"] || {}; // 可领取列表
                var rewardedMap = savedData["rewardedMap"] || {}; // 已领取列表
                var contentArr = config["content"];
                var finishCnt = 0;
                for (var key in contentArr) {
                    var subContent = contentArr[key];
                    var complete = subContent["complete"];
                    if (id == complete && rewardMap[id] == undefined && rewardedMap[id] == undefined) {
                        rewardMap[id] = 1;
                        finishCnt = 1;
                    }
                }

                savedData[type] = 0;
                savedData["rewardMap"] = rewardMap; // 更新奖励列表
                __updateData(userUid, type, savedData, function(err, res){
                    if (err) cb(err);
                    else {
                        if (finishCnt > 0) {
                            // 增加完成的成就数量和可领取的奖励数量
                            __incAchievementNumAndRewardNum(userUid, finishCnt, function(err, res){
                                if (err) console.error(err);
                                cb(null);
                            });
                        } else {
                            cb(null);
                        }
                    }
                });
            }
        ], function(err){
            callbackFn(err);
        });
    }

    ///////////////////////////////////////////////////////////////////////////

    /**
     * 通关地图
     * @param userUid
     * @param mapId
     * @param callbackFn
     */
    this.mapComplete = function(userUid, mapId, callbackFn) {
        var savedData = null;
        var config = null;
        async.series([
            function(cb) {
                __getConfigLanguage(userUid, "mapComplete",function(err,res){
                    config = res;
                    cb(null);
                });

            },
            function(cb) { // 取配置
                //config = __getConfig(userUid, "mapComplete");
                if (!config) cb("configError");
                else cb(null);
            },
            function(cb) { // 取数据
                queryData(userUid, "mapComplete", function(err, res){
                    if (err) cb(err);
                    else {
                        savedData = {};
                        if (res) {
                            savedData = res["data"] || {};
                        }
                        cb(null);
                    }
                });
            },
            function(cb) {
                var contentIdx = savedData["contentIdx"] || 0;
                var rewardMap = savedData["rewardMap"] || {}; // 可领取列表
                var rewardedMap = savedData["rewardedMap"] || {}; // 已领取列表
                var contentArr = config["content"];

                var targetMapId = contentArr[contentIdx]["complete"];
                if (mapId != targetMapId) { // 不是这个地图
                    cb("notThisMap");
                    return;
                }

                if (rewardedMap.hasOwnProperty(targetMapId)) { // 已经领取
                    cb("theMapRewardIsAlreadyGet");
                    return;
                }

                contentIdx++; // 取下一个配置

                if (!rewardMap.hasOwnProperty(targetMapId)) { // 加入可领取列表,需要更新数据
                    rewardMap[targetMapId] = 1;
                    savedData["contentIdx"] = Math.min(contentIdx, contentArr.length - 1);
                    savedData["rewardMap"] = rewardMap; // 更新奖励列表
                    __updateData(userUid, "mapComplete", savedData, function(err, res){
                        if (err) cb(err);
                        else {
                            // 增加完成的成就数量和可领取的奖励数量
                            __incAchievementNumAndRewardNum(userUid, 1, function(err, res){
                                if (err) console.error(err);
                                cb(null);
                            });
                        }
                    });
                } else {
                    cb(null);
                }
            }
        ], function(err){
            callbackFn(err);
        });
    };

    /**
     * 参加冒险多少次
     * @param userUid
     * @param time
     * @param callbackFn
     */
    this.mapTime = function(userUid, time, callbackFn) {
        __continueTimeCount(userUid, time, "mapTime", callbackFn);
    };

    /**
     * 清除关卡次数
     * @param userUid
     * @param time
     * @param callbackFn
     */
    this.clearMapTime = function(userUid, time, callbackFn) {
        __continueTimeCount(userUid, time, "clearMapTime", callbackFn);
    };

    /**
     * 获取S装备
     * @param userUid
     * @param time
     * @param callbackFn
     */
    this.equipGet = function(userUid, time, callbackFn) {
        __continueTimeCount(userUid, time, "equipGet", callbackFn);
    };

    /**
     * 强化任意装备到X级
     * @param userUid
     * @param level
     * @param callbackFn
     */
    this.equipLevelUp = function(userUid, level, callbackFn) {
        __maxTimeCount(userUid, level, "equipLevelUp", callbackFn);
    };

    /**
     * 改造任意S装备到X阶
     * @param userUid
     * @param level
     * @param callbackFn
     */
    this.equipRefine = function(userUid, level, callbackFn) {
        __maxTimeCount(userUid, level, "equipRefine", callbackFn);
    };

    /**
     * 获取S伙伴
     * @param userUid
     * @param num
     * @param callbackFn
     */
    this.heroGet = function(userUid, num, callbackFn) {
        __continueTimeCount(userUid, num, "heroGet", callbackFn);
    };

    /**
     * 获取指定伙伴
     * @param userUid
     * @param num
     * @param callbackFn
     */
    this.getHero = function(userUid, heroId, callbackFn) {
        __oneTimeGet(userUid, heroId, "getHero", callbackFn);
    };

    /**
     * 伙伴突破到S阶
     * @param userUid
     * @param level
     * @param callbackFn
     */
    this.breakThrough = function(userUid, level, callbackFn) {
        __maxTimeCount(userUid, level, "breakThrough", callbackFn);
    };

    /**
     * 升级S伙伴到X级
     * @param userUid
     * @param level
     * @param callbackFn
     */
    this.heroLevelUp = function(userUid, level, callbackFn) {
        __maxTimeCount(userUid, level, "heroLevelUp", callbackFn);
    };

    /**
     * S卡片获取
     * @param userUid
     * @param num
     * @param callbackFn
     */
    this.cardGet = function(userUid, num, callbackFn) {
        __continueTimeCount(userUid, num, "cardGet", callbackFn);
    };

    /**
     * 任意S卡片升级
     * @param userUid
     * @param level
     * @param callbackFn
     */
    this.cardLevelUp = function(userUid, level, callbackFn) {
        __maxTimeCount(userUid, level, "cardLevelUp", callbackFn);
    };

    /**
     * 使用卡片收集X次
     * @param userUid
     * @param num
     * @param callbackFn
     */
    this.useBigRoll = function(userUid, num, callbackFn) {
        __continueTimeCount(userUid, num, "useBigRoll", callbackFn);
    };

    /**
     * 激活X个特战队位
     * @param userUid
     * @param num
     * @param callbackFn
     */
    this.specialTeamActivation = function(userUid, num, callbackFn) {
        var type = "specialTeamActivation";
        var savedData = null;
        var config = null;
        var maxPosOpen = 0;
        async.series([
            function(cb) {
                __getConfigLanguage(userUid, type,function(err,res){
                    config = res;
                    cb(null);
                });

            },
            function(cb) { // 取配置
                //config = __getConfig(userUid, type);
                if (!config) cb("configError");
                else cb(null);
            },
            function(cb) { // 取数据
                queryData(userUid, type, function(err, res){
                    if (err) cb(err);
                    else {
                        savedData = {};
                        if (res) {
                            savedData = res["data"] || {};
                        }
                        cb(null);
                    }
                });
            },
            function(cb) { // 获取已经开启的特战队位置
                specialTeam.get(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        if (res != num) {
                            maxPosOpen = Object.keys(res).length;
                        }
                        cb(null);
                    }
                });
            },
            function(cb) {
                var itemGet = savedData[type] || 0;
                maxPosOpen = Math.max(maxPosOpen, itemGet);
                itemGet += num;
                itemGet = Math.min(itemGet, maxPosOpen);

                var rewardMap = savedData["rewardMap"] || {}; // 可领取列表
                var rewardedMap = savedData["rewardedMap"] || {}; // 已领取列表
                var contentArr = config["content"];

                var matchList = [];

                for (var key in contentArr) {
                    if (contentArr.hasOwnProperty(key)) {
                        var subContent = contentArr[key];
                        var complete = subContent["complete"];
                        if (itemGet >= complete) {
                            matchList.push(complete);
                        }
                    }
                }

                var finishCnt = 0; // 本次完成的成就数量

                for (var i= 0,j=matchList.length;i<j;++i) {
                    var _mapTime = matchList[i];
                    if (!rewardedMap.hasOwnProperty(_mapTime)
                        && !rewardMap.hasOwnProperty(_mapTime)) {
                        rewardMap[_mapTime] = 1;
                        finishCnt++;
                    }
                }

                savedData[type] = itemGet; // 更新获取的S装备
                savedData["rewardMap"] = rewardMap; // 更新奖励列表

                __updateData(userUid, type, savedData, function(err, res){
                    if (err) cb(err);
                    else {
                        if (finishCnt > 0) {
                            // 增加完成的成就数量和可领取的奖励数量
                            __incAchievementNumAndRewardNum(userUid, finishCnt, function(err, res){
                                if (err) console.error(err);
                                cb(null);
                            });
                        } else {
                            cb(null);
                        }
                    }
                });
            }
        ], function(err){
            callbackFn(err);
        });
    };

    /**
     * 强化任意特战队位至X级
     * @param userUid
     * @param level
     * @param callbackFn
     */
    this.specialTeamLevelUp = function(userUid, level, callbackFn) {
        __maxTimeCount(userUid, level, "specialTeamLevelUp", callbackFn);
    };

    /**
     * 使用终极召唤X次
     * @param userUid
     * @param num
     * @param callbackFn
     */
    this.ultimateSummonTime = function(userUid, num, callbackFn) {
        __continueTimeCount(userUid, num, "ultimateSummonTime", callbackFn);
    };

    /**
     * 购买基金
     * @param userUid
     * @param callbackFn
     */
    this.fundBuy = function(userUid, callbackFn) {
        var savedData = null;
        var config = null;
        async.series([
            function(cb) {
                __getConfigLanguage(userUid, "fundBuy",function(err,res){
                    config = res;
                    cb(null);
                });
            },
            function(cb) { // 取配置
                //config = __getConfig(userUid, "fundBuy");
                if (!config) cb("configError");
                else cb(null);
            },
            function(cb) { // 取数据
                queryData(userUid, "fundBuy", function(err, res){
                    if (err) cb(err);
                    else {
                        savedData = {};
                        if (res) {
                            savedData = res["data"] || {};
                        }
                        cb(null);
                    }
                });
            },
            function(cb) {
                var alreadyBuy = savedData["alreadyBuy"] || false;
                var rewardMap = savedData["rewardMap"] || {}; // 可领取列表
                var rewardedMap = savedData["rewardedMap"] || {};
                var contentArr = config["content"];
                var contentKey = contentArr[0]["complete"];

                if (rewardedMap.hasOwnProperty(contentKey)) { // 奖励已经被领取
                    cb("alreadyGet");
                    return;
                }

                if (!alreadyBuy) { // 加入可领取列表,需要更新数据
                    rewardMap[contentKey] = 1;
                    savedData["alreadyBuy"] = true;
                    savedData["rewardMap"] = rewardMap; // 更新奖励列表
                    __updateData(userUid, "fundBuy", savedData, function(err, res){
                        if (err) cb(err);
                        else {
                            // 增加完成的成就数量和可领取的奖励数量
                            __incAchievementNumAndRewardNum(userUid, 1, function(err, res){
                                if (err) console.error(err);
                                cb(null);
                            });
                        }
                    });
                } else {
                    cb(null);
                }
            }
        ], function(err){
            callbackFn(err);
        });
    };

    /**
     * 购买高级月卡
     * @param userUid
     * @param callbackFn
     */
    this.moonCardBuy = function(userUid, callbackFn) {
        __continueTimeCount(userUid, 1, "moonCardBuy", callbackFn);
    };

    /**
     * 购买季卡
     * @param userUid
     * @param callbackFn
     */
    this.quarterCardBuy = function(userUid, callbackFn) {
        __continueTimeCount(userUid, 1, "quarterCardBuy", callbackFn);
    };

    /**
     * 累积登录
     * @param userUid
     * @param callbackFn
     */
    this.totalLogin = function(userUid, callbackFn) {
        __continueTimeCount(userUid, 1, "totalLogin", callbackFn);
    };

    /**
     * 激战累积胜利
     * @param userUid
     * @param num
     * @param callbackFn
     */
    this.pvpRankWinTime = function(userUid, num, callbackFn) {
        __continueTimeCount(userUid, num, "pvpRankWinTime", callbackFn);
    };

    /**
     * 招式抢夺
     * @param userUid
     * @param num
     * @param callbackFn
     */
    this.pvpPatchWinTime = function(userUid, num, callbackFn) {
        __continueTimeCount(userUid, num, "pvpPatchWinTime", callbackFn);
    };

    /**
     * 达到VIP几
     * @param userUid
     * @param level
     * @param callbackFn
     */
    this.vipGet = function(userUid, level, callbackFn) {
        __maxTimeCount(userUid, level, "vipGet", callbackFn);
    };

    /**
     * 购买体力
     * @param userUid
     * @param num
     * @param callbackFn
     */
    this.powerBuyTime = function(userUid, num, callbackFn) {
        __continueTimeCount(userUid, num, "powerBuyTime", callbackFn);
    };

    /**
     * 购买精力
     * @param userUid
     * @param num
     * @param callbackFn
     */
    this.manaBuyTime = function(userUid, num, callbackFn) {
        __continueTimeCount(userUid, num, "manaBuyTime", callbackFn);
    };

    /**
     * 获得S品质的绝技
     * @param userUid
     * @param num
     * @param callbackFn
     */
    this.skillGet = function(userUid, num, callbackFn) {
        __continueTimeCount(userUid, num, "skillGet", callbackFn);
    };

    /**
     * 升级仍以S品质绝技
     * @param userUid
     * @param level
     * @param callbackFn
     */
    this.skillLevelUp = function(userUid, level, callbackFn) {
        __maxTimeCount(userUid, level, "skillLevelUp", callbackFn);
    };

    /**
     * 升级队伍等级至X
     * @param userUid
     * @param level
     * @param callbackFn
     */
    this.playerLevelUp = function(userUid, level, callbackFn) {
        __maxTimeCount(userUid, level, "playerLevelUp", callbackFn);
    };

    /**
     * 开S宝箱
     * @param userUid
     * @param num
     * @param callbackFn
     */
    this.boxOpen = function(userUid, num, callbackFn) {
        __continueTimeCount(userUid, num, "boxOpen", callbackFn);
    };

    /**
     * 培养液消耗多少个
     * @param userUid
     * @param num
     * @param callbackFn
     */
    this.foster = function(userUid, num, callbackFn) {
        __continueTimeCount(userUid, num, "foster", callbackFn);
    };

    /**
     * 消耗超神水多少个
     * @param userUid
     * @param num
     * @param callbackFn
     */
    this.superWaterUse = function(userUid, num, callbackFn) {
        __continueTimeCount(userUid, num, "superWaterUse", callbackFn);
    };

    ///////////////////////////////////////////////////////////////////////////

    /**
     * 是否有奖励可以领取
     * @param userUid
     * @param callbackFn
     */
    this.hasRewardToGet = function(userUid, callbackFn) {
        __getAchievementRewardNum(userUid, callbackFn);
    };

    ///////////////////////////////////////////////////////////////////////////

    this.onlyCallOnce = function(userUid, callbackFn) {
        var mThis = this;
        var userData = null;
        var configData = configManager.createConfig(userUid);
        var specialTeamData = null;
        async.series([
            function(cb){ // 检查是否已经调用过
                userVariable.getVariableTime(userUid, "achievement_onlyCallOnce", function(err, res){
                    if (err) cb(err);
                    else {
                        if (res) {
                            cb("alreadyCalled");
                        } else {
                            cb(null);
                        }
                    }
                });
            },
            function(cb) { // 获取用户数据
                user.getUser(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        userData = res;
                        cb(null);
                    }
                });
            },
            function(cb) { // VIP CHECK
                var vip = userData["vip"] - 0;
                mThis.vipGet(userUid, vip, function(){
                    cb(null);
                });
            },
            function(cb) { // LEVEL CHECK
                //var level = configData.userExpToLevel(userData["exp"]);
                mThis.playerLevelUp(userUid, userData["lv"], function(){
                    cb(null);
                });
            },
            function(cb) { // 特战队开启检查
                specialTeam.get(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        specialTeamData = res;
                        if (res != null) {
                            mThis.specialTeamActivation(userUid, Object.keys(res).length, function(){
                                cb(null);
                            });
                        } else {
                            cb(null);
                        }
                    }
                });
            },
            function(cb) { // 特战队突破检测
                if (specialTeamData == null) {
                    cb(null);
                    return;
                }
                async.eachSeries(Object.keys(specialTeamData), function(key, esCb){
                    var stData = specialTeamData[key];
                    if (!stData) {
                        esCb(null);
                    } else {
                        var strong = stData["strong"];
                        mThis.specialTeamLevelUp(userUid, strong, function(){
                            esCb(null);
                        });
                    }
                }, function(err){
                    cb(err);
                });
            },
            function(cb) { // 基金购买检测
                userVariable.getVariableTime(userUid, "GrowthFund", function(err, res){
                    if (err) {
                        cb(err);
                    } else {
                        if (res != null) {
                            if (res["value"] == 1) { // 已经购买基金
                                mThis.fundBuy(userUid, function(){
                                    cb(null);
                                });
                            }
                            else cb(null);
                        } else {
                            cb(null);
                        }
                    }
                });
            },
            function(cb) {
                userVariable.setVariableTime(userUid, "achievement_onlyCallOnce", 1, jutil.now(), function(err, res){
                    if (err) console.error(err);
                    cb(null);
                });
            }
        ], function(err){
            callbackFn(err);
        });
    };

    ///////////////////////////////////////////////////////////////////////////

    this.getData = queryData;
    this.getConfig = __getConfig;
    this.getConfigLanguage = __getConfigLanguage;
    this.updateData = __updateData;
    this.getAchievementNum = __getAchievementNum;
    this.getAchievementRewardNum = __getAchievementRewardNum;
    this.incAcchievementRewardNum = __incAchievementRewardNum;
};