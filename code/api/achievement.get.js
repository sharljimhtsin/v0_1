/******************************************************************************
 * 成就
 * 数据获取
 * Create by MR.Luo.
 * Create at 14-8-12.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var achievement = require("../model/achievement");
var configManager = require("../config/configManager");
var user = require("../model/user");

exports.start = function(postData, response, query) {
    var userUid = query["userUid"];
    var configData = configManager.createConfig(userUid);
    var achievementConfig = {};

    var gRes = {"dataArr":[],"num":0,"rewardNum":0};
    async.series([
        function(cb) { // 取涉及多语言配制文件方式
            configData.getConfigLanguage("achievement",userUid, function(err,res){
                achievementConfig = res;
                cb(null);
            });
        },
        function(cb) { // 获取活动数据
            if (!achievementConfig) {
                console.log("achievement:: get config data error.");
                cb("configError");
                return;
            }

            async.eachSeries(Object.keys(achievementConfig), function(key, esCb){
                var subConfig = achievementConfig[key];
                switch (subConfig["type"]) {
                    case "mapComplete":
                        __getMapCompleteItem(userUid, subConfig, function(err, res){
                            if (err) esCb(err);
                            else {
                                gRes.dataArr.push(res);
                                gRes["num"]++;
                                if(!res["alreadyGet"] && res["canGetReward"])
                                    gRes["rewardNum"] += res["rewardNum"];
                                esCb(null);
                            }
                        });
                        break;

                    case "mapTime":
                    case "clearMapTime":
                    case "equipGet":
                    case "equipLevelUp":
                    case "equipRefine":
                    case "heroGet":
                    case "breakThrough":
                    case "heroLevelUp":
                    case "cardGet":
                    case "cardLevelUp":
                    case "useBigRoll":
                    case "specialTeamActivation":
                    case "specialTeamLevelUp":
                    case "ultimateSummonTime":
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
                        __getItem(userUid, subConfig, subConfig["type"], function(err, res){
                            if (err) esCb(err);
                            else {
                                gRes.dataArr.push(res);
                                gRes["num"]++;
                                if(!res["alreadyGet"] && res["canGetReward"])
                                    gRes["rewardNum"] += res["rewardNum"];
                                esCb(null);
                            }
                        });
                        break;
                    case "getHero":
                        __getHeroItem(userUid, subConfig, function(err, res){
                            if(err) esCb(err)
                            else {
                                for(var i in res){
                                    gRes["num"]++;
                                    gRes.dataArr.push(res[i]);
                                    if(!res[i]["alreadyGet"] && res[i]["canGetReward"])
                                        gRes["rewardNum"] += 1;
                                }
                                esCb(null);
                            }
                        });
                        break;
                    case "fundBuy":
                        __getFundBuyItem(userUid, subConfig, function(err, res){
                            if (err) esCb(err);
                            else {
                                gRes.dataArr.push(res);
                                gRes["num"]++;
                                if(!res["alreadyGet"] && res["canGetReward"])
                                    gRes["rewardNum"] += res["rewardNum"];
                                esCb(null);
                            }
                        });
                        break;

                    default :
                        esCb(null);
                        break;
                }
            }, function(err){
                if (err) cb(err);
                else cb(null);
            });
        },
        function(cb) { // 获取成就数量和可领取的奖励的数量
            achievement.getAchievementNum(userUid, function(cnt){
                gRes["num"] = cnt;
                //achievement.getAchievementRewardNum(userUid, function(cnt){
                    //gRes["rewardNum"] = cnt;
                    cb(null);
                //});
            });
        }
    ], function(err){
        if (err) {
            response.echo("achievement.get",  jutil.errorInfo(err));
        } else {
            response.echo("achievement.get",  gRes);
        }
    });
};

function __duplicateObj(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function __getItem(userUid, config, type, callbackFn) {

    var gRes = {
        "type":type,
        "name": jutil.toBase64(config["name"]),
        "rewardNum":0
    };

    achievement.getData(userUid, type, function(err, res){
        if (err) callbackFn(err);
        else {
            var contentArr = config["content"];
            var savedData = {};
            if (res) savedData = res["data"] || {};
            var typeTime = savedData[type] || 0;
            var rewardMap = savedData["rewardMap"] || {};
            var rewardedMap = savedData["rewardedMap"] || {};
            if (Object.keys(rewardMap).length > 0) { // 有奖励没有领取
                for (var key in contentArr) {
                    if (contentArr.hasOwnProperty(key)) {
                        var subContent = contentArr[key];
                        if (rewardMap.hasOwnProperty(subContent["complete"])) { // 显示该项
                            gRes["config"] = __duplicateObj(subContent); // 显示的配置
                            gRes["canGetReward"] = true; // 可以领取奖励
                            break;
                        }
                    }
                }

                for (var i in rewardMap){
                    gRes["rewardNum"]++;
                }

                if (!gRes.hasOwnProperty("config")) {
                    // 数据错误
                    callbackFn("user achievement data error.");
                    return;
                }

            } else { // 没有奖励可以领取
                for (var key in contentArr) {
                    if (contentArr.hasOwnProperty(key)) {
                        var subContent = contentArr[key];
                        if (subContent["complete"] > typeTime) {
                            gRes["config"] = __duplicateObj(subContent); // 显示的配置
                            gRes["canGetReward"] = false; // 可以领取奖励
                            break;
                        }
                    }
                }

                if (!gRes.hasOwnProperty("config")) {
                    // 全部领取，取最后一条数据
                    gRes["config"] = __duplicateObj(contentArr[contentArr.length - 1]); // 显示的配置
                    gRes["canGetReward"] = false; // 可以领取奖励
                }
            }

            gRes[type] = typeTime;

            // 字符串转换
            gRes["config"]["desc"] = jutil.toBase64(gRes["config"]["desc"]);
            // 返回是否已经领取
            gRes["alreadyGet"] = rewardedMap.hasOwnProperty(gRes["config"]["complete"]);
            callbackFn(null, gRes);
        }
    });
}
exports.getItem = __getItem;

/**
 * 构建地图完成项
 * @param userUid
 * @param config
 * @param callbackFn
 * @private
 */
function __getMapCompleteItem(userUid, config, callbackFn) {
    var gRes = {
        "type":"mapComplete",
        "name": jutil.toBase64(config["name"]),
        "rewardNum":0
    };

    achievement.getData(userUid, "mapComplete", function(err, res){
        if (err) callbackFn(err);
        else {
            var contentArr = config["content"];
            var savedData = {};
            if (res) savedData = res["data"] || {};
            var rewardMap = savedData["rewardMap"] || {};
            var rewardedMap = savedData["rewardedMap"] || {};
            if (Object.keys(rewardMap).length > 0) { // 有奖励没有领取
                for (var key in contentArr) {
                    if (contentArr.hasOwnProperty(key)) {
                        var subContent = contentArr[key];
                        if (rewardMap.hasOwnProperty(subContent["complete"])) { // 显示该项
                            gRes["config"] = __duplicateObj(subContent); // 显示的配置
                            gRes["canGetReward"] = true; // 可以领取奖励
                            break;
                        }
                    }
                }
                for (var i in rewardMap){
                    gRes["rewardNum"]++;
                }

                if (!gRes.hasOwnProperty("config")) {
                    // 数据错误
                    callbackFn("user achievement data error.");
                    return;
                }
            } else { // 没有奖励可以领取
                var contentIdx = savedData["contentIdx"] || 0;
                if (contentIdx >= contentArr.length) {
                    contentIdx = contentArr.length - 1;
                }
                var subContent = contentArr[contentIdx];
                gRes["config"] = __duplicateObj(subContent);
                gRes["canGetReward"] = false;
            }

            // 字符串转换
            gRes["config"]["desc"] = jutil.toBase64(gRes["config"]["desc"]);
            // 返回是否已经领取
            gRes["alreadyGet"] = rewardedMap.hasOwnProperty(gRes["config"]["complete"]);
            callbackFn(null, gRes);
        }
    });
}
exports.getMapCompleteItem = __getMapCompleteItem;

/**
 * 构建基金购买项
 * @param userUid
 * @param config
 * @param callbackFn
 * @private
 */
function __getFundBuyItem(userUid, config, callbackFn) {
    var gRes = {
        "type":"fundBuy",
        "name": jutil.toBase64(config["name"]),
        "rewardNum":0
    };

    achievement.getData(userUid, "fundBuy", function(err, res){
        if (err) callbackFn(err);
        else {
            var contentArr = config["content"];
            var savedData = {};
            if (res) savedData = res["data"] || {};
            var rewardMap = savedData["rewardMap"] || {};
            var rewardedMap = savedData["rewardedMap"] || {};

            gRes["config"] = __duplicateObj(contentArr[0]);
            gRes["canGetReward"] = rewardMap.hasOwnProperty(1);
            gRes["fundBuy"] = (savedData["alreadyBuy"] || false) ? 1 : 0;

            if (!gRes.hasOwnProperty("config")) {
                callbackFn("configError");
            } else {
                for (var i in rewardMap){
                    gRes["rewardNum"]++;
                }
                // 字符串转换
                gRes["config"]["desc"] = jutil.toBase64(gRes["config"]["desc"]);
                // 返回是否已经领取
                gRes["alreadyGet"] = rewardedMap.hasOwnProperty(1);
                callbackFn(null, gRes);
            }
        }
    });
}

function __getHeroItem(userUid, config, callbackFn) {
    var gRes = {};
    achievement.getData(userUid, "getHero", function(err, res){
        if (err) callbackFn(err);
        else {
            var contentArr = config["content"];
            var savedData = {};
            if (res) savedData = res["data"] || {};
            var rewardMap = savedData["rewardMap"] || {};
            var rewardedMap = savedData["rewardedMap"] || {};
            for (var key in contentArr) {
                var subContent = contentArr[key];
                var gr = {"type": "getHero", "name":jutil.toBase64(config["name"]), "config":__duplicateObj(subContent), "canGetReward":false, "alreadyGet":false,"rewardNum":0};
                gr["config"]["desc"] = jutil.toBase64(gr["config"]["desc"]);
                gr["getHero"] = savedData["getHero"] || 0;
                if (rewardMap.hasOwnProperty(subContent["complete"])) { // 显示该项
                    gr["canGetReward"] = true;
                    gr["rewardNum"] = 1;
                } else if(rewardedMap.hasOwnProperty(subContent["complete"])){
                    gr["alreadyGet"] = true;
                }
                gRes[subContent["complete"]] = gr;
            }
            callbackFn(null, gRes);
        }
    });
}
exports.getHeroItem = __getHeroItem;
