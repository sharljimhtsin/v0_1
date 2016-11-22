/**
 * User: liyuluan
 * Date: 13-10-24
 * Time: 下午3:52
 */
var jutil = require("../utils/jutil");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var summon = require("../model/summon");
var user = require("../model/user");
var platform = require("../model/platform");
var hero = require("../model/hero");
var heroSoul = require("../model/heroSoul");
var gameModel = require("../model/gameModel");
var summonHeroLog = require("../model/summonHeroLog");
var activityConfig = require("../model/activityConfig");
var async = require("async");

var mongoStats = require("../model/mongoStats");

var timeLimitActivityReward = require("../model/timeLimitActivityReward");
var achievement = require("../model/achievement");
var stats = require("../model/stats");


var pointIndex = ["Bpoint", "Apoint", "Spoint", "BSpoint", "ASpoint", "SSpoint"];//数据库中加点的字段名
var addPointIndex = ["bHeroPoint", "aHeroPoint", "sHeroPoint", "bSoulPoint", "aSoulPoint", "sSoulPoint"];//配置中加点的字段名
var targetHero = ["bHero", "aHero", "sHero", "bHero0", "aHero0", "sHero0"];// 随机后对应的目标选择
var countIndex = ["Bcount", "Acount", "Scount", "Ccount", "Ccount", "Ccount"]; //抽中次数的累加


/**
 * 召唤(招募)
 * 参数：type   1 十里挑一  ，2 百里挑一， 3 万里挑一
 * 参数：currency free 免费召唤  pay 元宝召唤
 *
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    if (jutil.postCheck(postData, "type", "currency") == false) {
        response.echo("summon.roll", jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];
    var configData = configManager.createConfig(userUid);

    var type = postData["type"]; //召唤类型
    var currency = postData["currency"]; //使用免费还是付费
    var summonConfig = configData.getConfig("summonConfig");
    var summonHeroList = configData.getConfig("summonHeroList");
    var summonHeroListSelect = configData.getConfig("summonHeroListSelect");

    var summonConfigData = summonConfig[type]; //当前要召唤的项配置
    if (summonConfigData == null || (currency != "free" && currency != "pay")) {
        response.echo("summon.roll", jutil.errorInfo("valueError"));
        return;
    }

    var userHeroIdObject = {};//玩家拥有的hero列表

    var summonHistory = null;//玩家召唤的历史记录
    var resultHeroId; //随机出的heroId
    var resultIsSoul; //要随机的是否是魂魄
    var freeCountData;//免费数量的数据

    var resultUserIngot = 0;//玩家召唤后剩余ingot数
    var resultHeroSoul = null;//最终的魂魄
    var resultSoulCount = 0;// 给的魂的数量
    var resultHero = null;//最终的武将

    var resultRandomSoulTarget = null;//抽卡送魂的配置数据和目标
    var resultRandomSoul = null;//抽卡送的魂的数据

    var stats_summonPay = 0; //玩家需要花的元宝
    var userInfo = null; //玩家数据
    var userIP = '127.0.0.1';//response.response.socket.remoteAddress;

    var summonStar = summonConfigData["summonLevel"];

    async.series([
        function (cb) {
            user.lock(userUid, "ingot", function(err, res) {
                if (err) {
                    cb ("dbError");
                } else if (res == 0) {
                    cb ("dbError");
                } else {
                    cb(null);
                }
            });
        },
        function (cb) { //判断免费次数或元宝是否够
            if (currency == "free") { //如果是免费的，判断是否还有次数
                summon.getFreesummon(userUid, function (err, res) {
                    if (err) cb("dbError");
                    else {
                        if (res == null || res[type] == null) {
                            platform.getUserByUserUid(userUid, function (err, res) {
                                if (err || res == null) cb("dbError");
                                else freeCountHandler(summonConfigData, res["createTime"] - 24 * 60 * 60 * 3, 0, function (err, res) {
                                    freeCountData = res;
                                    cb(err, null);
                                });
                            });
                        } else {
                            var freesummonData = res[type];
                            freeCountHandler(summonConfigData, freesummonData["time"] - 0, freesummonData["count"] - 0, function (err, res) {
                                freeCountData = res;
                                cb(err, null);
                            });
                        }
                    }
                });
            } else { //如果是付费召唤
                user.getUser(userUid, function (err, res) {
                    if (err || res == null) cb("dbError");
                    else {
                        var summonPay = summonConfigData["summonPay"] - 0; //价格
                        userInfo = res;
                        stats_summonPay = summonPay;
                        if (summonPay > res["ingot"] - 0) cb("noRMB"); //判断玩家钱是否够
                        else {
                            resultUserIngot = res["ingot"] - summonPay;
                            cb(null);
                        }
                    }
                });
            }
        },

        function (cb) { //取玩家拥有的heroId列表
            hero.getHero(userUid, function (err, res) {
                if (err) cb("dbError");
                else {
                    var heroList = res;
                    for (var key in heroList) {
                        var mItem = heroList[key];
                        userHeroIdObject[mItem["heroId"]] = true;
                    }
                    cb(null, null);
                }
            });
        },
        function (cb) { //取玩家曾经拥有过的heroId列表 NEW (hero表 + summonHeroLog表)
            summonHeroLog.getSummonHeroLog(userUid, function (err, res) {
                if (err) cb("dbError");
                else if(res == null){
                    cb(null, null);
                }else {
                    for (var key in res) {
                        var mItem = res[key];
                        if(userHeroIdObject[mItem["heroId"]]==null) {
                            userHeroIdObject[mItem["heroId"]] = true;
                        }
                    }
                    cb(null, null);
                }
            });
        },

        function (cb) { //随机出需要的伙伴
            summon.getSummon(userUid, function (err, res) {
                if (err) cb("dbError");
                else {
                    if (res == null) summonHistory = getNullSummonHistory();
                    else summonHistory = res;
                }
                var pointAdd = null; //
                var summonCount = null; //玩家累积召唤此类别的次数
                var firstRoll = false; //是否第一次付费召唤

                if (currency == "free") {
                    pointAdd = summonConfigData["freePointAdd"]["pointAdd"];
                    summonCount = summonHistory["summonF" + type] - 0 + 1;
                    summonHistory["summonF" + type] = summonCount;
                } else {
                    pointAdd = summonConfigData["payPointAdd"]["pointAdd"];
                    summonCount = summonHistory["summon" + type] - 0 + 1;
                    summonHistory["summon" + type] = summonCount;
                    if (summonCount == 1 && type != 1) {
                        firstRoll = true;
                    }
                }
                var pointAddItem = null;
                for (var i = 0; i < pointAdd.length; i++) {
                    if (summonCount >= pointAdd[i]["summonCount"] - 0) { //当前召唤次数大于召唤次数
                        pointAddItem = pointAdd[i];
                    } else {
                        break;
                    }
                }

                var point100 = [];//累积点数大于100的项
//                if (firstRoll == true) {
//                    var first100 = 0;
//                    if (type == 2) { //如果第一次付费抽百里
//                        first100 = 1;
//                    } else if (type == 3) { //如果第一次付费抽万里
//                        first100 = 2;
//                    }
//                    var pointIndexName = pointIndex[first100];
//                    var addPointIndexName = addPointIndex[first100];
//                    summonHistory[pointIndexName] = (summonHistory[pointIndexName] - 0) + (pointAddItem[addPointIndexName] - 0);
//                    point100.push(first100);
//                } else {
//                    for (var i = 0; i < 6; i++) {
//                        var pointIndexName = pointIndex[i];
//                        var addPointIndexName = addPointIndex[i];
//                        summonHistory[pointIndexName] = (summonHistory[pointIndexName] - 0) + (pointAddItem[addPointIndexName] - 0);
//                        if (summonHistory[pointIndexName] >= 100 && typeInArray(type,i)) point100.push(i);//如果累积点数大于100并且此项是允许被些类别抽到的
//                    }
//                }


                for (var i = 0; i < 6; i++) {
                    var pointIndexName = pointIndex[i];
                    var addPointIndexName = addPointIndex[i];
                    summonHistory[pointIndexName] = (summonHistory[pointIndexName] - 0) + (pointAddItem[addPointIndexName] - 0);

                    if (firstRoll == true) {
                        if (type == 2 && i == 1) { //如果第一次付费抽百里
                            point100.push(1);
                        } else if (type == 3 && i == 2) { //如果第一次付费抽万里
                            point100.push(2);
                        }
                    } else {
                        if (summonHistory[pointIndexName] >= 100 && typeInArray(type, i)) point100.push(i);//如果累积点数大于100并且此项是允许被些类别抽到的
                    }
                }


                if (point100.length > 0) { //如果有大小100的项
                    var soulPointArray = arrayBigValue(point100, 3);
                    if (soulPointArray.length > 0) { //如果有魂，先处理魂
                        var randomIndex = soulPointArray[Math.floor(Math.random() * soulPointArray.length)];//随机到的索引
                        var randomName = targetHero[randomIndex];
                        var randomHeroList = summonHeroList[randomName]["heroList"]; //最终要随机的英雄列表
                        var haveHeroList = haveHeroId(randomHeroList, userHeroIdObject);
                        if (haveHeroList.length > 0) { //随机玩家拥有的hero的魂，如果列表中的武将玩家都没有拥有，则给hero
                            resultHeroId = haveHeroList[Math.floor(Math.random() * haveHeroList.length)];
                            resultIsSoul = true;
                        } else {
                            resultHeroId = randomHeroList[Math.floor(Math.random() * randomHeroList.length)];
                            resultIsSoul = false;
                        }
                        var pointIndexName = pointIndex[randomIndex];
                        summonHistory[pointIndexName] = summonHistory[pointIndexName] - 100;
                    } else {
                        var randomIndex = point100[Math.floor(Math.random() * point100.length)];//随机到的索引
                        var randomName = targetHero[randomIndex]; //目标hero字段名
                        var randomHeroListSelect = summonHeroListSelect[randomName]["heroList"]; //索引名
                        var countName = heroNameToCountName(randomName); //数据库选中项字段名
                        var selectedCount = summonHistory[countName] - 0;
                        var heroListId;
                        for (var i = 0; i < randomHeroListSelect.length; i++) {
                            var mItem = randomHeroListSelect[i];
                            if (selectedCount + 1 >= mItem["count"] - 0) {
                                heroListId = mItem["heroListId"];
                            } else {
                                break;
                            }
                        }
                        var randomHeroList = summonHeroList[heroListId]["heroList"];
                        var excludeHeroList = excludeHeroId(randomHeroList, userHeroIdObject);
                        if (excludeHeroList.length > 0) { //排除后如果列表中还有heroId，则随机剩下的，否则随机所有并转为魂
                            resultHeroId = excludeHeroList[Math.floor(Math.random() * excludeHeroList.length)];
                            resultIsSoul = false;
                        } else {
                            resultHeroId = randomHeroList[Math.floor(Math.random() * randomHeroList.length)];
                            resultIsSoul = true;
                        }
                        var pointIndexName = pointIndex[randomIndex];
                        var mNewPointValue = summonHistory[pointIndexName] - 100;
                        if (mNewPointValue < 0) mNewPointValue = 0;
                        summonHistory[pointIndexName] = mNewPointValue;
                        var countIndexName = countIndex[randomIndex];
                        summonHistory[countIndexName] = summonHistory[countIndexName] - 0 + 1;
                    }
                } else { //没有满一百分值
                    var hero0Name = typeToHero0Name(type);
                    var randomHeroList = summonHeroList[hero0Name]["heroList"];
                    var excludeHeroList = excludeHeroId(randomHeroList, userHeroIdObject);
                    if (excludeHeroList.length > 0) { //排除后如果列表中还有heroId，则随机剩下的，否则随机所有并转为魂
                        resultHeroId = excludeHeroList[Math.floor(Math.random() * excludeHeroList.length)];
                        resultIsSoul = false;
                    } else {
                        resultHeroId = randomHeroList[Math.floor(Math.random() * randomHeroList.length)];
                        resultIsSoul = true;
                    }
                }

                cb(null, null);
            });
        },

        function (cb) { //抽卡送魂
            activityConfig.getConfig(userUid, "summonSoul", function (err, activityArray) {
                if (err) {
                    cb("dbError");
                } else {
                    if (activityArray[0] == false) {
                        cb(null); //如果当前没活动
                    } else {
                        var randomConfig = null;//用于随机的配置
                        if (activityArray[1] == -1) {
                            randomConfig = activityArray[2];
                        } else {
                            if (activityArray[3] != null) randomConfig = activityArray[3][activityArray[1]];
                        }
                        if (randomConfig == null) {
                            cb(null);
                        } else {
                            resultRandomSoulTarget = randomSummonSoul(randomConfig, type);
                            //TODO: 根据 type 分支
                            stats.recordWithLevelIndex(type, [0, mongoStats.summonRoll1, mongoStats.summonRoll2], function (tag) {
                                stats.events(userUid, "127.0.0.1", null, tag);
                            });
                            cb(null);
                        }
                    }
                }
            });
        },

        function (cb) { //写入抽卡送魂随机到的魂
            if (resultRandomSoulTarget == null) {
                cb(null);
            } else {
                var mItem = resultRandomSoulTarget[0][resultRandomSoulTarget[1]];
                if (mItem == null) cb(null);
                else {
                    heroSoul.addHeroSoul(userUid, mItem["id"], mItem["count"], function (err, res) {
                        if (err) {
                            cb("dbError");
                        } else {
                            mongoStats.dropStats(mItem["id"], userUid, userIP, userInfo, mongoStats.SUMMON_GIVE, mItem["count"], 1, type);
                            resultRandomSoul = res;
                            cb(null);
                        }
                    });
                }
            }
        },

        function (cb) { //写入抽到的hero或heroSoul数据
            if (resultIsSoul == true) {//如果抽到的是魂
                var mStar = configData.g("hero")(resultHeroId)("star")();
                if (mStar == null) {
                    cb("configError");
                    return;
                }
                var mHeroGiveExp = configData.g("mixExpGive")(mStar)("heroGiveExp")();
                var mSoulGiveExp = configData.g("mixExpGive")(mStar)("soulGiveExp")();
                if (mHeroGiveExp == null || mSoulGiveExp == null) {
                    cb("configError");
                    return;
                }
                resultSoulCount = Math.floor(mHeroGiveExp / mSoulGiveExp);

                heroSoul.addHeroSoul(userUid, resultHeroId, resultSoulCount, function (err, res) {
                    if (err) cb("dbError", null);
                    else {
                        mongoStats.dropStats(resultHeroId, userUid, userIP, userInfo, mongoStats.SUMMON_SOUL, resultSoulCount, 1, type);
                        resultHeroSoul = res;
                        cb(null, null);
                    }
                });
            } else {
                var mHeroStar = configData.heroStar(resultHeroId);
                if (mHeroStar >= 4 && userInfo != null) {
                    gameModel.addNews(userUid, gameModel.SUMMON, userInfo["userName"], resultHeroId);
                }
                hero.addHero(userUid, resultHeroId, 0, 1, function (err, res) {
                    if (err) {
                        cb("dbError", null);
                        console.error("summon.roll", userUid, resultHeroId, err.stack);
                    } else {
                        mongoStats.dropStats(resultHeroId, userUid, userIP, userInfo, mongoStats.SUMMON_HERO, 1, 1, type);
                        resultHero = res;
                        cb(null, null);
                    }
                });
            }
        },
        function (cb) { //保存已抽到的hero NEW
            if (resultIsSoul == false){
                summonHeroLog.addSummonHeroLog(userUid,resultHeroId,function(err,res){
                    if (err) cb("dbError", null);
                    else {
                        cb(null, null);
                    }
                });
            }else{
                cb(null, null);
            }
        },
        function (cb) { //写入召唤的累积积分等信息
            summon.updateSummon(userUid, summonHistory, function (err, res) {
                cb(null, null);
                if (err) console.error("summon.roll", userUid, summonHistory, err.stack);
            });
        },
        function (cb) { //写入金币数或免费次数
            if (currency == "pay") {
                var newIngot = {"ingot": resultUserIngot};
                user.updateUser(userUid, newIngot, function (err, res) {
                    cb(null, null);
                });
            } else {
                summon.updateFreesummon(userUid, type, freeCountData["count"], freeCountData["time"], function (err, res) {
                    cb(null, null);
                });
            }
        }
    ], function (err, result) {

        user.unlock(userUid, "ingot", function(err, res) {
            //cb(null);
        });


        if (err) {
            response.echo("summon.roll", jutil.errorInfo(err));
        } else {

            if (type == 3) { // 终极召唤
                achievement.ultimateSummonTime(userUid, 1, function(){});
            }

            if (currency == "pay") {
                //var userIP = '127.0.0.1';//response.response.socket.remoteAddress;

                timeLimitActivityReward.summonTime(userUid, summonStar, 1, function(){
                    response.echo("summon.roll", {
                        "hero": resultHero,
                        "heroSoul": resultHeroSoul,
                        "soulCount": resultSoulCount,
                        "userIngot": resultUserIngot,
                        "randomSoul": resultRandomSoul,
                        "randomSoulTarget": resultRandomSoulTarget
                    });
                });


                mongoStats.expendStats("ingot", userUid, userIP, userInfo, mongoStats["E_SUMMON_ROLL_" + type], stats_summonPay);
            } else {
 //               timeLimitActivityReward.summonTime(userUid, summonStar, 1, function(){
                    response.echo("summon.roll", {
                        "hero": resultHero,
                        "heroSoul": resultHeroSoul,
                        "soulCount": resultSoulCount,
                        "free": {"type": type, "count": freeCountData["count"], "time": freeCountData["time"]},
                        "randomSoul": resultRandomSoul,
                        "randomSoulTarget": resultRandomSoulTarget
                    });
//                });
            }
        }

    });
}


//在hero列表中排除我已拥有的heroId
function excludeHeroId(heroArray, heroObject) {
    var newArray = [];
    for (var i = 0; i < heroArray.length; i++) {
        var mHeroId = heroArray[i];
        if (heroObject[mHeroId] == null) {
            newArray.push(mHeroId);
        }
    }
    return newArray;
}

//在hero列表中找到我已拥有的heroId
function haveHeroId(heroArray, heroObject) {
    var newArray = [];
    for (var i = 0; i < heroArray.length; i++) {
        var mHeroId = heroArray[i];
        if (heroObject[mHeroId] != null) {
            newArray.push(mHeroId);
        }
    }
    return newArray;
}


//在没有匹配的时候选择的类别
function typeToHero0Name(type) {
    if (type == 1) return "cHero0";
    else if (type == 2) return "bHero0";
    else if (type == 3) return "aHero0";
}

//能过hero类别name查找 某个hero被抽中的次数的变量名
function heroNameToCountName(heroName) {
    var countName;
    switch (heroName) {
        case "bHero":
            countName = "Bcount";
            break;
        case "aHero":
            countName = "Acount";
            break;
        case "sHero":
            countName = "Scount";
            break;
        default :
            countName = "Ccount";
            break;
    }
    return countName;
}


//判断是否还有免费次数
function freeCountHandler(config, time, count, cb) {
    var cd = config["cd"] - 0;
    var maxCount = config["maxCount"] - 0;
    var mNow = jutil.now();

    if (jutil.compTimeDay(time, mNow) == true) { //上次免费召唤是今天
        if (count >= maxCount) cb("freeCountInvalid"); //当天免费次数已用完
        else if (mNow - time < cd) cb("freeCDInvalid");//还没未冷却
        else cb(null, {"time": mNow, "count": count + 1});
    } else {//上次召唤过了一天
        if (mNow - time < cd) cb("freeCDInvalid");//未冷却
        else cb(null, {"time": mNow, "count": 1});
    }
}


//返回数组中大于某个值的新数组
function arrayBigValue(array, value) {
    var newArr = [];
    for (var i = 0; i < array.length; i++) {
        if (array[i] >= value) newArr.push(array[i]);
    }
    return newArr;
}

//判断某个类别是否可以抽出对应该的伙伴
function typeInArray(type, value) {
    var typeObject = {"1": [0, 3], "2": [0, 3, 1, 4, 2, 5], "3": [1, 4, 2, 5]};
    var typeArray = typeObject[type];
    if (typeArray.indexOf(value) == -1) {
        return false;
    } else {
        return true;
    }
}


//默认的加点值
function getNullSummonHistory() {
    var nullHistory = {
        "Ccount": 0,
        "Bcount": 0,
        "Acount": 0,
        "Scount": 0,
        "Bpoint": 0,
        "Apoint": 0,
        "Spoint": 0,
        "BSpoint": 0,
        "ASpoint": 0,
        "SSpoint": 0,
        "summon1": 0,
        "summon2": 0,
        "summon3": 0,
        "summonF1": 0,
        "summonF2": 0,
        "summonF3": 0
    };
    return nullHistory;
}


//招募送魂活动。
// 返回，  [所有魂列表， 被选中的索引]
function randomSummonSoul(config, type) {
    if (config == null) return null;

    var mConfig = null;
    if (type == 2) {
        mConfig = config["seniorSummon"];
    } else if (type == 3) {
        mConfig = config["ultimateSummon"];
    }

    if (mConfig == null) return null;

    var randomList = [];//用于随机的列表
    var randomProbList = []; //随机的权值列表
    var sumProb = 0;

    for (var i = 0; i < mConfig.length; i++) {
        var probItem = [];
        randomList.push({"id": mConfig[i]["id"], "count": mConfig[i]["count"]});
        probItem.push(sumProb);
        sumProb += (mConfig[i]["prob"] - 0);
        probItem.push(sumProb);
        randomProbList.push(probItem);
    }
    var randomValue = Math.random() * sumProb;
    for (var i = 0; i < randomProbList.length; i++) {
        if (randomValue >= randomProbList[i][0] && randomValue < randomProbList[i][1]) {
            return [randomList, i];
        }
    }
    return null;
}


exports.start = start;


//
//
//
//
//
//summonHistory["Bpoint"] = (summonHistory["Bpoint"] - 0) + (pointAddItem["bHeroPoint"] - 0);
//summonHistory["Apoint"] = (summonHistory["Apoint"] - 0) + (pointAddItem["aHeroPoint"] - 0);
//summonHistory["Spoint"] = (summonHistory["Spoint"] - 0) + (pointAddItem["sHeroPoint"] - 0);
//summonHistory["BSpoint"] = (summonHistory["BSpoint"] - 0) + (pointAddItem["bSoulPoint"] - 0);
//summonHistory["ASpoint"] = (summonHistory["ASpoint"] - 0) + (pointAddItem["aSoulPoint"] - 0);
//summonHistory["SSpoint"] = (summonHistory["SSpoint"] - 0) + (pointAddItem["sSoulPoint"] - 0);
//
//
//
//var soulPoint = [];
//if (summonHistory["BSpoint"] >= 100 && typeInArray(type,"B") == true) soulPoint.push("bHero0");
//if (summonHistory["ASpoint"] >= 100 && typeInArray(type,"A") == true) soulPoint.push("aHero0");
//if (summonHistory["SSpoint"] >= 100 && typeInArray(type,"S") == true) soulPoint.push("sHero0");
//if (soulPoint.length > 0) { //配置到魂
//    var randomIndex = Math.floor(Math.random() * soulPoint.length);
//    var randomName = soulPoint[randomIndex];
//    randomHeroList = summonHeroList[randomName]["heroList"]; //最终要随机的英雄列表
//    isSoul = true;
//} else {
//    var heroPoint = [];
//    if (summonHistory["Bpoint"] >= 100 && typeInArray(type,"B") == true) heroPoint.push("bHero");
//    if (summonHistory["Apoint"] >= 100 && typeInArray(type,"A") == true) heroPoint.push("aHero");
//    if (summonHistory["Spoint"] >= 100 && typeInArray(type,"S") == true) heroPoint.push("sHero");
//    if (heroPoint.length > 0) { //配置到伙伴
//        var randomIndex = Math.floor(Math.random() * heroPoint.length);
//        var randomName = heroPoint[randomIndex];
//        var randomHeroListSelect = summonHeroListSelect[randomName]["heroList"];
//        var countName = heroNameToCountName(randomName);
//        var selectedCount = summonHistory[countName] - 0;
//        var heroListId;
//        for (var i = 0; i < randomHeroListSelect.length; i++) {
//            var mItem = randomHeroListSelect[i];
//            if (selectedCount + 1 >= mItem["count"] - 0) {
//                heroListId =  mItem["heroListId"];
//            } else {break;}
//        }
//        randomHeroList = summonHeroList[heroListId]["heroList"];
//        isSoul = false;
//    } else { //都不匹配，从某个hero0中取
//        var hero0Name = typeToHero0Name(type);
//        randomHeroList = summonHeroList[hero0Name]["heroList"];
//        isSoul = false;
//    }
//}