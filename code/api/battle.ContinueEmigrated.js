/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 13-11-11
 * Time: 下午6:25
 * 连闯接口
 * To change this template use File | Settings | File Templates.
 */
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var map = require("../model/map");
//var configData = require("../model/configData");
var battle = require("../model/battle");
var teach = require("../model/teach");
var debris = require("../model/debris");
var heroSoul = require("../model/heroSoul");
var itemType = require("../model/item");
var equipment = require("../model/equipment");
var skill = require("../model/skill");
var hero = require("../model/hero");
var configManager = require("../config/configManager");
var userVariable = require("../model/userVariable");
var activityConfig = require("../model/activityConfig");
var mongoStats = require("../model/mongoStats");
var vitality = require("../model/vitality");
var achievement = require("../model/achievement");

function start(postData, response, query) {
    var userUid = query["userUid"];
    if (jutil.postCheck(postData, "mapId", "fightTimes") == false) {//mode:战斗模式(easy：普通 hard：困难)
        response.echo("battle.ContinueEmigrated", jutil.errorInfo("postError"));
        return;
    }
    var mapId = postData["mapId"];
    var postMode = (postData["mode"]==undefined)? 'easy':postData["mode"];
    var fightTimes = (postData["fightTimes"] - 0);
    var vipConfig = configManager.createConfig(userUid).getConfig("vip");
    var userData;
    var mapData;
    var userUpdateData = {};
    var mapUpdateData = {};
    var returnData = {};
    var mapReward = [];
    var formationList;
    var heroList;
    var continueData;
    var multiplesConfig;
    var multiples;

    // 检测模式参数是否有效
    var modeList = battle.getModeList();
    if(modeList[postMode]==undefined){//传递模式参数不存在，无效
        response.echo("battle.ContinueEmigrated", jutil.errorInfo("postError"));
        return;
    }

    async.auto({
        "checkMapId":function(cb){// 检测mapId是否存在
            var mapConfig = configManager.createConfig(userUid).getConfig(battle.getModeMap(postMode));
            if(mapConfig[mapId]==undefined) cb("mapNotExist", null);
            else cb(null, null);
        },
        "getActivityConfig":["checkMapId", function(cb){//获取活动配置
            activityConfig.getConfig(userUid, "mapRewardMC", function(err, res) {
                var configArray = res;
                if (configArray[0] == false) {
                    multiplesConfig = {"mapRewardMC":1};
                } else if(configArray[1] == 0){//活动参数是0  取默认2倍
                    multiplesConfig = {"mapRewardMC":2};
                }else{
                    multiplesConfig = configArray[2] || {}; //如果报错，取默认为1的项
                }
                multiples = multiplesConfig["mapRewardMC"] != null ? (multiplesConfig["mapRewardMC"] - 0) : 1;
                cb(null,null);
            });
        }],
        "getJudgeNeedData":["getActivityConfig", function (cb) {//获取判断是否可以战斗的信息
            battle.getMapJudgeNeedData(userUid, mapId, function (err, res) {
                if (err) {
                    cb(err, null);
                } else {
                    userData = res["userData"];
                    mapData = res["mapItem"];
                    formationList = res["formationList"];
                    heroList = res["heroList"];
                    continueData = res["continueData"];
                    cb(null, null);
                }
            });
        }],
        "judgeCanFight": ["getJudgeNeedData", function (cb) {
            var vipItem = vipConfig["" + userData["vip"]];
            var pvePower = (userData["pvePower"] - 0);
            //var mapConfig = configManager.createConfig(userUid).getConfig("map");
            var mapConfig = configManager.createConfig(userUid).getConfig(battle.getModeMap(postMode));
            var mapMaxFightTimes = (mapConfig[mapId]["totlesTimes"] - 0);
            var lastRecoverPvePower = (userData["lastRecoverPvePower"] - 0);
            var intervalTime = jutil.now() - lastRecoverPvePower;
            var preTime = (mapData["preTime"] - 0); //最后一次打副本的时间
            var mapNum = (mapData["number"] - 0);
            var powerTime = configManager.createConfig(userUid).getPvePower(pvePower, lastRecoverPvePower, jutil.now());
            var purePower = powerTime[0];
            var cdTime = (continueData["value"] - 0);
            var fightTime = (continueData["time"] - 0);

            if ((fightTime + cdTime) > jutil.now() && cdTime != 0 && vipItem["haveSuccessiveBattleCd"] != 1) {
                cb("CDing", null);
                return;
            }
            var pureChangeTimes = jutil.compTimeDay(preTime, jutil.now()) ? mapNum : 0;
            if (purePower < fightTimes) {//体力不足
                cb("physicalShortagePVE", null);
                return;
            } else if ((pureChangeTimes + fightTimes) > mapMaxFightTimes) { //超过了挑战次数
                cb("pveOverTimes", null);
                return;
            } else if (vipItem["canSuccessiveBattle"] == 0) {
                cb("vipNotEnough", null);
                return;
            } else {
                userUpdateData["pvePower"] = purePower - fightTimes;
                userUpdateData["lastRecoverPvePower"] = powerTime[1];
                mapUpdateData["preTime"] = jutil.now();
                mapUpdateData["mapId"] = mapId;
                mapUpdateData["number"] = pureChangeTimes + fightTimes;
                cb(null, null);
            }
        }],
        "calculateReward": ["judgeCanFight", function (cb) {//计算奖励
            getRewardByTimes(postMode,mapId, userData, true, false, fightTimes, multiples, function (err, res) {
                if (err) {
                    cb(err, null);
                } else {
                    mapReward = res;
                    cb(null, null);
                }
            });
        }],
        "updateDb": ["judgeCanFight", "calculateReward", function (cb) {//更新数据库
            userUpdateData["exp"] = (userData["exp"] - 0);
            userUpdateData["gold"] = (userData["gold"] - 0);
            for (var i = 0; i < mapReward.length; i++) {
                var itemReward = mapReward[i];
                userUpdateData["exp"] += (itemReward["userData"]["exp"] - 0);
                userUpdateData["gold"] += (itemReward["userData"]["gold"] - 0);
                mongoStats.dropStats("gold", userData["userUid"], '127.0.0.1', userData, mongoStats.BATTLE_PVES, itemReward["userData"]["gold"]);
            }
            returnData["updateUser"] = userUpdateData;
            returnData["mapUpdate"] = mapUpdateData;
            returnData["reward"] = mapReward;
            updateDb(userData, userUpdateData, mapReward, mapUpdateData, formationList, heroList, fightTimes, function (err, res) {
                if (err) {
                    cb(err, res);
                } else {
                    returnData["CDing"] = res;
                    cb(null, null);
                }
            })
        }]
    }, function (err, res) {
        if (err) {
            response.echo("battle.ContinueEmigrated", jutil.errorInfo(err));
        } else {
            vitality.vitality(userUid, "map", {"completeCnt":fightTimes}, function(){});
            achievement.mapComplete(userUid, mapId, function(){
                achievement.mapTime(userUid, fightTimes, function(){
                    response.echo("battle.ContinueEmigrated", returnData);
                });
            });
        }
    });
}
function updateDb(userData, updateUser, mapReward, updateMap, formation, heroList, fightTimes, callBack) {
    var mapExp;
    var dropArr = [];
    var totleExp = 0;
    var returnValue = {};
    mapExp = (mapReward[0]["heroExp"] - 0);
    for (var i = 0; i < mapReward.length; i++) {
        dropArr.push(mapReward[i]["drop"]);
        totleExp += mapExp;
    }
    async.auto({
        "writeHeroExpToDb": function (cb) {//跟掉落同步将英雄经验写入数据库
            var updateHeroArr = [];
            var configData = configManager.createConfig(userData["userUid"]);
            //var userLevel = configData.userExpToLevel(userData["exp"]);
            var heroFinalExpArr = {};
            for (var key in formation) {
                var item = formation[key];
                var heroUid = item["heroUid"];
                var hero = heroList[heroUid];
                hero["exp"] = (hero["exp"] - 0) + totleExp;
                var maxExp = configData.heroMaxExp(hero["heroId"], userData["lv"]);
                hero["level"] = configData.heroExpToLevel(hero["heroId"], hero["exp"]);
                if (hero["exp"] >= maxExp) {
                    hero["exp"] = maxExp;
                    hero["level"] = configData.heroExpToLevel(hero["heroId"], maxExp);
                }
                heroFinalExpArr[key] = hero["exp"];
                updateHeroArr.push(hero);
            }
            returnValue["heroFinalExpArr"] = heroFinalExpArr;
            updateHero(userData["userUid"], updateHeroArr, function (err, res) {
                cb(err, res);
            })
        },
        writeToValue: ["writeHeroExpToDb", function (cb) {
            var userVip = userData["vip"];
            var userUid = userData["userUid"];
            var vipConfig = configManager.createConfig(userUid).getConfig("vip");
            var mainConfig = configManager.createConfig(userUid).getConfig("main");
            var value = 0;
            var time = jutil.now();
            var hasCD = vipConfig["" + userVip]["haveSuccessiveBattleCd"] - 0;
            if (hasCD == 0) {
                value = fightTimes * (mainConfig["successiveBattleCd"] - 0);
            }
            returnValue["value"] = value;
            returnValue["time"] = time;
            userVariable.setVariableTime(userUid, "continueValue", value, time, function (err, res) {
                cb(err, res);
            });
        }],
        writeMapToDb: ["writeHeroExpToDb", function (cb) {//地图数据需要等奖励成功后在写入数据库
            map.updateMap(userData["userUid"], updateMap["mapId"], updateMap, function (err, res) {
                cb(err, res);
            });
        }],
        writeUserDataToDb: ["writeHeroExpToDb", function (cb) {//用户数据更新
            user.updateUser(userData["userUid"], updateUser, function (err, res) {
                cb(err, res);
            });
        }]
    }, function (err, res) {
        if (err) {
            callBack(err, res);
        } else {
            callBack(null, returnValue);
        }
    });
}
function getRewardByTimes(mode,mapId, userData, isWin, firstThree, times,multiples, callBack) {
    var sArr = [];
    var returnData = [];
    for (var i = 0; i < times; i++) {
        sArr.push(i);
    }
    async.forEachSeries(sArr, function (item, cb) {
        battle.calculateMapReward(mode,mapId, userData, isWin, firstThree, function (err, mapReward) {
            if (err) {
                cb(err, null);
            } else {
                mapReward["heroExp"] =  mapReward["heroExp"] * multiples;
                mapReward["userData"]["exp"] =  mapReward["userData"]["exp"] * multiples;
                mapReward["userData"]["gold"] =  mapReward["userData"]["gold"] * multiples;
                returnData.push(mapReward);
                var drop = mapReward["drop"];
                if (drop["equipData"] != null) {
                    var dropOtherData = drop["equipData"];
                    var dropId = dropOtherData["id"];
                    var dropCount = dropOtherData["count"];
                    var isPatch = dropOtherData["isPatch"] == undefined?0:1;
                    mongoStats.dropStats(dropId, userData["userUid"], '127.0.0.1', userData, mongoStats.BATTLE_PVES, dropCount, 1, isPatch);
                }
                writeDropToDb(userData["userUid"], [drop], function (err, res) {
                    if (res != null)
                        mapReward["drop"] = drop;
                    cb(err, res);
                });
            }
        });
    }, function (err, res) {
        callBack(err, returnData);
    })
}
/**
 * 掉落写入数据库中
 * @param dropArr
 */
function writeDropToDb(userUid, dropArr, callBack) {
    var configData = configManager.createConfig(userUid);
    async.forEach(dropArr, function (item, cb) {
        if (item["teachData"] == null && item["equipData"] == null) {
            cb(null, null);
            return;
        } else {
            async.auto({
                "updateEquip": function (callF) {
                    if (item["equipData"] != null) {
                        var dropOtherData = item["equipData"];
                        var dropId = dropOtherData["id"];
                        var dropCount = dropOtherData["count"];
                        switch (dropId.substr(0, 2)) {
                            case "10"://hero 魂魄
                                heroSoul.addHeroSoul(userUid, dropId, dropCount, function (err, res) {
                                    if(err)callF(err);
                                    else {
                                        res["dropCount"] = dropCount;
                                        item["equipData"] = res;
                                        callF(err, null);
                                    }
                                });
                                break;
                            case "11"://skill 技能  或者技能碎片
                                var skillC = configData.getConfig("skill");
                                var skillItem = skillC[dropId];
                                if (dropOtherData.hasOwnProperty("isPatch") && dropOtherData["isPatch"] == 1) { //碎片
                                    var pathIndex = Math.floor(Math.random() * (skillItem["patchCount"] - 0)) + 1;
                                    debris.addDebris(userUid, dropId, "type" + pathIndex, dropCount, 1, function (err, res) {
                                        if(err)callF(err);
                                        else {
                                            res["dropCount"] = dropCount;
                                            item["equipData"] = res;
                                            callF(err, res);
                                        }
                                    });
                                } else {
                                    skill.addSkill(userUid, dropId, 0, 1, function (err, res) {
                                        if(err)callF(err);
                                        else {
                                            res["dropCount"] = dropCount;
                                            item["equipData"] = res;
                                            callF(err, res);
                                        }
                                    });
                                }
                                break;
                            case "12"://装备
                            case "13"://装备
                            case "14"://装备
                                equipment.addEquipment(userUid, dropId, 1, function (err, res) {
                                    if(err)callF(err);
                                    else {
                                        res["dropCount"] = dropCount;
                                        item["equipData"] = res;
                                        callF(err, res);
                                    }
                                })
                                break;
                            case "15"://item
                                itemType.updateItem(userUid, dropId, dropCount, function (err, res) {
                                    if(err)callF(err);
                                    else {
                                        res["dropCount"] = dropCount;
                                        item["equipData"] = res;
                                        callF(err, res);
                                    }
                                });
                                break;
                            default:
                                callF(null, null);
                                break;
                        }
                    } else {
                        callF(null, null);
                    }
                },
                "updateTeach": function (callF) {
                    if (item["teachData"] != null) {
                        var teachConfig = configData.getConfig("teach");
                        var teachL = item["teachData"]["level"];
                        teach.addTeach(userUid, teachL, jutil.now(), function (err, res) { //指点写入数据库
                            if(err)callF(err);
                            else {
                                item["teachData"] = res;
                                callF(err, res);
                            }
                        });
                    } else {
                        callF(null, null);
                    }
                }
            }, function (err, res) {
                cb(err, res);
            })
        }
    }, function (err, res) {
        callBack(err, res);
    });
}

function updateHero(userUid, heroArr, callBack) {
    async.eachSeries(Object.keys(heroArr), function(key, esCb){
        var item = heroArr[key];
        hero.updateHero(userUid, item["heroUid"], item, function (err, res) {
            esCb(err, res);
        });
    }, function(err, res){
        callBack(err, res)
    });

//    async.forEach(heroArr, function (item, cb) {
//        hero.updateHero(userUid, item["heroUid"], item, function (err, res) {
//            callBack(err, res);
//        });
//    }, function (err, res) {
//        callBack(err, res)
//    });
}
exports.start = start;