/**
 * 1.PVE战斗
 * User: liyuluan
 * Date: 13-10-21
 * Time: 下午7:40
 *
 * 2.PVE战斗增加普通、困难模式
 * User: peter.wang
 * Date: 14-09-11
 * Time: 下午4:47
 */
var jutil = require("../utils/jutil");
var user = require("../model/user");
var hero = require("../model/hero");
var formation = require("../model/formation");
var map = require("../model/map");
var async = require("async");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var skill = require("../model/skill");
var equipment = require("../model/equipment");
var userVariable = require("../model/userVariable");
var teach = require("../model/teach");
var debris = require("../model/debris");
var heroSoul = require("../model/heroSoul");
var item = require("../model/item");
var battleModel = require("../model/battle");
var stats = require("../model/stats");
var activityConfig = require("../model/activityConfig");
var title = require("../model/titleModel");
var titleApi = require("../api/title.get");
var mongoStats = require("../model/mongoStats");
var vitality = require("../model/vitality");
var achievement = require("../model/achievement");
var leagueDragon = require("../model/leagueDragon");


function start(postData, response, query) {
    if (jutil.postCheck(postData, "mapId") == false) {//mode:战斗模式(easy：普通 hard：困难)
        response.echo("battle.pve", jutil.errorInfo("postError"));
        return;
    }
    var lang = query["language"];
    var userUid = query["userUid"];
    var postMode = (postData["mode"]==undefined)? 'easy':postData["mode"];
    var mapId = postData["mapId"];
    var isFirstThreeStar = false;   //是否首次三星通过
    var momentum = 0;
    var userData;
    var listData;
    var heroList = {};
    var equipList = {};
    var skillList = {};
    var formationList = {};
    var returnData = {};
    var returnOwnTeam = {};
    var returnEnemyTeam = {};
    var battleOwnTeam = {};
    var defaultOwnTeam = {};
    var updateSkillTeam = {};
    var multiplesConfig = {};
    var mapItem = null;
    var configData = configManager.createConfig(userUid);

    // 检测模式参数是否有效
    var modeList = battleModel.getModeList();
    if(modeList[postMode]==undefined){//传递模式参数不存在，无效
        response.echo("battle.pve", jutil.errorInfo("postError"));
        return;
    }

    async.series([
        function (callBack) {   // 检测mapId是否存在
            var mapConfig = configData.getConfig(battleModel.getModeMap(postMode));
            if(mapConfig[mapId]==undefined) callBack("mapNotExist", null);
            else callBack(null, null);
        },
        function (callBack) {   ///获取userInfo，体力是否充足
            userVariable.incrPveCount(userUid);
            user.getUser(userUid, function (err, res) {
                if (err || res == null) {
                    callBack(new jutil.JError("noThisUser"), null);
                } else if (res["pvePower"] < 1) {//pve体力不足
                    userData = res;
                    var newPowerTime = configManager.createConfig(userUid).getPvePower(res["pvePower"], res["lastRecoverPvePower"], jutil.now());
                    if ((newPowerTime[0] - 0) >= 1) {
                        callBack(null, null);
                    } else {
                        callBack("physicalShortagePVE", null);
                    }
                } else {
                    userData = res;
                    callBack(null, null);
                }
            })
        },
        function (callBack) { //判断地图是否开启 NEW
            var mode = battleModel.getModeMap(postMode);
            if(mode == "hardMap"){
                var tmpMapId = mapId - 10000;// 转为普通地图ID
                map.getMapItem(userUid, tmpMapId, function (err, res) {
                    if (err || res == null) {
                        callBack("mapUnopened", null);
                    } else if ((res["star"] - 0) == 0) {
                        callBack("mapUnopened", null);
                    } else {
                        callBack(null, null);
                    }
                });
            }else{
                callBack(null, null);
            }
        },
        function (callBack) {      //判断地图是否开启
            //var mapConfig = configData.getConfig("map");
            var mapConfig = configData.getConfig(battleModel.getModeMap(postMode));
            var lastMapId = mapConfig[mapId]["lastMapId"];
            if (lastMapId == "") {
                callBack(null, null);
            } else {
                map.getMapItem(userUid, lastMapId, function (err, res) {
                    if (err || res == null) {
                        callBack("mapNotExist", null);
                    } else if ((res["star"] - 0) == 0) {
                        callBack("mapUnopened", null);
                    } else {
                        callBack(null, null);
                    }
                });
            }
        },
        function (callBack) { //挑战次数是否充足
            //var mapConfig = configData.getConfig("map")[mapId];
            var mapConfig = configData.getConfig(battleModel.getModeMap(postMode))[mapId];
            map.getMapItem(userUid, mapId, function (err, res) {
                if (err) {
                    callBack("mapNotExist", null);
                } else if (res == null) {
                    callBack(null, null);
                } else if (res["number"] >= mapConfig["totlesTimes"]) {
                    if (jutil.compTimeDay(jutil.now(), res["preTime"]) == false) {    ///时间已经过了最后打的那天
                        mapItem = res;
                        mapItem["number"] = 0;
                        mapItem["preTime"] = jutil.now();
                        callBack(null, null);
                    } else {
                        callBack("pveOverTimes", null);
                    }
                } else {
                    mapItem = res;
                    if (jutil.compTimeDay(jutil.now(), mapItem["preTime"]) == false) {    ///时间已经过了最后打的那天
                        mapItem = res;
                        mapItem["number"] = 0;
                        mapItem["preTime"] = jutil.now();
                    }
                    callBack(null, null);
                }
            });
        },
        function (callBack) {
            battleModel.getBattleNeedData(userUid, function (err, res) {
                if (err) {
                    callBack(err, null);
                } else {
                    heroList = res["heroList"];
                    equipList = res["equipList"];
                    skillList = res["skillList"];
                    formationList = res["formationList"];
                    listData = res;
                    //listData["dragonData"] = null;
                    callBack(null, null);
                }
            });
        },
        function (callBack) {
            leagueDragon.getDragon(userUid, userData["leagueUid"], function (err, res) {
                if (err) {
                    callBack(err);
                } else {
                    listData["dragonData"] = res;
                    callBack(null, null);
                }
            });
        },
        function(callBack) {//获取我方的气势
            title.getTitlesPoint(userUid , function(point) {
                userData["momentum"] = point;
                callBack(null, null);
            });
        },
        function (callBack) {  ///取得我方加成后的数据信息
            var enemyTeamData = {};
            var skillConfig = configData.getConfig("skill");
            var isMeFirst = true;
            //var gravityConfig = configData.getConfig("gravityTrain");
            var mapConfig;
            var mapConfigOriginal = configData.getConfig(battleModel.getModeMap(postMode));
            var mapConfigLocal = configData.getConfig(battleModel.getModeMap(postMode) + "_" + lang);
            if (mapConfigLocal) {
                mapConfig = mapConfigLocal;
            } else {
                mapConfig = mapConfigOriginal;
            }
            battleModel.getUserTeamDataByUserId(userUid, userData, listData, function (err, targetData, defaultData) {
                if (err) {
                    callBack(err, null);
                } else {
                    var enemyTeamSkillArr = [];
                    var ownTeamSkillArr = [];
                    enemyTeamData = configData.getPveNpc(battleModel.getModeMap(postMode),mapId);
                    var defaultEnemyTeam = configData.getPveNpc(battleModel.getModeMap(postMode),mapId);
                    battleOwnTeam = targetData;
                    defaultOwnTeam = defaultData;
                    for (var key in enemyTeamData) {
                        var enemyItem = enemyTeamData[key];
                        var defaultItem = defaultEnemyTeam[key];
                        var skill = enemyItem["skill"][0];
                        var skillId = skill["skillId"];
                        var configSkill = skillConfig[skillId];
                        var add = configSkill["attr"] / 100;
                        if (battleModel.doSkillAdd(enemyTeamData, defaultEnemyTeam, key, add, configSkill["skillType"])) {
                            enemyItem["skill"] = [];
                        } else {
                            defaultItem["skill"] = [];
                            enemyItem["skill"][0]["skillProp"] = 0;
                            enemyItem["skill"][0]["skillCount"] = 0;
                            enemyItem["skill"][0]["skillTime"] = 0;
                        }
                    }
                    for (var key in defaultOwnTeam) {
                        var battleItem = battleOwnTeam[key];
                        battleModel.sortOn(battleItem["skill"], "skillTime");
                    }
                    enemyTeamSkillArr = battleModel.returnDoOtherTeamSkill(configData, defaultEnemyTeam);
                    ownTeamSkillArr = battleModel.returnDoOtherTeamSkill(configData, defaultOwnTeam);
                    returnOwnTeam["name"] = userData["userName"];
                    returnOwnTeam["momentum"] = userData["momentum"];
                    returnOwnTeam["team"] = [];
                    for (var dKey in defaultOwnTeam) {
                        var item = defaultOwnTeam[dKey];
                        var battle = battleOwnTeam[dKey];
                        updateSkillTeam[dKey] = battleOwnTeam[dKey];
                        var skillIdArr = [];
                        for (var s = 0; s < item["skill"].length; s++) {
                            skillIdArr.push(item["skill"][s]["skillId"]);
                        }
                        returnOwnTeam["team"][(dKey - 0) - 1] = {"heroId": item["heroId"], "spirit": battle["spirit"], "hp": battle["hp"], "skill": skillIdArr,"gravityEffect":item["gravityEffect"]}
                    }
                    returnEnemyTeam["name"] = jutil.toBase64(mapConfig[mapId]["name"]);
                    returnEnemyTeam["momentum"] = "???";
                    returnEnemyTeam["team"] = [];
                    for (var eKey in enemyTeamData) {
                        var item = defaultEnemyTeam[eKey];
                        var battle = enemyTeamData[eKey];
                        var skillIdArr = [];
                        for (var s = 0; s < item["skill"].length; s++) {
                            skillIdArr.push(item["skill"][s]["skillId"]);
                        }
                        returnEnemyTeam["team"][(eKey - 0) - 1] = {"formationId": item["formationId"], "heroId": item["icon"], "spirit": battle["spirit"], "hp": battle["hp"], "skill": skillIdArr,"gravityEffect":item["gravityEffect"]}
                    }
                    returnData["enemyTeam"] = returnEnemyTeam;
                    returnData["ownTeam"] = returnOwnTeam;
                    battleModel.doSkillToAllHero(configData, enemyTeamSkillArr, battleOwnTeam, defaultOwnTeam);
                    battleModel.doSkillToAllHero(configData, ownTeamSkillArr, enemyTeamData, defaultEnemyTeam);
                    returnData["roundData"] = [];
                    defaultOwnTeam = jutil.copyObject(battleOwnTeam);
                    defaultEnemyTeam = jutil.copyObject(enemyTeamData);
                    for (var i = 1; i <= 3; i++) {
                        battleModel.addDeadInBackData(battleOwnTeam, returnOwnTeam["team"], i);
                        var teamAcode = battleModel.returnNewTeam(battleOwnTeam, defaultOwnTeam);
                        battleOwnTeam = teamAcode[0];
                        defaultOwnTeam = teamAcode[1];
                        var teamBcode = battleModel.returnNewTeam(enemyTeamData, defaultEnemyTeam);
                        enemyTeamData = teamBcode[0];
                        defaultEnemyTeam = teamBcode[1];
                        var round = battleModel.twoTeamBattle(configData, battleOwnTeam, enemyTeamData, isMeFirst, i, defaultOwnTeam, defaultEnemyTeam);
                        returnData["roundData"].push(round["roundData"]);
                        if (round["complete"]) {
                            returnData["isWin"] = round["win"];
                            if (mapItem == null) {
                                mapItem = {"mapId": mapId, "star": 0, "number": 0, "preTime": jutil.now(), "clearance": 0};
                            }
                            if (round["win"]) {
                                if ((mapItem["star"] - 0) == 0) {
                                    stats.fuben(userUid, "127.0.0.1", userData, mapId);
                                }
                                mapItem["number"] = (mapItem["number"] - 0) + 1;
                                if ((mapItem["star"] - 0) < 3 && (4 - i) == 3) {  //首次以三星的成绩通关
                                    isFirstThreeStar = true;
                                }
                                mapItem["star"] = (mapItem["star"] - 0) < (4 - i) ? (4 - i) : (mapItem["star"] - 0);
                                mapItem["preTime"] = jutil.now();
                            }
                            map.updateMap(userUid, mapItem["mapId"], mapItem, function (err, res) {
                                if (err) {
                                    callBack(err, null);
                                    return;
                                } else {
                                    returnData["mapDate"] = mapItem;
                                    callBack(null, null);
                                }
                            });
                            break;
                        }
                        isMeFirst = isMeFirst == true ? false : true;
                    }
                }
            });
        },
        function(callBack){ //获取N倍活动配置
            activityConfig.getConfig(userUid, "mapRewardMC", function(err, res) {
                var configArray = res;
                if (configArray[0] == false) {
                    callBack(null); //当前没有活动， 取默认
                } else if(configArray[1] == 0){//活动参数是0  取默认2倍
                    multiplesConfig = {"mapRewardMC":2};
                    callBack(null);
                }else{
                    multiplesConfig = configArray[2] || {}; //如果报错，取默认为1的项
                    callBack(null);
                }
            });
        },
        function (callBack) {                          ///计算奖励
            var multiples = multiplesConfig["mapRewardMC"] != null ? (multiplesConfig["mapRewardMC"] - 0) : 1;
            //var mapConfig = configData.getConfig("map");
            var mapConfig = configData.getConfig(battleModel.getModeMap(postMode));
            var playerConfig = configData.getConfig("player");
            //var playerLevel = configData.userExpToLevel((userData["exp"] - 0));
            var playerConfigItem = playerConfig["" + userData["lv"]];
            var mapConfigItem = mapConfig[mapId];
            var threeBle = isFirstThreeStar ? 3 : 1;
            var heroExp = (mapConfigItem["reward"]["exp"] - 0) * threeBle * multiples;
            var gold = (mapConfigItem["reward"]["gold"] - 0) * threeBle * multiples;
            var personExp = (playerConfigItem["getPlayerExp"] - 0) * threeBle * multiples;
            //var personEndLevel = configData.userExpToLevel(personExp + (userData["exp"] - 0));
            var powerDureTime = userData["lastRecoverPvePower"];
            var time = (jutil.now() - powerDureTime) < 0 ? 0 : (jutil.now() - powerDureTime);
            var userUpdate = {};
            userUpdate["exp"] = personExp + (userData["exp"] - 0);
            userUpdate["gold"] = userData["gold"] * 1 + gold;
            var newPower = configManager.createConfig(userUid).getPvePower(userData["pvePower"] - 0, userData["lastRecoverPvePower"] - 0, jutil.now());
            var lastPower = newPower[0];
            userUpdate["lastRecoverPvePower"] = newPower[1];
            userUpdate["pvePower"] = lastPower - 1;
            async.series([
                function (callback) {       //更新玩家信息
                    user.updateUser(userUid, userUpdate, function (err, res) {
                        mongoStats.dropStats("gold", userUid, "127.0.0.1", userData, mongoStats.BATTLE_PVE, gold);
                        if (err) {
                            callback(err);
                        } else {
                            returnData["updateUser"] = userUpdate;
                            callback(null);
                        }
                    });
                },
                function (callback) {       //更新技能信息
                    battleModel.upDataSkillInfo(updateSkillTeam, userUid, function (err, res) {
                        if (err) {
                            callback(err);
                        } else {
                            callback(null);
                        }
                    })
                },
                function (callback) {       //更新弟子等级
                    if (returnData["isWin"] == true) {   /////战斗胜利计算战斗失败不给的东西
                        var arr = [];
                        var heroGetExp = {};
                        for (var key in formationList) {
                            var formationItem = formationList[key];
                            var heroUid = formationItem["heroUid"];
                            var heroItem = heroList[heroUid];
                            var maxExp = configData.heroMaxExp(heroItem["heroId"], userUpdate["lv"]);
                            heroItem["exp"] = (heroItem["exp"] - 0) + heroExp;
                            heroItem["level"] = configData.heroExpToLevel(heroItem["heroId"], heroItem["exp"]);
                            if (heroItem["exp"] >= maxExp) {
                                heroItem["exp"] = maxExp;
                                heroItem["level"] = configData.heroExpToLevel(heroItem["heroId"], heroItem["exp"]);
                            }
                            heroGetExp[key] = {};
                            heroGetExp[key]["heroUid"] = heroUid;
                            heroGetExp[key]["exp"] = heroItem["exp"];
                            arr.push(heroItem);
                        }
                        async.eachSeries(Object.keys(arr), function(key, esCb){
                            var item = arr[key];
                            hero.updateHero(userUid, item["heroUid"], item, function (err, res) {
                                if (err) {
                                    esCb(err);
                                } else {
                                    esCb(null);
                                }
                            });
                        }, function(err){
                            if (err) {
                                callback("battleWrong");
                            } else {
                                returnData["heroGetExp"] = heroGetExp;
                                callback(null);
                            }
                        });
//                        async.forEach(arr, function (item, callBackArr) {
//                            hero.updateHero(userUid, item["heroUid"], item, function (err, res) {
//                                if (err) {
//                                    callBackArr(err);
//                                } else {
//                                    callBackArr(null);
//                                }
//                            });
//                        }, function (err) {
//                            if (err) {
//                                callback("battleWrong");
//                            } else {
//                                returnData["heroGetExp"] = heroGetExp;
//                                callback(null);
//                            }
//                        });
                    } else {
                        callback(null);
                    }
                },
                function (callback) {   //掉落奖励
                    var dropData;
                    var teachConfig = configData.getConfig("teach");
                    battleModel.CalculationDrop(userUid, postMode, mapId, returnData["isWin"], userData, function (err, res) {
                        dropData = res;
                        async.series([
                            function (writeDropCallBack) {
                                if (dropData["teachData"] != null) {
                                    var teachL = dropData["teachData"]["level"];
                                    teach.addTeach(userUid, teachL, jutil.now(), function (err, res) { //指点写入数据库
                                        if (err || res == null) {
                                            dropData["teachData"] = null;
                                        } else {
                                            dropData["teachData"] = res;
                                        }
                                        writeDropCallBack(null);
                                    });
                                } else {
                                    writeDropCallBack(null);
                                }
                            },
                            function (writeDropCallBack) {    //装备等等掉落数据库写入
                                if (dropData["equipData"] != null) {
                                    var dropOtherData = dropData["equipData"];
                                    var dropId = dropOtherData["id"];
                                    var dropCount = (dropOtherData["count"] - 0);
                                    if (dropId == null) {
                                        writeDropCallBack("");

                                    }
                                    var userIP = '127.0.0.1';//response.response.socket.remoteAddress;
                                    mongoStats.dropStats(dropId, userUid, userIP, userData, mongoStats.BATTLE_PVE, dropCount);
                                    switch (dropId.substr(0, 2)) {
                                        case "10"://hero 魂魄
                                            heroSoul.addHeroSoul(userUid, dropId, dropCount, function (err, res) {
                                                if (err) {
                                                    dropData["equipData"] = null;
                                                } else {
                                                    dropData["equipData"] = res;
                                                    dropData["equipData"]["dropCount"] = dropCount;
                                                }
                                                writeDropCallBack(null);
                                            });
                                            break;
                                        case "11"://skill 技能  或者技能碎片
                                            var skillC = configData.getConfig("skill");
                                            var skillItem = skillC[dropId];
                                            if (dropOtherData.hasOwnProperty("isPatch") && dropOtherData["isPatch"] == 1) { //碎片
                                                var pathIndex = Math.floor(Math.random() * (skillItem["patchCount"] - 0)) + 1;
                                                debris.addDebris(userUid, dropId, "type" + pathIndex, dropCount, 1, function (err, res) {
                                                    if (err) {
                                                        dropData["equipData"] = null;
                                                    } else {
                                                        dropData["equipData"] = res;
                                                        dropData["equipData"]["type"] = pathIndex;
                                                        dropData["equipData"]["dropCount"] = dropCount;
                                                    }
                                                    writeDropCallBack(null);
                                                });
                                            } else {
                                                skill.addSkill(userUid, dropId, 0, 1, function (err, res) {
                                                    if (err) {
                                                        dropData["equipData"] = null;
                                                    } else {
                                                        dropData["equipData"] = res;
                                                        dropData["equipData"]["dropCount"] = dropCount;
                                                    }
                                                    writeDropCallBack(null);
                                                });
                                            }
                                            break;
                                        case "12"://装备
                                        case "13"://装备
                                        case "14"://装备
                                            equipment.addEquipment(userUid, dropId, 1, function (err, res) {
                                                if (err) {
                                                    dropData["equipData"] = null;
                                                } else {
                                                    dropData["equipData"] = res;
                                                    dropData["equipData"]["dropCount"] = dropCount;
                                                }
                                                writeDropCallBack(null);
                                            })
                                            break;
                                        case "15"://item
                                            item.updateItem(userUid, dropId, dropCount, function (err, res) {
                                                if (err) {
                                                    dropData["equipData"] = null;
                                                } else {
                                                    dropData["equipData"] = res;
                                                    dropData["equipData"]["dropCount"] = dropCount;
                                                }
                                                writeDropCallBack(null);
                                            });
                                            break;
                                        default:
                                            writeDropCallBack(null);
                                            break;
                                    }
                                } else {
                                    writeDropCallBack(null);
                                }
                            }
                        ], function (err) {
                            returnData["drop"] = dropData;
                            callback(null);
                        });    //指点  还有其他掉落写入数据库
                    });           //掉落数据
                }
            ], function (err) {
                if (err) {
                    callBack(err, null);
                } else {
                    callBack(null, returnData);
                }
            });
        },
        function(cb) { // 成就数据统计
            if (returnData["isWin"] == true) {
                achievement.mapComplete(userUid, mapId, function(){
                    achievement.mapTime(userUid, 1, function(){
                        cb(null);
                    });
                });
            } else {
                cb(null);
            }
        }
    ], function (err, value) {   //捕获结果
        if (err) {
            response.echo("battle.pve", jutil.errorInfo(err));
        } else {


            if (returnData["isWin"] == true) {
                // 通关
                vitality.vitality(userUid, "map", {"completeCnt":1}, function(){});

                title.mapCrossChange(userUid, mapId, function(){
                    titleApi.getNewAndUpdate(userUid, "map", function(err, res){
                        if (!err && res) {
                            returnData["titleInfo"] = res;
                        }
                        response.echo("battle.pve", returnData);
                    });
                });
            } else {
                response.echo("battle.pve", returnData);
            }
        }
    });
}
exports.start = start;