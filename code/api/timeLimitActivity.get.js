/******************************************************************************
 * 限时活动奖励
 * 数据获取接口
 * Create by MR.Luo.
 * Create at 14-6-24.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var timeLimitActivity = require("../model/timeLimitActivityReward");
var userVariable = require("../model/userVariable");

exports.start = function(postData, response, query){

    var ACTIVITY_CONFIG_NAME = "timeLimitActivity";

    var userUid = query["userUid"];
    var currentConfig = null;

    var sTime = 0;
    var eTime = 0;
    var gRes = {"itemList":[]};
    var language = "";

    async.series([
        // 获取活动配置数据
        function(cb) {
            activityConfig.getConfig(userUid, ACTIVITY_CONFIG_NAME, function(err, res){
                if (err || res == null) cb("CannotGetConfig");
                else {
                    if (res[0]) {
                        sTime = res[4];
                        eTime = res[5];
                        currentConfig = res[2]["config"];
                        gRes["title"] = jutil.toBase64(res[2]["title"]);
                        gRes["bgimg"] = res[2]["bgimg"];
                        if (!currentConfig) {
                            cb("configError");
                        } else {
                            cb(null);
                        }
                    } else {
                        cb("notOpen");
                    }
                }
            });
        },
        //获取用户语言
        function(cb) {
            userVariable.getLanguage(userUid,function(err, res){
                if(!err && res)
                    language = res;
                cb(null);
            });
        },
        function(cb) {
            async.eachSeries(Object.keys(currentConfig), function(key, esCb){
                var configItem = jutil.deepCopy(currentConfig[key]);
                configItem["name"] = configItem["name" + language] == undefined ? configItem["name"] : configItem["name" + language];
                configItem["desc"] = configItem["desc" + language] == undefined ? configItem["desc"] : configItem["desc" + language];
                configItem["nameara"] = configItem["name"];
                configItem["descara"] = configItem["desc"];
                configItem["nameesp"] = configItem["name"];
                configItem["descesp"] = configItem["desc"];
                configItem["nameger"] = configItem["name"];
                configItem["descger"] = configItem["desc"];
                configItem["namefra"] = configItem["name"];
                configItem["descfra"] = configItem["desc"];

                switch (configItem["type"]) {
                    case "equipDefineAny":
                    case "equipDefineSpecify":
                        __buildEquipDefineItem(userUid, configItem, sTime, function(res){
                            gRes.itemList.push(res);
                            esCb(null);
                        });
                        break;
                    case "liquidConsume":
                        __buildBrothUsedItem(userUid, configItem, sTime, function(res){
                            gRes.itemList.push(res);
                            esCb(null);
                        });
                        break;
                    case "breakThroughAng":
                    case "breakThroughSpecify":
                        __buildHeroBreakItem(userUid, configItem, sTime, function(res){
                            gRes.itemList.push(res);
                            esCb(null);
                        });
                        break;
                    case "equipLevelUpAny":
                    case "equipLevelUpSpecify":
                        __buildEquipLevelUpItem(userUid, configItem, sTime, function(res){
                            gRes.itemList.push(res);
                            esCb(null);
                        });
                        break;
                    case "cardLevelUpAny":
                    case "cardLevelUpSpecify":
                        __buildCardLevelUpItem(userUid, configItem, sTime, function(res){
                            gRes.itemList.push(res);
                            esCb(null);
                        });
                        break;
                    case "specialTeamLevelUpAny":
                    case "specialTeamLevelUpSpecify":
                        __buildSpecialTeamLevelUpItem(userUid, configItem, sTime, function(res){
                            gRes.itemList.push(res);
                            esCb(null);
                        });
                        break;
                    case "imeggaConsume":
                        __buildIngotCostItem(userUid, configItem, sTime, function(res){
                            gRes.itemList.push(res);
                            esCb(null);
                        });
                        break;
                    case "itemUseSpecify":
                    case "specialBox":
                    case "enegyBall":
                        __buildItemUsedSpecifyItem(userUid, configItem, sTime, function(res){
                            gRes.itemList.push(res);
                            esCb(null);
                        });
                        break;
                    case "summonTime":
                        __buildSummonTimeItem(userUid, configItem, sTime, function(res){
                            gRes.itemList.push(res);
                            esCb(null);
                        });
                        break;
                    case "useLucky777x1":
                    case "useLucky777x10":
                    case "useLucky777x20":
                        __buildLucky777Item(userUid, configItem, sTime, function(res){
                            gRes.itemList.push(res);
                            esCb(null);
                        });
                        break;
                    default :
                        __buildDefault(userUid, configItem, sTime, function(res){
                            gRes.itemList.push(res);
                            esCb(null);
                        });
                        break;
                }

            }, function(err){
                cb(null);
            });
        }
    ], function(err){
        if (err) {
            response.echo("timeLimitActivity.get",  jutil.errorInfo(err));
        } else {
            gRes["eTime"] = eTime;
            response.echo("timeLimitActivity.get",  gRes);
        }
    });
};

/**
 * 复制一个对象
 * @param configObj
 * @returns {*}
 * @private
 */
function __duplicateConfigObj(configObj) {
    return JSON.parse(JSON.stringify(configObj));
}

/**
 * 组装装备精炼项
 * @param userUid
 * @param configItem
 * @param sTime
 * @param callbackFn
 * @private
 */
function __buildEquipDefineItem(userUid, configItem, sTime, callbackFn) {
    configItem = __duplicateConfigObj(configItem);

    var gRes = {
        "config" : configItem
    };

    configItem["name"] = jutil.toBase64(configItem["name"]);
    configItem["desc"] = jutil.toBase64(configItem["desc"]);

    timeLimitActivity.queryData(userUid, configItem["key"], function(err, res){
        if (!err) {
            res = res || {};
            // 判断数据项是否过期
            var updateTime = res["updateTime"] || 0;
            if (updateTime < sTime) {
                res = {};
            }

            // 获取该项数据可领取次数
            var dbData = res["data"] || {};
            var cGet = dbData["cGet"] || 0;
            gRes["cGet"] = cGet;

            // 已领取次数
            var aGet = dbData["aGet"] || 0;
            gRes["aGet"] = aGet;
        }

        callbackFn(gRes);
    });
}

/**
 * 组装培养液使用项
 * @param userUid
 * @param configItem
 * @param sTime
 * @param callbackFn
 * @private
 */
function __buildBrothUsedItem(userUid, configItem, sTime, callbackFn) {
    configItem = __duplicateConfigObj(configItem);

    var gRes = {
        "config" : configItem
    };

    configItem["name"] = jutil.toBase64(configItem["name"]);
    configItem["desc"] = jutil.toBase64(configItem["desc"]);

    timeLimitActivity.queryData(userUid, configItem["key"], function(err, res){
        if (!err) {
            res = res || {};
            // 判断数据项是否过期
            var updateTime = res["updateTime"] || 0;
            if (updateTime < sTime) {
                res = {};
            }

            // 获取该项数据可领取次数
            var dbData = res["data"] || {};

            // 返回使用的培养液数量，返回值不会大于当前项配置的值
            gRes["numUsed"] = Math.min(dbData["numUsed"] || 0, configItem["count"]);

            // 返回是否可领取
            var canGetList = dbData["cGetList"] || {};
            if (canGetList.hasOwnProperty(configItem["count"])) {
                gRes["cGet"] = 1;
            }

            // 返回是否已经领取
            var alreadyGetList = dbData["aGetList"] || {};
            if (alreadyGetList.hasOwnProperty(configItem["count"])) {
                gRes["aGet"] = true;
            }
        }

        callbackFn(gRes);
    });
}

/**
 * 组装英雄突破项
 * @param userUid
 * @param configItem
 * @param sTime
 * @param callbackFn
 * @private
 */
function __buildHeroBreakItem(userUid, configItem, sTime, callbackFn) {
    __buildEquipDefineItem(userUid, configItem, sTime, callbackFn);
}

/**
 * 组装装备升级项
 * @param userUid
 * @param configItem
 * @param sTime
 * @param callbackFn
 * @private
 */
function __buildEquipLevelUpItem(userUid, configItem, sTime, callbackFn) {
    __buildEquipDefineItem(userUid, configItem, sTime, callbackFn);
}

/**
 * 组装卡片升级项
 * @param userUid
 * @param configItem
 * @param sTime
 * @param callbackFn
 * @private
 */
function __buildCardLevelUpItem(userUid, configItem, sTime, callbackFn) {
    __buildEquipDefineItem(userUid, configItem, sTime, callbackFn);
}

/**
 * 组装特战队升级项
 * @param userUid
 * @param configItem
 * @param sTime
 * @param callbackFn
 * @private
 */
function __buildSpecialTeamLevelUpItem(userUid, configItem, sTime, callbackFn) {
    __buildEquipDefineItem(userUid, configItem, sTime, callbackFn);
}

/**
 * 组装伊美加币消耗项
 * @param userUid
 * @param configItem
 * @param sTime
 * @param callbackFn
 * @private
 */
function __buildIngotCostItem(userUid, configItem, sTime, callbackFn) {
    __buildBrothUsedItem(userUid, configItem, sTime, callbackFn);
}

/**
 * 组装道具使用项
 * @param userUid
 * @param configItem
 * @param sTime
 * @param callbackFn
 * @private
 */
function __buildItemUsedSpecifyItem(userUid, configItem, sTime, callbackFn) {
    __buildBrothUsedItem(userUid, configItem, sTime, callbackFn);
}

/**
 * 组装高级召唤项
 * @param userUid
 * @param configItem
 * @param sTime
 * @param callbackFn
 * @private
 */
function __buildSummonTimeItem(userUid, configItem, sTime, callbackFn) {
    __buildBrothUsedItem(userUid, configItem, sTime, callbackFn);
}

/**
 * LUCKY777
 * @param userUid
 * @param configItem
 * @param sTime
 * @param callbackFn
 * @private
 */
function __buildLucky777Item(userUid, configItem, sTime, callbackFn) {
    __buildBrothUsedItem(userUid, configItem, sTime, callbackFn);
}

/**
 * 默认项
 * @param userUid
 * @param configItem
 * @param sTime
 * @param callbackFn
 * @private
 */
function __buildDefault(userUid, configItem, sTime, callbackFn) {
    configItem = __duplicateConfigObj(configItem);

    callbackFn({
        "config" : configItem
    });
}