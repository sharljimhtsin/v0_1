/**
 * 奇遇中使用点拨 (群体的指点)
 * User: liyuluan
 * Date: 13-11-20
 * Time: 上午11:12
 */
var jutil = require("../utils/jutil");
var teach = require("../model/teach");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var user = require("../model/user");
var hero = require("../model/hero");
var itemModel = require("../model/item");
var formation = require("../model/formation");
var async = require("async");
var achievement = require("../model/achievement");
var mongoStats = require("../model/mongoStats");


/**
 * 参数
 *  teachUid  指点的uid
 *  double （值为0 或 1) 表示是否双重拜谢
 *  otherTeach   vip额外加经验列表
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    if (jutil.postCheck(postData, "teachUid") == false) {
        response.echo("practice.teach", jutil.errorInfo("postError"));
        return;
    }
    var itemId = "151501";//超圣水（女儿红）道具ID

    var userUid = query["userUid"];
    var teachUid = postData["teachUid"];
    var isDouble = postData["double"] || false;
    var otherTeach = postData["otherTeach"] || [];
    var configData = configManager.createConfig(userUid);

    var teachConfig = configData.getConfig("teach");
    var playerConfig = configData.getConfig("player");
    var shopConfig = configData.getConfig("shop");
    var currentTeachConfig = null;

    var gTeachData = null;//当前teach数据
    var gFormationHeroUid = null;//当前编队的heroUid
    var gUserLevel = null;//当前玩家等级
    var gUserHeroList = null;
    var gNeedItemCount = 0;//需要扣除的女儿红数量
    var gUserVip = 0;//玩家VIP等级
    var gUserIngot = 0;//用户元宝数
    var gNeedIngot = 0;//需要元宝(如果没有女儿红直接扣钱)
    var gUserData = null;

    var resultHeroData = {};
    var resultItemData = null;

    async.series([
        function (cb) { //取数据库中的指点项
            teach.getTeach(userUid, teachUid, function (err, res) {
                if (err) cb("dbError");
                else if (res == null) cb("noTeachUid");
                else {
                    gTeachData = res;
                    var mLevel = gTeachData["level"];
                    currentTeachConfig = teachConfig[mLevel];
                    var timeConfig = currentTeachConfig["time"] - 0; //指点倒计时
                    var teachItemTime = gTeachData["time"] - 0; //teach掉落时间
                    if (teachItemTime + timeConfig <= jutil.now()) {
                        cb(null);
                    } else {
                        cb("teachCDInvalid"); //拥有的指点时间没到
                    }
                }
            });
        },
        function (cb) { //双重拜谢
            if (isDouble == true) {
                itemModel.getItem(userUid, itemId, function (err, res) {
                    if (err) cb("dbError");
                    else {
                        var mItemCount = (res == null) ? 0 : res["number"] - 0;
                        if (mItemCount >= currentTeachConfig["waterCost"] - 0) {
                            gNeedItemCount = currentTeachConfig["waterCost"] - 0;
                            cb(null);
                        } else {
                            var needItemCount = currentTeachConfig["waterCost"] - 0;
                            var buyCount = needItemCount - mItemCount;
                            gNeedItemCount = mItemCount;
                            gNeedIngot = (shopConfig[itemId]["buyPrice"] - 0) * buyCount;
                            cb(null);
                        }
                    }
                });
            } else {
                cb(null);
            }
        },
        function (cb) { //取编队的heroUid
            formation.getUserFormation(userUid, function (err, res) {
                if (err) cb("dbError");
                else {
                    gFormationHeroUid = [];
                    for (var key in res) {
                        var mItem = res[key];
                        gFormationHeroUid.push(mItem["heroUid"]);
                    }
                    cb(null);
                }
            });
        },
        function (cb) { //用户的hero列表
            hero.getHero(userUid, function (err, res) {
                if (err) cb(err);
                else {
                    gUserHeroList = res; //用户hero列表
                    cb(null);
                }
            });
        },
        function (cb) { //取用户VIP等级
            user.getUser(userUid, function (err, res) {
                if (err || res == null) cb("dbError");
                else {
                    //var userExp = res["exp"];
                    //var userLevel = configData.userExpToLevel(userExp);
                    gUserLevel = res["lv"];
                    gUserVip = res["vip"];
                    gUserIngot = res["ingot"];
                    gUserData = res;

                    if (gUserIngot < gNeedIngot) { //用户拥有的元宝数小于需要的元宝数
                        cb("ingotNotEnough");
                        return;
                    }

                    var otherTeachCount = configData.getConfig("vip")[gUserVip]["otherTeachCount"] - 0;
                    if (otherTeach.length > otherTeachCount) {
                        cb("otherTeachError");
                    } else {
                        cb(null);
                    }
                }
            });
        },
        function (cb) { //加经验值
            var playerLevelConfig = playerConfig[gUserLevel];
            var getHeroExp = playerLevelConfig["getHeroExp"] - 0;
            var expRatio = currentTeachConfig["expRatio"] - 0;
            var mExp = getHeroExp * expRatio;
            async.eachSeries(Object.keys(gFormationHeroUid), function (key, forCb) {
                var item = gFormationHeroUid[key];
                var heroData = gUserHeroList[item];
                if (heroData != null) {
                    var multiple = 1; //如果有额外加点拨的hero则倍数乘2
                    if (isDouble) multiple += 1;
                    if (otherTeach.indexOf(item) != -1) multiple += 1;
                    var mNewHeroExp = heroData["exp"] - 0 + mExp * multiple;
                    var maxHeroExp = configData.heroMaxExp(heroData["heroId"], gUserLevel);

                    if (mNewHeroExp > maxHeroExp) {
                        mNewHeroExp = maxHeroExp;
                    }

//                    console.log("得到EXP", mExp * multiple);
                    var heroId = heroData["heroId"];
                    var mNewLevel = configData.heroExpToLevel(heroId, mNewHeroExp);
                    var mNewHeroData = {"exp": mNewHeroExp, "level": mNewLevel};
                    resultHeroData[item] = {"exp": mNewHeroExp, "level": mNewLevel};
                    hero.updateHero(userUid, item, mNewHeroData, function (err, res) {
                        if (err) forCb(err);
                        else forCb(null);
                    });
                }
            }, function (err) {
                if (err) cb("dbError");
                else cb(null);
            });
//            async.forEach(gFormationHeroUid, function (item, forCb) {
//                var heroData = gUserHeroList[item];
//                if (heroData != null) {
//                    var multiple = 1; //如果有额外加点拨的hero则倍数乘2
//                    if (isDouble) multiple += 1;
//                    if (otherTeach.indexOf(item) != -1) multiple += 1;
//                    var mNewHeroExp = heroData["exp"] - 0 + mExp * multiple;
//                    var maxHeroExp = configData.heroMaxExp(heroData["heroId"], gUserLevel);
//
//                    if (mNewHeroExp > maxHeroExp) {
//                        mNewHeroExp = maxHeroExp;
//                    }
//
////                    console.log("得到EXP", mExp * multiple);
//                    var heroId = heroData["heroId"];
//                    var mNewLevel = configData.heroExpToLevel(heroId, mNewHeroExp);
//                    var mNewHeroData = {"exp": mNewHeroExp, "level": mNewLevel};
//                    resultHeroData[item] = {"exp": mNewHeroExp, "level": mNewLevel};
//                    hero.updateHero(userUid, item, mNewHeroData, function (err, res) {
//                        if (err) forCb(err);
//                        else forCb(null);
//                    });
//                }
//            }, function (err) {
//                if (err) cb("dbError");
//                else cb(null);
//            });
        },
        function (cb) { //减女儿红
            if (gNeedItemCount == 0) cb(null);
            else {
                itemModel.updateItem(userUid, itemId, -gNeedItemCount, function (err, res) {
                    resultItemData = res;
                    cb(null);
                    var mongoStats = require("../model/mongoStats");
                    mongoStats.expendStats(itemId, userUid, '127.0.0.1', gUserData, mongoStats.E_TEACH, gNeedItemCount);
                    if (err) console.error(userUid, itemId, -gNeedItemCount, err.stack);
                });
            }
        },
        function (cb) { //减元宝
            if (gNeedIngot <= 0) cb(null);
            else {
                user.updateUser(userUid, {"ingot": gUserIngot - gNeedIngot}, function (err, res) {
                    cb(null);
                    mongoStats.expendStats("ingot", userUid, '127.0.0.1', gUserData, mongoStats.E_TEACH, gNeedIngot);
                    if (err) console.error(userUid, gUserIngot, gNeedIngot, err.stack);
                });
            }
        },
        function (cb) {
            teach.delTeach(userUid, teachUid, function (err, res) {
                cb(null);
                if (err) console.error("practice.teach", userUid, teachUid, err.stack);
            });
        },
        function(cb) { // 成就数据统计
            if (gNeedItemCount == 0) cb(null);
            else {
                achievement.superWaterUse(userUid, gNeedItemCount, function(){
                    cb(null);
                });
            }
        }
    ], function (err) {
        if (err) response.echo("practice.teach", jutil.errorInfo(err));
        else {
            response.echo("practice.teach", {"heroData": resultHeroData, "itemData": resultItemData, "userIngot": gUserIngot - gNeedIngot});
        }
    });
}

exports.start = start;