/******************************************************************************
 * 限时活动奖励
 * 奖励领取接口
 * Create by MR.Luo.
 * Create at 14-6-24.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var timeLimitActivity = require("../model/timeLimitActivityReward");
var mongoStats = require("../model/mongoStats");
var modelUtil = require("../model/modelUtil");
var stats = require("../model/stats");

exports.start = function(postData, response, query){

    var userUid = query["userUid"];
    var rcvObj = postData;

    var configObj = null;
    var sTime = 0;  // 活动开始时间
    var gRes = {"updateList":[]};

    async.series([
        // 获取活动配置数据
        function(cb) {
            timeLimitActivity.getConfigObj(userUid, function(err, res){
                if (err) cb(err);
                else {
                    configObj = res;

                    var paramPacket = timeLimitActivity.getParameters();
                    sTime = paramPacket["sTime"];
                    cb(null);
                }
            });
        },
        function(cb) {
            var type = rcvObj["type"];
            var configArr = null;
            if (configObj.hasOwnProperty(type)) {
                configArr = configObj[type];

                switch (type) {
                    case "equipDefineAny":
                    case "equipDefineSpecify":
                        __getEquipDefineReward(userUid, sTime, configArr, rcvObj, function(err, res){
                            if (!err && res) {
                                gRes.updateList = res;
                            }
                            cb(null);
                        });
                        break;

                    case "liquidConsume":
                        __getBrothUseReward(userUid, sTime, configArr, rcvObj, function(err, res){
                            if (!err && res) {
                                gRes.updateList = res;
                                //TODO: 根据 count 分支
                                activityConfig.getConfig(userUid, "timeLimitActivity", function (err, res) {
                                    if (err || res[0] != true) {
                                        return;
                                    }
                                    stats.recordWithLevel(rcvObj["count"], res[2]["config"], true, "count", "", [mongoStats.timeLimitActivityReward1, mongoStats.timeLimitActivityReward2, mongoStats.timeLimitActivityReward3, mongoStats.timeLimitActivityReward4, mongoStats.timeLimitActivityReward5, mongoStats.timeLimitActivityReward6, mongoStats.timeLimitActivityReward7, mongoStats.timeLimitActivityReward8, mongoStats.timeLimitActivityReward9, mongoStats.timeLimitActivityReward10], function (tag) {
                                        stats.events(userUid, "127.0.0.1", null, tag);
                                    }, "type", "liquidConsume");
                                });
                            }
                            cb(null);
                        });
                        break;

                    case "breakThroughAng":
                    case "breakThroughSpecify":
                        __getHeroBreakReward(userUid, sTime, configArr, rcvObj, function(err, res){
                            if (!err && res) {
                                gRes.updateList = res;
                                //TODO: 根据 count 分支
                                activityConfig.getConfig(userUid, "timeLimitActivity", function (err, res) {
                                    if (err || res[0] != true) {
                                        return;
                                    }
                                    if (type == "breakThroughSpecify") {
                                        stats.recordWithLevel(rcvObj["key"], res[2]["config"], true, "targetLevel", "", [mongoStats.timeLimitActivityReward101, mongoStats.timeLimitActivityReward102, mongoStats.timeLimitActivityReward103, mongoStats.timeLimitActivityReward104, mongoStats.timeLimitActivityReward105], function (tag) {
                                            stats.events(userUid, "127.0.0.1", null, tag);
                                        }, "type", "breakThroughSpecify");
                                    }
                                });
                            }
                            cb(null);
                        });
                        break;

                    case "equipLevelUpAny":
                    case "equipLevelUpSpecify":
                        __getEquipLevelUpReward(userUid, sTime, configArr, rcvObj, function(err, res){
                            if (!err && res) {
                                gRes.updateList = res;
                            }
                            cb(null);
                        });
                        break;

                    case "cardLevelUpAny":
                    case "cardLevelUpSpecify":
                        __getCardLevelUpReward(userUid, sTime, configArr, rcvObj, function(err, res){
                            if (!err && res) {
                                gRes.updateList = res;
                            }
                            cb(null);
                        });
                        break;

                    case "specialTeamLevelUpAny":
                    case "specialTeamLevelUpSpecify":
                        __getSpecialTeamLevelUp(userUid, sTime, configArr, rcvObj, function(err, res){
                            if (!err && res) {
                                gRes.updateList = res;
                            }
                            cb(null);
                        });
                        break;

                    case "imeggaConsume":
                        __getIngotCostReward(userUid, sTime, configArr, rcvObj, function(err, res){
                            if (!err && res) {
                                gRes.updateList = res;
                            }
                            cb(null);
                        });
                        break;

                    case "itemUseSpecify":
                    case "specialBox":
                    case "enegyBall":
                        __getItemUsedSpecifyReward(userUid, sTime, configArr, rcvObj, function (err, res, configMatched) {
                            if (!err && res) {
                                gRes.updateList = res;
                                //TODO: 根据 count 分支
                                activityConfig.getConfig(userUid, "timeLimitActivity", function (err, res) {
                                    if (err || res[0] != true) {
                                        return;
                                    }
                                    if (type == "specialBox") {
                                        stats.recordWithLevel(rcvObj["count"], res[2]["config"], true, "count", "", [mongoStats.timeLimitActivityReward41, mongoStats.timeLimitActivityReward42, mongoStats.timeLimitActivityReward43, mongoStats.timeLimitActivityReward44, mongoStats.timeLimitActivityReward45, mongoStats.timeLimitActivityReward46, mongoStats.timeLimitActivityReward47, mongoStats.timeLimitActivityReward48, mongoStats.timeLimitActivityReward49, mongoStats.timeLimitActivityReward50], function (tag) {
                                            stats.events(userUid, "127.0.0.1", null, tag);
                                        }, "type", "specialBox");
                                    } else if (type == "enegyBall") {
                                        stats.recordWithLevel(rcvObj["count"], res[2]["config"], true, "count", "", [mongoStats.timeLimitActivityReward31, mongoStats.timeLimitActivityReward32, mongoStats.timeLimitActivityReward33, mongoStats.timeLimitActivityReward34, mongoStats.timeLimitActivityReward35, mongoStats.timeLimitActivityReward36, mongoStats.timeLimitActivityReward37, mongoStats.timeLimitActivityReward38, mongoStats.timeLimitActivityReward39, mongoStats.timeLimitActivityReward40], function (tag) {
                                            stats.events(userUid, "127.0.0.1", null, tag);
                                        }, "type", "enegyBall");
                                    } else if (type == "itemUseSpecify") {
                                        if (configMatched["itemId"][0] == "150301" || configMatched["itemId"][1] == "150301") {
                                            stats.recordWithLevel(rcvObj["count"], res[2]["config"], true, "count", "", [mongoStats.timeLimitActivityReward51, mongoStats.timeLimitActivityReward52, mongoStats.timeLimitActivityReward53, mongoStats.timeLimitActivityReward54, mongoStats.timeLimitActivityReward55, mongoStats.timeLimitActivityReward56, mongoStats.timeLimitActivityReward57, mongoStats.timeLimitActivityReward58, mongoStats.timeLimitActivityReward59, mongoStats.timeLimitActivityReward60], function (tag) {
                                                stats.events(userUid, "127.0.0.1", null, tag);
                                            }, "key", configMatched["key"]);
                                        } else if (configMatched["itemId"][0] == "150302" || configMatched["itemId"][1] == "150302") {
                                            stats.recordWithLevel(rcvObj["count"], res[2]["config"], true, "count", "", [mongoStats.timeLimitActivityReward91, mongoStats.timeLimitActivityReward92, mongoStats.timeLimitActivityReward93, mongoStats.timeLimitActivityReward94, mongoStats.timeLimitActivityReward95, mongoStats.timeLimitActivityReward96, mongoStats.timeLimitActivityReward97, mongoStats.timeLimitActivityReward98, mongoStats.timeLimitActivityReward99, mongoStats.timeLimitActivityReward100], function (tag) {
                                                stats.events(userUid, "127.0.0.1", null, tag);
                                            }, "key", configMatched["key"]);
                                        }
                                    }
                                });
                            }
                            cb(null);
                        });
                        break;

                    case "summonTime":
                        __getSummonTimeReward(userUid, sTime, configArr, rcvObj, function(err, res){
                            if (!err && res) {
                                gRes.updateList = res;
                                //TODO: 根据 count 分支
                                activityConfig.getConfig(userUid, "timeLimitActivity", function (err, res) {
                                    if (err || res[0] != true) {
                                        return;
                                    }
                                    var tags = [];
                                    for (var item in res[2]["config"]) {
                                        item = res[2]["config"][item];
                                        if (item["key"] == rcvObj["key"]) {
                                            if (item["summonStar"] == 3) {
                                                tags = [mongoStats.timeLimitActivityReward21, mongoStats.timeLimitActivityReward22, mongoStats.timeLimitActivityReward23, mongoStats.timeLimitActivityReward24, mongoStats.timeLimitActivityReward25, mongoStats.timeLimitActivityReward26, mongoStats.timeLimitActivityReward27, mongoStats.timeLimitActivityReward28, mongoStats.timeLimitActivityReward29, mongoStats.timeLimitActivityReward30];
                                            } else {
                                                tags = [mongoStats.timeLimitActivityReward11, mongoStats.timeLimitActivityReward12, mongoStats.timeLimitActivityReward13, mongoStats.timeLimitActivityReward14, mongoStats.timeLimitActivityReward15, mongoStats.timeLimitActivityReward16, mongoStats.timeLimitActivityReward17, mongoStats.timeLimitActivityReward18, mongoStats.timeLimitActivityReward19, mongoStats.timeLimitActivityReward20];
                                            }
                                        }
                                    }
                                    stats.recordWithLevel(rcvObj["count"], res[2]["config"], true, "count", "", tags, function (tag) {
                                        stats.events(userUid, "127.0.0.1", null, tag);
                                    }, "key", rcvObj["key"]);
                                });
                            }
                            cb(null);
                        });
                        break;

                    case "useLucky777x1":
                    case "useLucky777x10":
                    case "useLucky777x20":
                        __getLucky777Reward(userUid, sTime, configArr, rcvObj, function(err, res){
                            if (!err && res) {
                                gRes.updateList = res;
                                //TODO: 根据 count 分支
                                activityConfig.getConfig(userUid, "timeLimitActivity", function (err, res) {
                                    if (err || res[0] != true) {
                                        return;
                                    }
                                    if (type == "useLucky777x1") {
                                        stats.recordWithLevel(rcvObj["count"], res[2]["config"], true, "count", "", [mongoStats.timeLimitActivityReward61, mongoStats.timeLimitActivityReward62, mongoStats.timeLimitActivityReward63, mongoStats.timeLimitActivityReward64, mongoStats.timeLimitActivityReward65, mongoStats.timeLimitActivityReward66, mongoStats.timeLimitActivityReward67, mongoStats.timeLimitActivityReward68, mongoStats.timeLimitActivityReward69, mongoStats.timeLimitActivityReward70], function (tag) {
                                            stats.events(userUid, "127.0.0.1", null, tag);
                                        }, "type", "useLucky777x1");
                                    } else if (type == "useLucky777x10") {
                                        stats.recordWithLevel(rcvObj["count"], res[2]["config"], true, "count", "", [mongoStats.timeLimitActivityReward71, mongoStats.timeLimitActivityReward72, mongoStats.timeLimitActivityReward73, mongoStats.timeLimitActivityReward74, mongoStats.timeLimitActivityReward75, mongoStats.timeLimitActivityReward76, mongoStats.timeLimitActivityReward77, mongoStats.timeLimitActivityReward78, mongoStats.timeLimitActivityReward79, mongoStats.timeLimitActivityReward80], function (tag) {
                                            stats.events(userUid, "127.0.0.1", null, tag);
                                        }, "type", "useLucky777x10");
                                    } else if (type == "useLucky777x20") {
                                        stats.recordWithLevel(rcvObj["count"], res[2]["config"], true, "count", "", [mongoStats.timeLimitActivityReward81, mongoStats.timeLimitActivityReward82, mongoStats.timeLimitActivityReward83, mongoStats.timeLimitActivityReward84, mongoStats.timeLimitActivityReward85, mongoStats.timeLimitActivityReward86, mongoStats.timeLimitActivityReward87, mongoStats.timeLimitActivityReward88, mongoStats.timeLimitActivityReward89, mongoStats.timeLimitActivityReward90], function (tag) {
                                            stats.events(userUid, "127.0.0.1", null, tag);
                                        }, "type", "useLucky777x20");
                                    }
                                });
                            }
                            cb(null);
                        });
                        break;

                    default :
                        cb("TYPE ERROR");
                        break;
                }

            } else {
                cb("configError");
            }
        }
    ], function(err){
        if (err) {
            response.echo("timeLimitActivity.reward",  jutil.errorInfo(err));
        } else {
            response.echo("timeLimitActivity.reward",  gRes);
        }
    });
};


/**
 * 领取装备精炼的奖励
 * @param userUid
 * @param sTime
 * @param configArr
 * @param paramObj
 * @param callbackFn
 * @private
 */
function __getEquipDefineReward(userUid, sTime, configArr, paramObj, callbackFn) {
    var itemConfig = null; // 项配置
    var sKey = paramObj["key"]; // 项KEY

    var dbData = null; // 数据库数据

    var retArr = [];

    async.series([
        // 查找特定配置
        function(cb) {
            for (var fKey in configArr) {
                if (configArr.hasOwnProperty(fKey)) {
                    var sConfig = configArr[fKey];
                    if (sConfig["key"] == sKey) {
                        itemConfig = sConfig;
                        break;
                    }
                }
            }

            if (itemConfig) {
                cb(null);
            } else {
                cb("configError");
            }
        },

        // 判断能否领奖
        function(cb) {
            timeLimitActivity.queryData(userUid, sKey, function(err, res){
                if (!err) {
                    res = res || {};
                    // 判断数据项是否过期
                    var updateTime = res["updateTime"] || 0;
                    if (updateTime < sTime) {
                        res = {};
                    }

                    dbData = res["data"] || {};
                    var canGetNum = dbData["cGet"] || 0;

                    if (canGetNum > 0) {
                        cb(null);
                    } else {
                        cb("noRewardToGet");
                    }
                }
            });
        },

        // 修改数据
        function(cb) {
            // 减少可领取次数
            var canGetNum = dbData["cGet"] || 0;
            canGetNum--;
            dbData["cGet"] = Math.max(0, canGetNum);

            // 增加已领取次数
            var alreadyGet = dbData["aGet"] || 0;
            alreadyGet++;
            dbData["aGet"] = alreadyGet;

            // 更新数据库
            timeLimitActivity.updateData(userUid, sKey, dbData, function(err, res){
                if (err) cb(err);
                else {
                    cb(null);
                }
            });
        },

        // 发奖
        function(cb) {
            var rewardList = itemConfig["reward"];
            async.forEach(Object.keys(rewardList), function(i, feCb){
                var itemData = rewardList[i];
                __rwHandler(userUid, itemData["id"], itemData["count"], function(err, res){
                    if (res) {
                        retArr.push(res);
                    }
                    feCb(null);
                });
            }, function(err){
                cb(null);
            });
        }
    ], function(err){
        callbackFn(null, retArr);
    });
}

/**
 * 领取培养液消耗的奖励
 * @param userUid
 * @param sTime
 * @param configArr
 * @param paramObj
 * @param callbackFn
 * @private
 */
function __getBrothUseReward(userUid, sTime, configArr, paramObj, callbackFn) {
    var itemConfig = null; // 项配置
    var sKey = 0; // 项KEY

    var dbData = null; // 数据库数据

    var retArr = [];

    async.series([
        // 查找特定配置
        function(cb) {
            var count = paramObj["count"];
            for (var fKey in configArr) {
                if (configArr.hasOwnProperty(fKey)) {
                    var sConfig = configArr[fKey];
                    if (sConfig["count"] == count) {//FIXME:消耗数量相同时，有判断bug.
                        itemConfig = sConfig;
                        break;
                    }
                }
            }

            if (itemConfig) {
                sKey = itemConfig["key"];
                cb(null);
            } else {
                cb("configError");
            }
        },

        // 判断能否领奖
        function(cb) {
            timeLimitActivity.queryData(userUid, sKey, function(err, res){
                if (!err) {
                    res = res || {};
                    // 判断数据项是否过期
                    var updateTime = res["updateTime"] || 0;
                    if (updateTime < sTime) {
                        res = {};
                    }

                    dbData = res["data"] || {};
                    var canGetList = dbData["cGetList"] || {};

                    if (canGetList.hasOwnProperty(itemConfig["count"])) {
                        cb(null);
                    } else {
                        cb("noRewardToGet");
                    }
                }
            });
        },

        // 修改数据
        function(cb) {
            // 从可领取列表中删除
            var canGetList = dbData["cGetList"] || {};
            canGetList[itemConfig["count"]] = undefined;

            // 加入已领取列表
            var alreadyGetList = dbData["aGetList"] || {};
            alreadyGetList[itemConfig["count"]] = 1;
            dbData["aGetList"] = alreadyGetList;

            // 更新数据
            timeLimitActivity.updateData(userUid, sKey, dbData, function(err, res){
                if (err) cb(err);
                else {
                    cb(null);
                }
            });
        },

        // 发奖
        function(cb) {
            var rewardList = itemConfig["reward"];
            async.forEach(Object.keys(rewardList), function(i, feCb){
                var itemData = rewardList[i];
                __rwHandler(userUid, itemData["id"], itemData["count"], function(err, res){
                    if (res) {
                        retArr.push(res);
                    }
                    feCb(null);
                });
            }, function(err){
                cb(null);
            });
        }
    ], function(err){
        callbackFn(null, retArr, itemConfig);
    });
}

/**
 * 领取伙伴突破奖励
 * @param userUid
 * @param sTime
 * @param configArr
 * @param paramObj
 * @param callbackFn
 * @private
 */
function __getHeroBreakReward(userUid, sTime, configArr, paramObj, callbackFn) {
    __getEquipDefineReward(userUid, sTime, configArr, paramObj, callbackFn);
}

/**
 * 领取装备升级奖励
 * @param userUid
 * @param sTime
 * @param configArr
 * @param paramObj
 * @param callbackFn
 * @private
 */
function __getEquipLevelUpReward(userUid, sTime, configArr, paramObj, callbackFn) {
    __getEquipDefineReward(userUid, sTime, configArr, paramObj, callbackFn);
}

/**
 * 领取卡片升级奖励
 * @param userUid
 * @param sTime
 * @param configArr
 * @param paramObj
 * @param callbackFn
 * @private
 */
function __getCardLevelUpReward(userUid, sTime, configArr, paramObj, callbackFn) {
    __getEquipDefineReward(userUid, sTime, configArr, paramObj, callbackFn);
}

/**
 * 领取特战队升级的奖励
 * @param userUid
 * @param sTime
 * @param configArr
 * @param paramObj
 * @param callbackFn
 * @private
 */
function __getSpecialTeamLevelUp(userUid, sTime, configArr, paramObj, callbackFn) {
    __getEquipDefineReward(userUid, sTime, configArr, paramObj, callbackFn);
}

/**
 * 领取伊美加币消耗的奖励
 * @param userUid
 * @param sTime
 * @param configArr
 * @param paramObj
 * @param callbackFn
 * @private
 */
function __getIngotCostReward(userUid, sTime, configArr, paramObj, callbackFn) {
    __getBrothUseReward(userUid, sTime, configArr, paramObj, callbackFn);
}

/**
 * 领取道具使用奖励
 * @param userUid
 * @param sTime
 * @param configArr
 * @param paramObj
 * @param callbackFn
 * @private
 */
function __getItemUsedSpecifyReward(userUid, sTime, configArr, paramObj, callbackFn) {
    __getBrothUseReward(userUid, sTime, configArr, paramObj, callbackFn);
}

/**
 * 领取lucky777奖励
 * @param userUid
 * @param sTime
 * @param configArr
 * @param paramObj
 * @param callbackFn
 * @private
 */
function __getLucky777Reward(userUid, sTime, configArr, paramObj, callbackFn) {
    __getBrothUseReward(userUid, sTime, configArr, paramObj, callbackFn);
}

/**
 * 领取高级召唤奖励
 * @param userUid
 * @param sTime
 * @param configArr
 * @param paramObj
 * @param callbackFn
 * @private
 */
function __getSummonTimeReward(userUid, sTime, configArr, paramObj, callbackFn) {
    var itemConfig = null; // 项配置
    var sKey = paramObj["key"]; // 项KEY

    var dbData = null; // 数据库数据

    var retArr = [];

    async.series([
        // 查找特定配置
        function(cb) {
            var count = paramObj["count"];
            for (var fKey in configArr) {
                if (configArr.hasOwnProperty(fKey)) {
                    var sConfig = configArr[fKey];
                    if (sConfig["key"] == sKey) {
                        if (sConfig["count"] == count) {
                            itemConfig = sConfig;
                            break;
                        }
                    }
                }
            }

            if (itemConfig) {
                cb(null);
            } else {
                cb("configError");
            }
        },

        // 判断能否领奖
        function(cb) {
            timeLimitActivity.queryData(userUid, sKey, function(err, res){
                if (!err) {
                    res = res || {};
                    // 判断数据项是否过期
                    var updateTime = res["updateTime"] || 0;
                    if (updateTime < sTime) {
                        res = {};
                    }

                    dbData = res["data"] || {};
                    var canGetList = dbData["cGetList"] || {};

                    if (canGetList.hasOwnProperty(itemConfig["count"])) {
                        cb(null);
                    } else {
                        cb("noRewardToGet");
                    }
                }
            });
        },

        // 修改数据
        function(cb) {
            // 从可领取列表中删除
            var canGetList = dbData["cGetList"] || {};
            canGetList[itemConfig["count"]] = undefined;

            // 加入已领取列表
            var alreadyGetList = dbData["aGetList"] || {};
            alreadyGetList[itemConfig["count"]] = 1;
            dbData["aGetList"] = alreadyGetList;

            // 更新数据
            timeLimitActivity.updateData(userUid, sKey, dbData, function(err, res){
                if (err) cb(err);
                else {
                    cb(null);
                }
            });
        },

        // 发奖
        function(cb) {
            var rewardList = itemConfig["reward"];
            async.forEach(Object.keys(rewardList), function(i, feCb){
                var itemData = rewardList[i];
                __rwHandler(userUid, itemData["id"], itemData["count"], function(err, res){
                    if (res) {
                        retArr.push(res);
                    }
                    feCb(null);
                });
            }, function(err){
                cb(null);
            });
        }
    ], function(err){
        callbackFn(null, retArr);
    });
}


/**
 * 发奖
 * @param userUid
 * @param id
 * @param count
 * @param cb
 * @private
 */
function __rwHandler(userUid, id, count, cb) {

    mongoStats.dropStats(id, userUid, 0, null, mongoStats.TIME_LIMIT_ACTIVITY_REWARD, count);
    switch (id) {
        default:
            modelUtil.addDropItemToDB(id,count,userUid,0,1,function(err,res) {
                if (err) cb("dbError");
                else {
                    cb(null, res);
                }
            });
            break;
    }
}