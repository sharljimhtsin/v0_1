/******************************************************************************
 * 活跃度
 * Create by MR.Luo.
 * Create at 14-7-31.
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

///////////////////////////////////////////////////////////////////////////////
// DATABASE

function queryData(userUid, callbackFn) {
    redis.user(userUid).s("vitality").getObj(function(err, res){
        if (err) callbackFn(err);
        else {
            if (res != null) {
                callbackFn(null, res);
            } else {
                var sql = "SELECT * FROM vitality WHERE userUid = " + mysql.escape(userUid);
                mysql.game(userUid).query(sql, function (err, res) {
                    if (err || res == null || res.length == 0) {
                        if (err) console.error(sql, err.stack);
                        callbackFn(err, null);
                    } else {
                        try {res[0]["data"] = JSON.parse(res[0]["data"]);} catch (e){
                            res[0]["data"] = null;
                        }
                        redis.user(userUid).s("vitality").setObjex(86400, res[0], function(){
                            callbackFn(null, res[0]);
                        });
                    }
                });
            }
        }
    });
}

function insertData(userUid, score, data, callbackFn) {
    var sql = 'INSERT INTO vitality SET ?';
    var newData = {};
    newData["userUid"] = userUid;
    newData["score"] = score;
    newData["data"] = JSON.stringify(data);
    newData["time"] = jutil.now();

    mysql.game(userUid).query(sql,newData,function(err,res) {
        if (err) {
            callbackFn(err);
        } else {
            newData["data"] = data;
            redis.user(userUid).s("vitality").setObjex(86400, newData, function(){
                callbackFn(null, newData);
            });
        }
    });
}

function updateData(userUid, score, data, callbackFn) {
    var sql = "UPDATE vitality SET ? WHERE userUid = " + mysql.escape(userUid);
    var newData = {};
    newData["score"] = score;
    newData["data"] = JSON.stringify(data);
    newData["time"] = jutil.now();

    mysql.game(userUid).query(sql,newData,function(err,res){
        if (err) {
            callbackFn(err,null);
        } else {
            newData["data"] = data;
            redis.user(userUid).s("vitality").setObjex(86400, newData, function(){
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
function __updateData(userUid, score, data, callbackFn) {
    queryData(userUid, function(err, res){
        if (err) callbackFn(err);
        else {
            if (res == null) {
                insertData(userUid, score, data, callbackFn);
            } else {
                updateData(userUid, score, data, callbackFn)
            }
        }
    });
}

///////////////////////////////////////////////////////////////////////////////

exports = module.exports = new function() {

    /**
     * 获取玩家的活动数据
     * @param userUid
     * @param callbackFn
     */
     function __getData(userUid, callbackFn) {
        queryData(userUid, function(err, res){
            if (err) callbackFn(err);
            else {
                var score = 0;
                var time = 0;
                var data = {}; // configAttr 数据统计
                               // configCAttr 数据统计2
                               // rewardListAttr 奖励数据


                if (res) {
                    score = res["score"] - 0;
                    time = res["time"] - 0;
                    data = res["data"] || {};
                }

                if (!jutil.compTimeDay(jutil.now(), time)) { // 数据已过期
                    data = {};
                    score = 0;
                }

                callbackFn(null, {
                    "score" : score,
                    "data" : data
                });
            }
        });
    }


    /**
     * 帮助函数
     * 判断这个类型是否开启
     * @param userUid
     * @param missionType
     * @param callbackFn
     */
    function __isMissionOpen(userUid, missionType, callbackFn) {
        var configMgr = configManager.createConfig(userUid);
        var mainConfig = configMgr.getConfig("main");
        var vitalityConfig = configMgr.getConfig("vitality");

        var userData = null;
        var isOpen = false;
        var userLevel = 0;
        async.series([
            function(cb) { // CHECK
                if (!mainConfig || !vitalityConfig) {
                    cb("configError");
                } else {
                    cb(null);
                }
            },
            function(cb) { // 获取玩家数据
                user.getUser(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        userData = res;
                        userLevel = userData["lv"];
                        cb(null);
                    }
                });
            },
            function(cb) { // 判断是否开启
                var mission = vitalityConfig["mission"];
                if (!mission) {
                    cb("configError");
                    return;
                }

                var missionCfg = null;
                for (var key in mission) {
                    if (mission.hasOwnProperty(key)) {
                        var subMission = mission[key];
                        if (subMission["missionType"] == missionType) {
                            missionCfg = subMission;
                            break;
                        }
                    }
                }

                if (!missionCfg) {
                    cb("configError");
                    return;
                }

                switch (missionType) {
                    case "bloodBattal":
                        isOpen = userLevel >= (mainConfig["bloodBattleOpen"] || 0);
                        break;
                    case "activityMap":
                        isOpen = userLevel >= (mainConfig["activityMapOpen"] || 0);
                        break;
                    case "zillionaire":
                        isOpen = userLevel >= 12;
                        break;
                    case "worldBoss":
                        isOpen = userLevel >= (mainConfig["worldBossOpen"] || 0);
                        break;
                    case "timeLimitShop":
                        isOpen = userLevel >= (mainConfig["timeLimitShopOpen"] || 0);
                        break;
                    default :
                        break;
                }

                cb(null);
            }
        ], function(err){
            if (err) callbackFn(false);
            else callbackFn(isOpen);
        });
    }

    ///////////////////////////////////////////////////////////////////////////

    /**
     * 统计活跃度数据
     * @param userUid
     * @param missionType
     * @param dataPacket
     * @param callbackFn
     */
    this.vitality = function(userUid, missionType, dataPacket, callbackFn) {
        __missionDispatch(userUid, missionType, dataPacket, callbackFn);
    };

    ///////////////////////////////////////////////////////////////////////////

    /**
     * 获取对应MISSION的配置
     * @param userUid
     * @param missionType
     * @param callbackFn
     * @private
     */
    function __getMissionConfig(userUid, missionType, callbackFn) {
        var configMgr = configManager.createConfig(userUid);
        var configData = configMgr.getConfig("vitality") || {};
        var mission = configData["mission"];
        var reward = configData["reward"];
        if (!mission) {
            callbackFn("configError");
        } else {
            var missionCfg = null;
            for (var key in mission) {
                if (mission.hasOwnProperty(key)) {
                    var subMission = mission[key];
                    if (subMission["missionType"] == missionType) {
                        missionCfg = subMission;
                        break;
                    }
                }
            }
            callbackFn(null, {
                "mission" : missionCfg,
                "reward" : reward
            });
        }
    }

    /**
     * 检查积分奖励
     * @param rewardAttr
     * @param curScore
     * @param rewardConfig
     * @private
     */
    function __checkRewardMask(rewardAttr, curScore, rewardConfig) {
        for (var key in rewardConfig) {
            if (rewardConfig.hasOwnProperty(key)) {
                var subReward = rewardConfig[key];
                var needPoint = subReward["needPoint"];
                if (needPoint <= curScore) { // 当前积分满足奖励项要求
                    if (!rewardAttr.hasOwnProperty(needPoint)) { // 没有被加入MASK
                        rewardAttr[needPoint] = 1; // 当前奖励可以领取
                    }
                }
            }
        }
    }

    /**
     * 消息派发
     * @param userUid
     * @param missionType
     * @param dataPacket
     * @param callbackFn
     * @private
     */
    function __missionDispatch(userUid, missionType, dataPacket, callbackFn) {
        switch (missionType) {
            case "map":
                __mapHandler(userUid, dataPacket, callbackFn);
                break;
            case "foster":
                __fosterHandler(userUid, dataPacket, callbackFn);
                break;
            case "consume":
                __consumeHandler(userUid, dataPacket, callbackFn);
                break;
            case "loginCard":
                __loginCardHandler(userUid, dataPacket, callbackFn);
                break;
            case "shake":
                __shakeCardHandler(userUid, dataPacket, callbackFn);
                break;
            case "daily":
                __dailyHandler(userUid, dataPacket, callbackFn);
                break;
            case "eatBean":
                __eatBeanHandler(userUid, dataPacket, callbackFn);
                break;
            case "zillionaire":
                __zillionaireHandler(userUid, dataPacket, callbackFn);
                break;
            case "bloodBattal":
                __bloodBattalHandler(userUid, dataPacket, callbackFn);
                break;
            case "activityMap":
                __activityMapHandler(userUid, dataPacket, callbackFn);
                break;
            case "enegyBall":
                __enegyBallHandler(userUid, dataPacket, callbackFn);
                break;
            case "worldBoss":
                __worldBossHandler(userUid, dataPacket, callbackFn);
                break;
            case "timeLimitShop":
                __timeLimitShopHandler(userUid, dataPacket, callbackFn);
                break;
            default :
                callbackFn(null);
                break;
        }
    }

    /**
     * 闯关冒险
     * @param userUid
     * @param dataPacket
     * @param callbackFn
     * @private
     */
    function __mapHandler(userUid, dataPacket, callbackFn) {
        __getData(userUid, function(err, res){
            if (err) callbackFn(err);
            else {
                var data = res["data"];
                var configCAttr = data["configCAttr"] || {};
                if (configCAttr.hasOwnProperty("map")) { // 今日的任务已经完成，不再统计数据
                    callbackFn(null);
                    return;
                }

                var rewardListAttr = data["rewardListAttr"] || {};

                var score = res["score"];

                var completeCnt = dataPacket["completeCnt"] || 1;

                var configAttr = data["configAttr"] || {};
                var curCompletedCnt = configAttr["map"] || 0;
                curCompletedCnt = curCompletedCnt + completeCnt; // 计算新的完成次数

                __getMissionConfig(userUid, "map", function(err, res){
                    if (err || res == null) callbackFn("configError");
                    else {
                        var mission = res["mission"]; // 配置
                        var reward = res["reward"]; // 奖励配置

                        var maxCompleteCnt = mission["completeTime"] || 0;
                        var addPoint = mission["addPoint"] || 0;
                        if (curCompletedCnt >= maxCompleteCnt) { // 任务已经完成
                            configCAttr["map"] = true; // 标记为已经完成
                            score += addPoint; // 增加积分
                            __checkRewardMask(rewardListAttr, score, reward); // 检查奖励并设置MASK
                        }
                        configAttr["map"] = Math.min(curCompletedCnt, maxCompleteCnt);;

                        data["configCAttr"] = configCAttr;
                        data["configAttr"] = configAttr;
                        data["rewardListAttr"] = rewardListAttr;

                        __updateData(userUid, score, data, function(err, res){ // 更新数据
                            if (err) callbackFn(err);
                            else {
                                callbackFn(null);
                            }
                        });
                    }
                });
            }
        });
    }

    /**
     * 培养伙伴
     * @param userUid
     * @param dataPacket
     * @param callbackFn
     * @private
     */
    function __fosterHandler(userUid, dataPacket, callbackFn) {
        __getData(userUid, function(err, res){
            if (err) callbackFn(err);
            else {
                var data = res["data"];
                var configCAttr = data["configCAttr"] || {};
                if (configCAttr.hasOwnProperty("foster")) { // 今日的任务已经完成，不再统计数据
                    callbackFn(null);
                    return;
                }

                var rewardListAttr = data["rewardListAttr"] || {};

                var score = res["score"];

                var completeCnt = dataPacket["completeCnt"] || 1;

                var configAttr = data["configAttr"] || {};
                var curCompletedCnt = configAttr["foster"] || 0;
                curCompletedCnt = curCompletedCnt + completeCnt; // 计算新的完成次数

                __getMissionConfig(userUid, "foster", function(err, res){
                    if (err || res == null) callbackFn("configError");
                    else {
                        var mission = res["mission"]; // 配置
                        var reward = res["reward"]; // 奖励配置

                        var maxCompleteCnt = mission["completeTime"] || 0;
                        var addPoint = mission["addPoint"] || 0;
                        if (curCompletedCnt >= maxCompleteCnt) { // 任务已经完成
                            configCAttr["foster"] = true; // 标记为已经完成
                            score += addPoint; // 增加积分
                            __checkRewardMask(rewardListAttr, score, reward); // 检查奖励并设置MASK
                        }
                        configAttr["foster"] = Math.min(curCompletedCnt, maxCompleteCnt);

                        data["configCAttr"] = configCAttr;
                        data["configAttr"] = configAttr;
                        data["rewardListAttr"] = rewardListAttr;

                        __updateData(userUid, score, data, function(err, res){ // 更新数据
                            if (err) callbackFn(err);
                            else {
                                callbackFn(null);
                            }
                        });
                    }
                });
            }
        });
    }

    /**
     * 伊美加币
     * @param userUid
     * @param dataPacket
     * @param callbackFn
     * @private
     */
    function __consumeHandler(userUid, dataPacket, callbackFn) {
        __getData(userUid, function(err, res){
            if (err) callbackFn(err);
            else {
                var data = res["data"];
                var configCAttr = data["configCAttr"] || {};
                if (configCAttr.hasOwnProperty("consume")) { // 今日的任务已经完成，不再统计数据
                    callbackFn(null);
                    return;
                }

                var rewardListAttr = data["rewardListAttr"] || {};

                var score = res["score"];

                var consumeCnt = dataPacket["consumeCnt"] || 0; // 本次消费数量

                var configAttr = data["configAttr"] || {};
                var curConsumeCnt = configAttr["consume"] || 0;
                curConsumeCnt = curConsumeCnt + consumeCnt; // 计算新的消费数量

                __getMissionConfig(userUid, "consume", function(err, res){
                    if (err || res == null) callbackFn("configError");
                    else {
                        var mission = res["mission"]; // 配置
                        var reward = res["reward"]; // 奖励配置

                        var maxCompleteCnt = mission["completeTime"] || 0;
                        var addPoint = mission["addPoint"] || 0;
                        if (curConsumeCnt >= maxCompleteCnt) { // 任务已经完成
                            configCAttr["consume"] = true; // 标记为已经完成
                            score += addPoint; // 增加积分
                            __checkRewardMask(rewardListAttr, score, reward); // 检查奖励并设置MASK
                        }
                        configAttr["consume"] = Math.min(curConsumeCnt, maxCompleteCnt);

                        data["configCAttr"] = configCAttr;
                        data["configAttr"] = configAttr;
                        data["rewardListAttr"] = rewardListAttr;

                        __updateData(userUid, score, data, function(err, res){ // 更新数据
                            if (err) callbackFn(err);
                            else {
                                callbackFn(null);
                            }
                        });
                    }
                });
            }
        });
    }

    /**
     * 签到
     * @param userUid
     * @param dataPacket
     * @param callbackFn
     * @private
     */
    function __loginCardHandler(userUid, dataPacket, callbackFn) {
        __getData(userUid, function(err, res){
            if (err) callbackFn(err);
            else {
                var data = res["data"];
                var configCAttr = data["configCAttr"] || {};
                if (configCAttr.hasOwnProperty("loginCard")) { // 今日的任务已经完成，不再统计数据
                    callbackFn(null);
                    return;
                }

                var rewardListAttr = data["rewardListAttr"] || {};

                var score = res["score"];

                var completeCnt = dataPacket["completeCnt"] || 1;

                var configAttr = data["configAttr"] || {};
                var curCompletedCnt = configAttr["loginCard"] || 0;
                curCompletedCnt = curCompletedCnt + completeCnt; // 计算新的完成次数

                __getMissionConfig(userUid, "loginCard", function(err, res){
                    if (err || res == null) callbackFn("configError");
                    else {
                        var mission = res["mission"]; // 配置
                        var reward = res["reward"]; // 奖励配置

                        var maxCompleteCnt = mission["completeTime"] || 0;
                        var addPoint = mission["addPoint"] || 0;
                        if (curCompletedCnt >= maxCompleteCnt) { // 任务已经完成
                            configCAttr["loginCard"] = true; // 标记为已经完成
                            score += addPoint; // 增加积分
                            __checkRewardMask(rewardListAttr, score, reward); // 检查奖励并设置MASK
                        }
                        configAttr["loginCard"] = Math.min(curCompletedCnt, maxCompleteCnt);

                        data["configCAttr"] = configCAttr;
                        data["configAttr"] = configAttr;
                        data["rewardListAttr"] = rewardListAttr;

                        __updateData(userUid, score, data, function(err, res){ // 更新数据
                            if (err) callbackFn(err);
                            else {
                                callbackFn(null);
                            }
                        });
                    }
                });
            }
        });
    }

    /**
     * 召唤神龙
     * @param userUid
     * @param dataPacket
     * @param callbackFn
     * @private
     */
    function __shakeCardHandler(userUid, dataPacket, callbackFn) {
        __getData(userUid, function(err, res){
            if (err) callbackFn(err);
            else {
                var data = res["data"];
                var configCAttr = data["configCAttr"] || {};
                if (configCAttr.hasOwnProperty("shake")) { // 今日的任务已经完成，不再统计数据
                    callbackFn(null);
                    return;
                }

                var rewardListAttr = data["rewardListAttr"] || {};

                var score = res["score"];

                var completeCnt = dataPacket["completeCnt"] || 1;

                var configAttr = data["configAttr"] || {};
                var curCompletedCnt = configAttr["shake"] || 0;
                curCompletedCnt = curCompletedCnt + completeCnt; // 计算新的完成次数

                __getMissionConfig(userUid, "shake", function(err, res){
                    if (err || res == null) callbackFn("configError");
                    else {
                        var mission = res["mission"]; // 配置
                        var reward = res["reward"]; // 奖励配置

                        var maxCompleteCnt = mission["completeTime"] || 0;
                        var addPoint = mission["addPoint"] || 0;
                        if (curCompletedCnt >= maxCompleteCnt) { // 任务已经完成
                            configCAttr["shake"] = true; // 标记为已经完成
                            score += addPoint; // 增加积分
                            __checkRewardMask(rewardListAttr, score, reward); // 检查奖励并设置MASK
                        }
                        configAttr["shake"] = Math.min(curCompletedCnt, maxCompleteCnt);

                        data["configCAttr"] = configCAttr;
                        data["configAttr"] = configAttr;
                        data["rewardListAttr"] = rewardListAttr;

                        __updateData(userUid, score, data, function(err, res){ // 更新数据
                            if (err) callbackFn(err);
                            else {
                                callbackFn(null);
                            }
                        });
                    }
                });
            }
        });
    }

    /**
     * 占卜
     * @param userUid
     * @param dataPacket
     * @param callbackFn
     * @private
     */
    function __dailyHandler(userUid, dataPacket, callbackFn) {
        __getData(userUid, function(err, res){
            if (err) callbackFn(err);
            else {
                var data = res["data"];
                var configCAttr = data["configCAttr"] || {};
                if (configCAttr.hasOwnProperty("daily")) { // 今日的任务已经完成，不再统计数据
                    callbackFn(null);
                    return;
                }

                var rewardListAttr = data["rewardListAttr"] || {};

                var score = res["score"];

                var completeCnt = dataPacket["completeCnt"] || 1;

                var configAttr = data["configAttr"] || {};
                var curCompletedCnt = configAttr["daily"] || 0;
                curCompletedCnt = curCompletedCnt + completeCnt; // 计算新的完成次数

                __getMissionConfig(userUid, "daily", function(err, res){
                    if (err || res == null) callbackFn("configError");
                    else {
                        var mission = res["mission"]; // 配置
                        var reward = res["reward"]; // 奖励配置

                        var maxCompleteCnt = mission["completeTime"] || 0;
                        var addPoint = mission["addPoint"] || 0;
                        if (curCompletedCnt >= maxCompleteCnt) { // 任务已经完成
                            configCAttr["daily"] = true; // 标记为已经完成
                            score += addPoint; // 增加积分
                            __checkRewardMask(rewardListAttr, score, reward); // 检查奖励并设置MASK
                        }
                        configAttr["daily"] = Math.min(curCompletedCnt, maxCompleteCnt);

                        data["configCAttr"] = configCAttr;
                        data["configAttr"] = configAttr;
                        data["rewardListAttr"] = rewardListAttr;

                        __updateData(userUid, score, data, function(err, res){ // 更新数据
                            if (err) callbackFn(err);
                            else {
                                callbackFn(null);
                            }
                        });
                    }
                });
            }
        });
    }

    /**
     * 吃仙豆
     * @param userUid
     * @param dataPacket
     * @param callbackFn
     * @private
     */
    function __eatBeanHandler(userUid, dataPacket, callbackFn) {
        __getData(userUid, function(err, res){
            if (err) callbackFn(err);
            else {
                var data = res["data"];
                var configCAttr = data["configCAttr"] || {};
                if (configCAttr.hasOwnProperty("eatBean")) { // 今日的任务已经完成，不再统计数据
                    callbackFn(null);
                    return;
                }

                var rewardListAttr = data["rewardListAttr"] || {};

                var score = res["score"];

                var completeCnt = dataPacket["completeCnt"] || 1;

                var configAttr = data["configAttr"] || {};
                var curCompletedCnt = configAttr["eatBean"] || 0;
                curCompletedCnt = curCompletedCnt + completeCnt; // 计算新的完成次数

                __getMissionConfig(userUid, "eatBean", function(err, res){
                    if (err || res == null) callbackFn("configError");
                    else {
                        var mission = res["mission"]; // 配置
                        var reward = res["reward"]; // 奖励配置

                        var maxCompleteCnt = mission["completeTime"] || 0;
                        var addPoint = mission["addPoint"] || 0;
                        if (curCompletedCnt >= maxCompleteCnt) { // 任务已经完成
                            configCAttr["eatBean"] = true; // 标记为已经完成
                            score += addPoint; // 增加积分
                            __checkRewardMask(rewardListAttr, score, reward); // 检查奖励并设置MASK
                        }
                        configAttr["eatBean"] = Math.min(curCompletedCnt, maxCompleteCnt);

                        data["configCAttr"] = configCAttr;
                        data["configAttr"] = configAttr;
                        data["rewardListAttr"] = rewardListAttr;

                        __updateData(userUid, score, data, function(err, res){ // 更新数据
                            if (err) callbackFn(err);
                            else {
                                callbackFn(null);
                            }
                        });
                    }
                });
            }
        });
    }

    /**
     * 大富翁
     * @param userUid
     * @param dataPacket
     * @param callbackFn
     * @private
     */
    function __zillionaireHandler(userUid, dataPacket, callbackFn) {
        __isMissionOpen(userUid, "zillionaire", function(open){
            if (!open) {
                callbackFn("notOpenForUser");
            } else {
                __getData(userUid, function(err, res){
                    if (err) callbackFn(err);
                    else {
                        var data = res["data"];
                        var configCAttr = data["configCAttr"] || {};
                        if (configCAttr.hasOwnProperty("zillionaire")) { // 今日的任务已经完成，不再统计数据
                            callbackFn(null);
                            return;
                        }

                        var rewardListAttr = data["rewardListAttr"] || {};

                        var score = res["score"];

                        var completeCnt = dataPacket["completeCnt"] || 1;

                        var configAttr = data["configAttr"] || {};
                        var curCompletedCnt = configAttr["zillionaire"] || 0;
                        curCompletedCnt = curCompletedCnt + completeCnt; // 计算新的完成次数

                        __getMissionConfig(userUid, "zillionaire", function(err, res){
                            if (err || res == null) callbackFn("configError");
                            else {
                                var mission = res["mission"]; // 配置
                                var reward = res["reward"]; // 奖励配置

                                var maxCompleteCnt = mission["completeTime"] || 0;
                                var addPoint = mission["addPoint"] || 0;
                                if (curCompletedCnt >= maxCompleteCnt) { // 任务已经完成
                                    configCAttr["zillionaire"] = true; // 标记为已经完成
                                    score += addPoint; // 增加积分
                                    __checkRewardMask(rewardListAttr, score, reward); // 检查奖励并设置MASK
                                }
                                configAttr["zillionaire"] = Math.min(curCompletedCnt, maxCompleteCnt);

                                data["configCAttr"] = configCAttr;
                                data["configAttr"] = configAttr;
                                data["rewardListAttr"] = rewardListAttr;

                                __updateData(userUid, score, data, function(err, res){ // 更新数据
                                    if (err) callbackFn(err);
                                    else {
                                        callbackFn(null);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    /**
     * 血战
     * @param userUid
     * @param dataPacket
     * @param callbackFn
     * @private
     */
    function __bloodBattalHandler(userUid, dataPacket, callbackFn) {
        __isMissionOpen(userUid, "bloodBattal", function(open){
            if (!open) {
                callbackFn("notOpenForUser");
            } else {
                __getData(userUid, function(err, res){
                    if (err) callbackFn(err);
                    else {
                        var data = res["data"];
                        var configCAttr = data["configCAttr"] || {};
                        if (configCAttr.hasOwnProperty("bloodBattal")) { // 今日的任务已经完成，不再统计数据
                            callbackFn(null);
                            return;
                        }

                        var rewardListAttr = data["rewardListAttr"] || {};

                        var score = res["score"];

                        var completeCnt = dataPacket["completeCnt"] || 1;

                        var configAttr = data["configAttr"] || {};
                        var curCompletedCnt = configAttr["bloodBattal"] || 0;
                        curCompletedCnt = curCompletedCnt + completeCnt; // 计算新的完成次数

                        __getMissionConfig(userUid, "bloodBattal", function(err, res){
                            if (err || res == null) callbackFn("configError");
                            else {
                                var mission = res["mission"]; // 配置
                                var reward = res["reward"]; // 奖励配置

                                var maxCompleteCnt = mission["completeTime"] || 0;
                                var addPoint = mission["addPoint"] || 0;
                                if (curCompletedCnt >= maxCompleteCnt) { // 任务已经完成
                                    configCAttr["bloodBattal"] = true; // 标记为已经完成
                                    score += addPoint; // 增加积分
                                    __checkRewardMask(rewardListAttr, score, reward); // 检查奖励并设置MASK
                                }
                                configAttr["bloodBattal"] = Math.min(curCompletedCnt, maxCompleteCnt);

                                data["configCAttr"] = configCAttr;
                                data["configAttr"] = configAttr;
                                data["rewardListAttr"] = rewardListAttr;

                                __updateData(userUid, score, data, function(err, res){ // 更新数据
                                    if (err) callbackFn(err);
                                    else {
                                        callbackFn(null);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    /**
     * 活动地图
     * @param userUid
     * @param dataPacket
     * @param callbackFn
     * @private
     */
    function __activityMapHandler(userUid, dataPacket, callbackFn) {
        __isMissionOpen(userUid, "activityMap", function(open){
            if (!open) {
                callbackFn("notOpenForUser");
            } else {
                __getData(userUid, function(err, res){
                    if (err) callbackFn(err);
                    else {
                        var data = res["data"];
                        var configCAttr = data["configCAttr"] || {};
                        if (configCAttr.hasOwnProperty("activityMap")) { // 今日的任务已经完成，不再统计数据
                            callbackFn(null);
                            return;
                        }

                        var rewardListAttr = data["rewardListAttr"] || {};

                        var score = res["score"];

                        var completeCnt = dataPacket["completeCnt"] || 1;

                        var configAttr = data["configAttr"] || {};
                        var curCompletedCnt = configAttr["activityMap"] || 0;
                        curCompletedCnt = curCompletedCnt + completeCnt; // 计算新的完成次数

                        __getMissionConfig(userUid, "activityMap", function(err, res){
                            if (err || res == null) callbackFn("configError");
                            else {
                                var mission = res["mission"]; // 配置
                                var reward = res["reward"]; // 奖励配置

                                var maxCompleteCnt = mission["completeTime"] || 0;
                                var addPoint = mission["addPoint"] || 0;
                                if (curCompletedCnt >= maxCompleteCnt) { // 任务已经完成
                                    configCAttr["activityMap"] = true; // 标记为已经完成
                                    score += addPoint; // 增加积分
                                    __checkRewardMask(rewardListAttr, score, reward); // 检查奖励并设置MASK
                                }
                                configAttr["activityMap"] = Math.min(curCompletedCnt, maxCompleteCnt);

                                data["configCAttr"] = configCAttr;
                                data["configAttr"] = configAttr;
                                data["rewardListAttr"] = rewardListAttr;

                                __updateData(userUid, score, data, function(err, res){ // 更新数据
                                    if (err) callbackFn(err);
                                    else {
                                        callbackFn(null);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    /**
     * 能量球
     * @param userUid
     * @param dataPacket
     * @param callbackFn
     * @private
     */
    function __enegyBallHandler(userUid, dataPacket, callbackFn) {
        __isMissionOpen(userUid, "zillionaire", function(open){
            if (!open) {
                callbackFn("notOpenForUser");
            } else {
                __getData(userUid, function(err, res){
                    if (err) callbackFn(err);
                    else {
                        var data = res["data"];
                        var configCAttr = data["configCAttr"] || {};
                        if (configCAttr.hasOwnProperty("enegyBall")) { // 今日的任务已经完成，不再统计数据
                            callbackFn(null);
                            return;
                        }

                        var rewardListAttr = data["rewardListAttr"] || {};

                        var score = res["score"];

                        var completeCnt = dataPacket["completeCnt"] || 1;

                        var configAttr = data["configAttr"] || {};
                        var curCompletedCnt = configAttr["enegyBall"] || 0;
                        curCompletedCnt = curCompletedCnt + completeCnt; // 计算新的完成次数

                        __getMissionConfig(userUid, "enegyBall", function(err, res){
                            if (err || res == null) callbackFn("configError");
                            else {
                                var mission = res["mission"]; // 配置
                                var reward = res["reward"]; // 奖励配置

                                var maxCompleteCnt = mission["completeTime"] || 0;
                                var addPoint = mission["addPoint"] || 0;
                                if (curCompletedCnt >= maxCompleteCnt) { // 任务已经完成
                                    configCAttr["enegyBall"] = true; // 标记为已经完成
                                    score += addPoint; // 增加积分
                                    __checkRewardMask(rewardListAttr, score, reward); // 检查奖励并设置MASK
                                }
                                configAttr["enegyBall"] = Math.min(curCompletedCnt, maxCompleteCnt);

                                data["configCAttr"] = configCAttr;
                                data["configAttr"] = configAttr;
                                data["rewardListAttr"] = rewardListAttr;

                                __updateData(userUid, score, data, function(err, res){ // 更新数据
                                    if (err) callbackFn(err);
                                    else {
                                        callbackFn(null);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    /**
     * 世界BOSS
     * @param userUid
     * @param dataPacket
     * @param callbackFn
     * @private
     */
    function __worldBossHandler(userUid, dataPacket, callbackFn) {
        __isMissionOpen(userUid, "worldBoss", function(open){
            if (!open) {
                callbackFn("notOpenForUser");
            } else {
                __getData(userUid, function(err, res){
                    if (err) callbackFn(err);
                    else {
                        var data = res["data"];
                        var configCAttr = data["configCAttr"] || {};
                        if (configCAttr.hasOwnProperty("worldBoss")) { // 今日的任务已经完成，不再统计数据
                            callbackFn(null);
                            return;
                        }

                        var rewardListAttr = data["rewardListAttr"] || {};

                        var score = res["score"];

                        var completeCnt = dataPacket["completeCnt"] || 1;

                        var configAttr = data["configAttr"] || {};
                        var curCompletedCnt = configAttr["worldBoss"] || 0;
                        curCompletedCnt = curCompletedCnt + completeCnt; // 计算新的完成次数

                        __getMissionConfig(userUid, "worldBoss", function(err, res){
                            if (err || res == null) callbackFn("configError");
                            else {
                                var mission = res["mission"]; // 配置
                                var reward = res["reward"]; // 奖励配置

                                var maxCompleteCnt = mission["completeTime"] || 0;
                                var addPoint = mission["addPoint"] || 0;
                                if (curCompletedCnt >= maxCompleteCnt) { // 任务已经完成
                                    configCAttr["worldBoss"] = true; // 标记为已经完成
                                    score += addPoint; // 增加积分
                                    __checkRewardMask(rewardListAttr, score, reward); // 检查奖励并设置MASK
                                }
                                configAttr["worldBoss"] = Math.min(curCompletedCnt, maxCompleteCnt);

                                data["configCAttr"] = configCAttr;
                                data["configAttr"] = configAttr;
                                data["rewardListAttr"] = rewardListAttr;

                                __updateData(userUid, score, data, function(err, res){ // 更新数据
                                    if (err) callbackFn(err);
                                    else {
                                        callbackFn(null);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    /**
     * 限时商店
     * @param userUid
     * @param dataPacket
     * @param callbackFn
     * @private
     */
    function __timeLimitShopHandler(userUid, dataPacket, callbackFn) {
        __isMissionOpen(userUid, "timeLimitShop", function(open){
            if (!open) {
                callbackFn("notOpenForUser");
            } else {
                __getData(userUid, function(err, res){
                    if (err) callbackFn(err);
                    else {
                        var data = res["data"];
                        var configCAttr = data["configCAttr"] || {};
                        if (configCAttr.hasOwnProperty("timeLimitShop")) { // 今日的任务已经完成，不再统计数据
                            callbackFn(null);
                            return;
                        }

                        var rewardListAttr = data["rewardListAttr"] || {};

                        var score = res["score"];

                        var completeCnt = dataPacket["completeCnt"] || 1;

                        var configAttr = data["configAttr"] || {};
                        var curCompletedCnt = configAttr["timeLimitShop"] || 0;
                        curCompletedCnt = curCompletedCnt + completeCnt; // 计算新的完成次数

                        __getMissionConfig(userUid, "timeLimitShop", function(err, res){
                            if (err || res == null) callbackFn("configError");
                            else {
                                var mission = res["mission"]; // 配置
                                var reward = res["reward"]; // 奖励配置

                                var maxCompleteCnt = mission["completeTime"] || 0;
                                var addPoint = mission["addPoint"] || 0;
                                if (curCompletedCnt >= maxCompleteCnt) { // 任务已经完成
                                    configCAttr["timeLimitShop"] = true; // 标记为已经完成
                                    score += addPoint; // 增加积分
                                    __checkRewardMask(rewardListAttr, score, reward); // 检查奖励并设置MASK
                                }
                                configAttr["timeLimitShop"] = Math.min(curCompletedCnt, maxCompleteCnt);

                                data["configCAttr"] = configCAttr;
                                data["configAttr"] = configAttr;
                                data["rewardListAttr"] = rewardListAttr;

                                __updateData(userUid, score, data, function(err, res){ // 更新数据
                                    if (err) callbackFn(err);
                                    else {
                                        callbackFn(null);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    ///////////////////////////////////////////////////////////////////////////

    /**
     * 判断有无奖励可以领取
     * @param userUid
     * @param callbackFn
     */
    this.hasRewardToGet = function(userUid, callbackFn) {
        __getData(userUid, function(err, res){
            if (err) callbackFn(0);
            else {
                var rewardListAttr = res["data"]["rewardListAttr"] || {};
                var rwCnt = 0;
                for (var key in rewardListAttr) {
                    if (rewardListAttr.hasOwnProperty(key)) {
                        if (rewardListAttr[key] == 1) {
                            rwCnt++;
                        }
                    }
                }
                callbackFn(rwCnt);
            }
        });
    };

    // EXPORTS

    this.getData = __getData;
    this.updateData = __updateData;
};