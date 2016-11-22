/******************************************************************************
 * 成就
 * 奖励领取
 * Create by MR.Luo.
 * Create at 14-8-13.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var achievement = require("../model/achievement");
var achievementGet = require("../api/achievement.get");
var configManager = require("../config/configManager");
var user = require("../model/user");
var mongoStats = require("../model/mongoStats");
var modelUtil = require("../model/modelUtil");

exports.start = function(postData, response, query) {
    if (jutil.postCheck(postData, "type") == false) {
        response.echo("achievement.reward", jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];
    var type = postData["type"];
    var vData = postData["vData"];
    var savedData = null;
    var config = null;
    var rwCfg = null;

    var gRes = null;
    async.series([
        function(cb) { // 取涉及多语言配制文件方式
            achievement.getConfigLanguage(userUid, type,function(err,res){
                config = res;
                cb(null)
            });
        },
        function(cb) {
            //config = achievement.getConfig(userUid, type);
            if (!config) {
                cb("configError");
                return;
            }
            achievement.getData(userUid, type, function(err, res){
                if (err) cb(err);
                else {
                    if (!res) {
                        cb("noRewardToGet");
                        return;
                    }

                    savedData = res["data"];
                    cb(null);
                }
            });
        },
        function(cb) { // 判断是否可以领奖
            switch (type) {
                case "mapComplete":
                    __getMapCompletedRewardInfo(userUid, config, savedData, vData, function(err, res){
                        if (err) cb(err);
                        else {
                            gRes = res;
                            cb(null);
                        }
                    });
                    break;

                case "mapTime":
                case "clearMapTime":
                case "equipGet":
                case "equipLevelUp":
                case "equipRefine":
                case "heroGet":
                case "getHero":
                case "breakThrough":
                case "heroLevelUp":
                case "cardGet":
                case "cardLevelUp":
                case "useBigRoll":
                case "specialTeamActivation":
                case "specialTeamLevelUp":
                case "ultimateSummonTime":
                case "fundBuy":
                case "moonCardBuy":
                case "totalLogin":
                case "pvpRankWinTime":
                case "pvpPatchWinTime":
                case "vipGet":
                case "powerBuyTime":
                case "manaBuyTime":
                case "skillGet":
                case "skillLevelUp":
                case "playerLevelUp":
                case "boxOpen":
                case "foster":
                case "superWaterUse":
                    __getTypeRewardInfo(userUid, type, config, savedData, vData, function(err, res){
                        if (err) cb(err);
                        else {
                            gRes = res;
                            cb(null);
                        }
                    });
                    break;

                default :
                    cb("noRewardToGet");
                    break;
            }
        }

    ], function(err){
        if (err) {
            response.echo("achievement.reward",  jutil.errorInfo(err));
        } else {
            response.echo("achievement.reward",  gRes);
        }
    });
};

/**
 * 领取奖励
 * @param userUid
 * @param type
 * @param config
 * @param savedData
 * @param vData
 * @param callbackFn
 * @private
 */
function __getTypeRewardInfo(userUid, type, config, savedData, vData, callbackFn) {
    var typeTime = null;
    var rwInfo = null;
    var gRes = {"updateList":[], "newViewData":{}};
    async.series([
        function(cb){ // CHECK
            if (savedData == null) {
                cb("noRewardToGet");
                return;
            }

            typeTime = vData; // 要领取的通过的map id

            var rewardMap = savedData["rewardMap"] || {}; // 可领取列表
            var rewardedMap = savedData["rewardedMap"] || {}; // 已领取列表
            if (rewardedMap.hasOwnProperty(typeTime)) {
                cb("alreadyGet");
                return;
            }

            if (!rewardMap.hasOwnProperty(typeTime)) {
                cb("noRewardToGet");
                return;
            }

            cb(null);
        },
        function(cb) { // 获取奖励数据
            var contentArr = config["content"];
            for (var key in contentArr) {
                if (contentArr.hasOwnProperty(key)) {
                    var subContent = contentArr[key];
                    if (subContent["complete"] == typeTime) {
                        rwInfo = subContent["reward"];
                        break;
                    }
                }
            }
            cb(null);
        },
        function(cb) { // 领奖
            if (!rwInfo) {
                cb("configError");
                return;
            }

            async.forEach(Object.keys(rwInfo), function(i, feCb){
                var itemData = rwInfo[i];
                __rwHandler(userUid, itemData["id"], itemData["count"], function(err, res){
                    if(res instanceof Array){
                        for(var i in res){
                            gRes.updateList.push(res[i]);
                        }
                    } else if(res) {
                        gRes.updateList.push(res);
                    }
                    feCb(null);
                });
            }, function(err){
                cb(null);
            });
        },
        function(cb) { // 更新数据
            var rewardMap = savedData["rewardMap"] || {}; // 可领取列表
            var rewardedMap = savedData["rewardedMap"] || {}; // 已领取列表
            rewardedMap[typeTime] = 1;
            savedData["rewardedMap"] = rewardedMap; // 更新已领取列表
            rewardMap[typeTime] = undefined;
            savedData["rewardMap"] = rewardMap; // 更新可领取列表
            achievement.updateData(userUid, type, savedData, function(err, res){
                if (err) console.error(err);
                cb(null);
            });
        },
        function(cb) { // 减少可领取奖励的数量
            achievement.incAcchievementRewardNum(userUid, -1, function(err, res){
                if (err) console.error(err);
                cb(null);
            });
        },
        function(cb) { // 返回新的显示数据
            if(type == 'getHero'){
                achievementGet.getHeroItem(userUid, config, function(err, res){
                    if (err) console.error(err);
                    else {
                        gRes.newViewData = res[typeTime];
                        cb(null);
                    }
                });
            } else {
                achievementGet.getItem(userUid, config, type, function(err, res){
                    if (err) console.error(err);
                    else {
                        gRes.newViewData = res;
                        cb(null);
                    }
                });
            }
        }
    ], function(err){
        if (err) callbackFn(err);
        else callbackFn(null, gRes);
    });
}


/**
 * 领取地图闯关奖励
 * @param userUid
 * @param config
 * @param savedData
 * @param vData
 * @param callbackFn
 * @private
 */
function __getMapCompletedRewardInfo(userUid, config, savedData, vData, callbackFn) {
    var mapId = null;
    var rwInfo = null;
    var gRes = {"updateList":[], "newViewData":{}};
    async.series([
        function(cb){ // CHECK
            if (savedData == null) {
                cb("noRewardToGet");
                return;
            }

            mapId = vData; // 要领取的通过的map id

            var rewardMap = savedData["rewardMap"] || {}; // 可领取列表
            var rewardedMap = savedData["rewardedMap"] || {}; // 已领取列表
            if (rewardedMap.hasOwnProperty(mapId)) {
                cb("alreadyGet");
                return;
            }

            if (!rewardMap.hasOwnProperty(mapId)) {
                cb("noRewardToGet");
                return;
            }

            cb(null);
        },
        function(cb) { // 获取奖励数据
            var contentArr = config["content"];
            for (var key in contentArr) {
                if (contentArr.hasOwnProperty(key)) {
                    var subContent = contentArr[key];
                    if (subContent["complete"] == mapId) {
                        rwInfo = subContent["reward"];
                        break;
                    }
                }
            }
            cb(null);
        },
        function(cb) { // 领奖
            if (!rwInfo) {
                cb("configError");
                return;
            }

            async.forEach(Object.keys(rwInfo), function(i, feCb){
                var itemData = rwInfo[i];
                __rwHandler(userUid, itemData["id"], itemData["count"], function(err, res){
                    if(res instanceof Array){
                        for(var i in res){
                            gRes.updateList.push(res[i]);
                        }
                    } else if(res) {
                        gRes.updateList.push(res);
                    }
                    feCb(null);
                });
            }, function(err){
                cb(null);
            });
        },
        function(cb) { // 更新数据
            var rewardMap = savedData["rewardMap"] || {}; // 可领取列表
            var rewardedMap = savedData["rewardedMap"] || {}; // 已领取列表
            rewardedMap[mapId] = 1;
            savedData["rewardedMap"] = rewardedMap; // 更新已领取列表
            rewardMap[mapId] = undefined;
            savedData["rewardMap"] = rewardMap; // 更新可领取列表
            achievement.updateData(userUid, "mapComplete", savedData, function(err, res){
                if (err) console.error(err);
                cb(null);
            });
        },
        function(cb) { // 减少可领取奖励的数量
            achievement.incAcchievementRewardNum(userUid, -1, function(err, res){
                if (err) console.error(err);
                cb(null);
            });
        },
        function(cb) { // 返回新的显示数据
            achievementGet.getMapCompleteItem(userUid, config, function(err, res){
                if (err) console.error(err);
                else {
                    gRes.newViewData = res;
                    cb(null);
                }
            });
        }
    ], function(err){
        if (err) callbackFn(err);
        else callbackFn(null, gRes);
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
    mongoStats.dropStats(id, userUid, 0, null, mongoStats.ACHIEVEMENT, count);
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