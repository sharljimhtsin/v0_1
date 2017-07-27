/**
 * 吃指点
 * User: liyuluan
 * Date: 13-11-20
 * Time: 下午6:08
 */
var jutil = require("../utils/jutil");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var teach = require("../model/teach");
var item = require("../model/item");
var hero = require("../model/hero");
var async = require("async");
var user = require("../model/user");
var mongoStats = require("../model/mongoStats");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "teachUid", "heroUid") == false) {
        response.echo("practice.worldBossTeach", jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];
    var teachUid = postData["teachUid"];
    var heroUid = postData["heroUid"];
    var itemCount = postData["itemCount"] ? postData["itemCount"] : 1;

    var configData = configManager.createConfig(userUid);
    var userLevel = 0;
    var gTeachLevel = 1;
    var gHeroData = null;
    var gNewHeroData = null;
    var addExp = 0;
    var updateItem = [];
    var itemConfig = configData.getConfig("item");
    var recItem = itemConfig[teachUid];
    var maxExp = 0;
    var newHeroExp = 0;
    var heroExp = 0;
    var heroId;
    var newHeroLevel = 0;
    var heroLevel = 0;
    var endLevel = 0;
    async.series([
        function (cb) {
            user.getUser(userUid, function (err, res) {
                if (err) cb("dbError");
                else {
                    userLevel = res["lv"];
                    cb(null);
                }
            });
        },
        function (cb) { //取hero信息
            hero.getHero(userUid, function (err, res) {
                if (err) cb("dbError");
                else if (res == null) cb("heroNotExist");
                else {
                    var heroData = res[heroUid];
                    if (heroData == null) cb("heroNotExist");
                    else {
                        gHeroData = heroData;
                        cb(null);
                    }
                }
            });
        },
        function (cb) { // 区别是指点还是经验卡片
            heroExp = gHeroData["exp"] - 0;
            heroId = gHeroData["heroId"];
            heroLevel = configData.heroExpToLevel(heroId, heroExp);
            maxExp = configData.heroMaxExp(heroId, userLevel);
            if(userLevel * 4 < 100){
                endLevel = 100;
            }else{
                endLevel = userLevel * 4;
            }
            if(itemConfig[teachUid]==null){ // 使用指点
                usedWorldBossTeach(userUid, teachUid, function(err,res){
                    if(err) cb(err);
                    else {
                        var exp = res-0;
                        newHeroExp = heroExp + exp * itemCount;
                        newHeroLevel = configData.heroExpToLevel(heroId, newHeroExp);
                        if(newHeroExp > maxExp && newHeroLevel >= endLevel){
                            cb("levelOverflow");//等级超过上限
                        }else{
                            addExp = exp * itemCount;
                            teach.delWorldBossTeach(userUid, teachUid, function (err, res) {
                                var userIP = '127.0.0.1';
                                mongoStats.expendStats("teach"+gTeachLevel, userUid, userIP, null, mongoStats.TEACH);
                                cb(null);
                                if (err) console.error("practice.worldBossTeach", userUid, teachUid, err.stack);
                            });
                        }
                    }
                });
            }else{// 使用经验卡片
                if (recItem["itemType"] != 31) cb("postError");
                else {
                    var expendExp = (recItem["typeValue"]-0) * itemCount;
                    newHeroExp = heroExp + expendExp;
                    newHeroLevel = configData.heroExpToLevel(heroId, newHeroExp);
                    if(newHeroExp > maxExp &&  newHeroLevel >= endLevel){
                        cb("levelOverflow");//等级超过上限
                    }else{
                        async.series([function (sCb) {
                            item.getItem(userUid, teachUid, function (err, res) {
                                if (err) {
                                    sCb(err);
                                } else if (res == null) {
                                    sCb("postError");
                                } else {
                                    var mNum = (res == null) ? 0 : res["number"];
                                    sCb(itemCount > mNum ? "postError" : null);
                                }
                            });
                        }, function (sCb) {
                            async.timesSeries(itemCount, function (n, next) {
                                usedItem(userUid, teachUid, function (err, res) {
                                    if (err) next(err);
                                    else {
                                        addExp += res["addExp"] - 0;
                                        updateItem = res["updateItem"];
                                        next(null);
                                    }
                                });
                            }, function (err, res) {
                                sCb(err);
                            });
                        }], function (err, res) {
                            cb(err);
                        });
                    }
                }
            }
        },
        function (cb) { //加经验值
            //var addExp = (expRatioConfig[gTeachLevel + 1] - expRatioConfig[gTeachLevel]) * 100;
            if(newHeroExp > maxExp){
                newHeroExp = maxExp;
            }
            gNewHeroData = {"exp": newHeroExp, "level": newHeroLevel};
            hero.updateHero(userUid, heroUid, gNewHeroData, function (err, res) {
                if (err) cb("dbError");
                else {
                    cb(null);
                }
            });
        }
    ], function (err) {
        if (err) response.echo("practice.worldBossTeach", jutil.errorInfo(err));
        else {
            var returnData = {};
            returnData[heroUid] = gNewHeroData;
            returnData["updateItem"] = updateItem;

            response.echo("practice.worldBossTeach", returnData);
        }
    });
}

exports.start = start;

// 使用指点
function usedWorldBossTeach(userUid, teachUid, callbackFn){
    var configData = configManager.createConfig(userUid);
    var expRatioConfig = configData.getConfig("expRatio");

    var gTeachLevel = 1;
    var addExp = 0;

    async.series([
        function (cb) { //取指点信息
            teach.getWorldBossTeach(userUid, teachUid, function (err, res) {
                if (err) cb("dbError");
                else if (res == null) cb("noTeachUid");
                else {
                    gTeachLevel = res["level"] || 1;
                    cb(null);
                }
            });
        },
        function (cb){ // 计算加的经验值
            addExp = (expRatioConfig[gTeachLevel + 1] - expRatioConfig[gTeachLevel]) * 100;
            cb(null);
        }
    ], function (err) {
        if (err) callbackFn(err);
        else {
            callbackFn(null,addExp);
        }
    });
}

// 使用经验卡片
function usedItem(userUid, teachUid, callbackFn){
    var configData = configManager.createConfig(userUid);
    var itemConfig = configData.getConfig("item");
    var addExp = 0;
    var updateItem = [];
    async.series([
        function (cb) { //验证是否有经验卡片
            item.getItem(userUid, teachUid ,function(err,res){
                if (err) cb("dbError");
                else if (res == null || res["number"]-0<=0) cb("noItem");
                else cb(null);
            })
        },
        function (cb) { //使用经验卡片
            mongoStats.expendStats(teachUid, userUid, '127.0.0.1', null, mongoStats.TEACH, 1);
            item.updateItem(userUid, teachUid,-1, function (err, res) {
                updateItem.push(res);
                cb(err);
            });
        },
        function (cb){ // 取经验值
            addExp = itemConfig[teachUid]["typeValue"];
            cb(null);
        }
    ], function (err) {
        if (err) callbackFn(err);
        else {
            callbackFn(null,{"addExp":addExp, "updateItem":updateItem});
        }
    });
}