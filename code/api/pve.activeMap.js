/**
 * Created with JetBrains WebStorm.
 * User: jichang  活动副本战斗
 * Date: 14-3-27
 * Time: 下午12:45
 * To change this template use File | Settings | File Templates.
 */
var jutil = require("../utils/jutil");
var activeMap = require("../model/activeMap");
var user = require("../model/user");
var configManager = require("../config/configManager");
var async = require("async");
var battleModel = require("../model/battle");
var hero = require("../model/hero");
var modelUtil = require("../model/modelUtil");
var userVariable = require("../model/userVariable");
var mongoStats = require("../model/mongoStats");
var activityConfig = require("../model/activityConfig");
var title = require("../model/titleModel");
var vitality = require("../model/vitality");
var bitUtil = require("../../code/alien/db/bitUtil");
var leagueDragon = require("../model/leagueDragon");

function start(postData, response, query) {
    var userUid = query["userUid"];

    if (jutil.postCheck(postData,"activityMapId") == false) {
        response.echo("pve.activeMap",jutil.errorInfo("postError"));
        return;
    }
    var activityMapId = postData["activityMapId"]; //活动副本的Id
    var updateUser;
    var updateActiveMap;
    var userData;
    var reward;
    var rReturnResult = {};//返回的数据
    var configData = configManager.createConfig(userUid);
    var playerConfig = configData.getConfig("player");
    var userLevel = 1;
    var formationList;
    var heroList;
    var currentItem = null; //当前掉落
    var multiplesConfig = {};
    async.series([
        function (sCb) {//判断是否达到可以打的条件
            judgeAchieveConditions(userUid, activityMapId, function (err, res) {
                if (err) sCb(err, null);
                else {
                    updateUser = res["updateUser"];
                    updateActiveMap = res["updateActiveMap"];
                    userData = res["userData"];
                    sCb(null, null);
                }
            });
        },
        function(sCb) {//获取我方的气势
            title.getTitlesPoint(userUid , function(point) {
                userData["momentum"] = point;
                sCb(null, null);
            });
        },
        function (sCb) { //获取战斗需要数据
            getActiveBattleNeedData(userData, activityMapId, function (err, res) {
                if (err) sCb(err, null);
                else {
                    var enemyBattleData = res[1];
                    var ownBattleData = res[0];
                    heroList = ownBattleData["heroList"];
                    formationList = ownBattleData["formationList"];
                    reward = enemyBattleData["reward"];
                    var name = jutil.toBase64(enemyBattleData["name"]);
                    doBotEnemyAdd(enemyBattleData["defaultTeam"], enemyBattleData["battleTeam"], userUid); //敌方的加成
                    battleModel.doSkillToAllHero(configData, ownBattleData["doOtherTeamSkill"], ownBattleData["battleTeam"], ownBattleData["defaultTeam"]);
                    battleModel.doSkillToAllHero(configData, enemyBattleData["doOtherTeamSkill"], enemyBattleData["battleTeam"], enemyBattleData["defaultTeam"]);
                    rReturnResult["enemyTeam"] = battleModel.getTeamReturnData(enemyBattleData["defaultTeam"], enemyBattleData["battleTeam"], {"userName": name});
                    rReturnResult["ownTeam"] = battleModel.getTeamReturnData(ownBattleData["defaultTeam"], ownBattleData["battleTeam"], {"userName": userData["userName"]});
                    rReturnResult["roundData"] = [];
                    rReturnResult["ownTeam"]["momentum"] = userData["momentum"];
                    rReturnResult["enemyTeam"]["momentum"] = 0;
                    var isOwnFirst = true;
                    var returnResultRoundData = [];
                    var teamATargetData = ownBattleData["battleTeam"];
                    var teamBTargetData = enemyBattleData["battleTeam"];
                    var defaultOwnTeam = jutil.copyObject(teamATargetData);
                    var defaultEnemyTeam = jutil.copyObject(teamBTargetData);
                    for (var i = 0; i < 3; i++) {
                        var teamAcode = battleModel.returnNewTeam(teamATargetData, defaultOwnTeam);
                        teamATargetData = teamAcode[0];
                        defaultOwnTeam = teamAcode[1];
                        var teamBcode = battleModel.returnNewTeam(teamBTargetData, defaultEnemyTeam);
                        teamBTargetData = teamBcode[0];
                        defaultEnemyTeam = teamBcode[1];
                        var battleResult = battleModel.twoTeamBattle(configData, teamATargetData, teamBTargetData, isOwnFirst, i + 1, defaultOwnTeam, defaultEnemyTeam);
                        battleModel.addDeadInBackData(teamATargetData, rReturnResult["ownTeam"]["team"], i + 1);
                        returnResultRoundData.push(battleResult["roundData"]);
                        if (battleResult["complete"] == true) {
                            rReturnResult["isWin"] = battleResult["win"];
                            break;
                        }
                        isOwnFirst = !isOwnFirst;
                    }
                    rReturnResult["roundData"] = returnResultRoundData;
                    sCb(null, null);
                }
            });
        },
        function(sCb) { //能量球双倍配置
            activityConfig.getConfig(userUid, "powerBallDropMC", function(err, res) {
                var configArray = res;
                if (configArray[0] == false) {
                    multiplesConfig = {};
                    sCb(null, null); //当前没有活动， 取默认
                } else if(configArray[1] == 0){//活动参数是0  取默认2倍
                    multiplesConfig = {"powerBallDropMC":2};
                    sCb(null, null);
                }else{
                    multiplesConfig = configArray[2] || {}; //如果报错，取默认为1的项
                    sCb(null, null);
                }
            });
        },
        function (sCb) {//战斗奖励
            var playerConfig = configData.getConfig("player");
            var playerLevel = userData["lv"] - 0;
            var playerConfigItem = playerConfig["" + playerLevel];
            var getUserExp = (playerConfigItem != null && playerLevel > 25) ? playerConfigItem["getPlayerExp"] : 0;
            var getGold = reward["gold"] != null ? reward["gold"] : 0;
            if (activityMapId.substr(0, 7) == "getGold") {//金币副本
                var re = calculateReward(rReturnResult["roundData"], reward["gold"]);
                getGold = re["gold"] - 0;
                rReturnResult["totleHurt"] = re["totleHurt"] - 0;
                getUserExp = 0;
            }
            updateUser["gold"] = userData["gold"] - 0 + getGold;
            updateUser["exp"] = userData["exp"] - 0 + getUserExp;
            var newLvExp = configData.userExpToLevel(updateUser["lv"], (updateUser["exp"] - 0));
            userLevel = newLvExp[0];
            var loot = reward["loot"] != null ? reward["loot"] : [];
            var random = Math.random();
            var probArr = jutil.proFunction(loot);
            var multiples = multiplesConfig["powerBallDropMC"] != null ? (multiplesConfig["powerBallDropMC"] - 0) : 1;
            for (var i = 0; i < loot.length; i++) {
                var item = loot[i];
                var probItem = probArr[i];
                if (probItem == null) continue;
                if (probItem["maxProb"] > random && random >= probItem["minProb"]) {
                    currentItem = {};
                    for(var key in item) {
                        currentItem[key] = item[key];
                    }
                    currentItem["count"] = item["count"] * multiples;
                    break;
                }
            }
            sCb(null, null);
        },
        function (sCb) {//更新弟子经验
            if (activityMapId.substr(0, 7) == "getGold") {//金币副本队伍经验没有
                sCb(null, null);
                return;
            }
            rReturnResult["heroGetExp"] = [];
            var arr = [];
            var returnHero = {};
            var addExp = reward["exp"] != null ? reward["exp"] : 0;
            if(rReturnResult["isWin"] == false){
                addExp = 0;
            }
            for (var key in formationList) {
                var formationItem = formationList[key];
                var heroUid = formationItem["heroUid"];
                var heroItem = heroList[heroUid];
                var maxExp = configData.heroMaxExp(heroItem["heroId"], userLevel);
                heroItem["exp"] = (heroItem["exp"] - 0) + addExp;
                heroItem["level"] = configData.heroExpToLevel(heroItem["heroId"], heroItem["exp"]);
                if (heroItem["exp"] > maxExp) {
                    heroItem["exp"] = maxExp;
                    heroItem["level"] = configData.heroExpToLevel(heroItem["heroId"], maxExp);
                }
                returnHero[key] = {};
                returnHero[key]["heroUid"] = heroUid;
                returnHero[key]["exp"] = heroItem["exp"];
                arr.push(heroItem);
            }
            rReturnResult["heroGetExp"] = returnHero;
            async.eachSeries(Object.keys(arr), function(key, uhCb){
                var item = arr[key];
                hero.updateHero(userUid, item["heroUid"], item, function (err, res) {
                    if (err) {
                        uhCb(err);
                    } else {
                        uhCb(null);
                    }
                });
            }, function(err){
                sCb(null, null);
            });
//            async.forEach(arr, function (item, callBackArr) {
//                hero.updateHero(userUid, item["heroUid"], item, function (err, res) {
//                    if (err) {
//                        callBackArr(err);
//                    } else {
//                        callBackArr(null);
//                    }
//                });
//            }, function (err) {
//                sCb(null, null);
//            });
        },
        function(cb) { // 更新活跃度
            vitality.vitality(userUid, "activityMap", {"completeCnt":1}, function(){
                cb(null);
            });
        },
        function (sCb) {//更新数据库
            if (rReturnResult["isWin"] == false && activityMapId.substr(0, 7) != "getGold") {
                updateActiveMap["value"] = updateActiveMap["value"] - 1;
                currentItem = null;
                updateUser["gold"] = userData["gold"];
                updateUser["ingot"] = userData["ingot"];
            }
            updateDb(response, userData, updateUser, updateActiveMap, currentItem, function (err, res) {
                if (err)sCb(err, null);
                else {
                    rReturnResult["drop"] = res["drop"];

                    sCb(null, null);
                }
            });
        }
    ], function (err, res) {
        if (err) {
            response.echo("pve.activeMap", jutil.errorInfo(err));
        } else {
            rReturnResult["updateUser"] = updateUser;
            rReturnResult["updateActivity"] = {"value": updateActiveMap["value"], "key": activityMapId};
            response.echo("pve.activeMap", rReturnResult);
        }
    });
}
function updateDb(response, userData, updateUser, activityUpdate, dropData, cb) {
    var returnData = {};
    var userUid = userData["userUid"];
    var postIngot = updateUser["ingot"] != null ? (userData["ingot"] - updateUser["ingot"]) : 0;
    async.auto({
        "updateDrop": function (aCb) {
            if (dropData == null) {
                aCb(null, null);
                return;
            } else {
                mongoStats.dropStats(dropData["id"], userUid, '127.0.0.1', null, mongoStats.ACTIVE_MAP, dropData["count"]);
                modelUtil.addDropItemToDB(dropData["id"], dropData["count"], userUid, false, 1, false,function (err, res) {
                    if (err || res == null) {
                        console.log("activityMapError........." , err);
                        console.log("activityMapDropData........." , JSON.stringify(dropData));
                        aCb("dbError", null);
                    }
                    else {
                        var obj = {};
                        obj["equipData"] = res;
                        obj["equipData"]["dropCount"] = dropData["count"];
                        returnData["drop"] = obj;
                        aCb(null, null);
                    }
                });
            }
        },
        "updateActivity": ["updateDrop" , function (aCb) {
            userVariable.setVariableTime(userUid, activityUpdate["key"], activityUpdate["value"], activityUpdate["time"], function (err, res) {
                if (err) {
                    aCb(err, null)
                }
                else {
                    aCb(null, null);
                }
            });
        }],
        "updateUser": ["updateDrop" , function (aCb) {
            user.updateUser(userUid, updateUser, function (err, res) {
                if (err) {
                    console.log("jichang", err);
                    aCb(err, null)
                }
                else {
                    if (postIngot != 0) {
                        var userIP = '127.0.0.1';//response.response.socket.remoteAddress;
                        mongoStats.expendStats("ingot", userUid, userIP, userData, mongoStats.E_ACTIVITY_MAP, postIngot)
                    }
                    aCb(null, null);
                }
            });
        }]
    }, function (err, res) {
        if (err) {
            cb(err, null);
        }
        else {
            cb(null, returnData)
        }
    });
}
/**
 *
 * @param userUid
 * @param activityId
 * @param formationList
 * @param callBack
 */
function getGoldGetTeam(userUid, activityId, formationList, callBack) {
    var config = configManager.createConfig(userUid);
    var activityItem = getActivityConfigItem(userUid, activityId);
    if (activityItem == null) {
        callBack("dbError", null);
        return;
    }
    var formationL = 0;
    for (var key in formationList) {
        formationL++
    }
    var group = activityItem["group"];
    var groupIndex = formationL - 1;
    if(group == null) {
        callBack("dbError", null);
        return;
    }
    var groupItem = group[groupIndex];
    var heroIdArr = groupItem["hero"];
    var formation = activityItem["formation"];
    var teamData = {};
    var returnData = {};
    for (var i = 0; i < formationL; i++) {
        var key = "" + (i + 1);
        var index = i;
        var formationItem = formation[key];
        var heroId = heroIdArr[index];
        var hero = config.getHeroObjByIdLevel(heroId, 1, 0);
        if (hero == null || formationItem == null) {
            callBack("heroNotExist", null);
            return;
        }
        hero["hp"] = formationItem["hp"];
        hero["attack"] = formationItem["attack"];
        hero["defence"] = formationItem["defence"];
        hero["spirit"] = formationItem["spirit"];
        teamData[key] = hero;
    }
    returnData["reward"] = groupItem["reward"];
    returnData["enemyTeam"] = teamData;
    returnData["name"] = activityItem["name"];
    callBack(null, returnData);
}
function getNpcTeam(userUid, activityId, formationList, callBack) {
    if (activityId.substr(0, 7) == "getGold") {
        getGoldGetTeam(userUid, activityId, formationList, callBack);
    } else {
        getActivityNPCTeam(userUid, activityId, callBack);
    }
}
/**
 * 获取活动副本的敌方队伍,金币副本除外
 * @param userUid
 * @param activityId
 */
function getActivityNPCTeam(userUid, activityId, callBack) {
    var config = configManager.createConfig(userUid);
    var activityItem = getActivityConfigItem(userUid, activityId);
    if (activityItem == null) {
        callBack("dbError", null);
        return;
    }
    if (jutil.dataConfirm([activityItem], ["group." + groupIndex + ""]))
        var group = activityItem["group"];
    var groupIndex = Math.floor(Math.random() * group.length);
    var groupItem = group[groupIndex];
    var heroIdArr = groupItem["hero"];
    var formation = activityItem["formation"];
    var teamData = {};
    var returnData = {};
    for (var key in formation) {
        var index = (key - 0) - 1;
        var formationItem = formation[key];
        var heroId = heroIdArr[index];
        var hero = config.getHeroObjByIdLevel(heroId, 1, 0);
        if (hero == null || formationItem == null) {
            callBack("heroNotExist", null);
            return;
        }
        hero["hp"] = formationItem["hp"];
        hero["attack"] = formationItem["attack"];
        hero["defence"] = formationItem["defence"];
        hero["spirit"] = formationItem["spirit"];
        teamData[key] = hero;
    }
    returnData["reward"] = groupItem["reward"];
    returnData["enemyTeam"] = teamData;
    returnData["name"] = activityItem["name"];
    callBack(null, returnData);
}
/**
 * 敌方队伍的加成   仅限电脑
 * @param enemyDefaultData
 * @param enemyBattleData
 * @param userUid
 */
function doBotEnemyAdd(enemyDefaultData, enemyBattleData, userUid) {
    var configData = configManager.createConfig(userUid);
    var skillConfig = configData.getConfig("skill");
    for (var key in enemyBattleData) {
        var enemyItem = enemyBattleData[key];
        var defaultItem = enemyDefaultData[key];
        var skill = enemyItem["skill"][0];
        var skillId = skill["skillId"];
        var configSkill = skillConfig[skillId];
        var add = configSkill["attr"] / 100;
        if (battleModel.doSkillAdd(enemyBattleData, enemyDefaultData, key, add, configSkill["skillType"])) {
            enemyItem["skill"] = [];
        } else {
            defaultItem["skill"] = [];
            if (enemyItem["skill"] == null || enemyItem["skill"][0] == null || enemyItem["skill"][0]["skillProp"] == null) continue;
            enemyItem["skill"][0]["skillProp"] = 0;
            enemyItem["skill"][0]["skillCount"] = 0;
            enemyItem["skill"][0]["skillTime"] = 0;
        }
    }
}
/**
 * 获取战斗需要的数据返回[{"defaultTeam":{},"battleTeam":{}},{"defaultTeam":{},"battleTeam":{}}]
 * [0] == 己方队伍 [1] == 敌方队伍
 * @param userData
 * @param activityMapId
 */
function getActiveBattleNeedData(userData, activityMapId, callBack) {
    var returnData = [];
    var userUid = userData["userUid"];
    var configData = configManager.createConfig(userUid);
    var ownObj = {};
    var enemyObj = {};
    async.auto({
        "getOwnerTeamData": function (aCb) { //获取己方的战斗数据
            battleModel.getBattleNeedData(userUid, function (err, res) {
                if (err || res == null) {
                    aCb("PVP DATA WRONG", null);
                } else {
                    ownObj["heroList"] = res["heroList"];
                    ownObj["formationList"] = res["formationList"];
                    var ownListData = res;
                    leagueDragon.getDragon(userUid, userData["leagueUid"], function (err, res) {
                        if (err) {
                            aCb(err);
                        } else {
                            ownListData["dragonData"] = res;
                            battleModel.getUserTeamDataByUserId(userUid, userData, ownListData, function (err, targetData, defaultData) {
                                if (err) {
                                    aCb("pvpTeamDataWrong", null);
                                } else {
                                    var doOtherTeamSkill = battleModel.returnDoOtherTeamSkill(configData, defaultData);
                                    ownObj["battleTeam"] = targetData;
                                    ownObj["defaultTeam"] = defaultData;
                                    ownObj["doOtherTeamSkill"] = doOtherTeamSkill;
                                    aCb(null, null);
                                }
                            });
                        }
                    });
                }
            });
        },
        "getEnemyTeamData": ["getOwnerTeamData", function (aCb) { //获取敌方的战斗数据
            getNpcTeam(userUid, activityMapId, ownObj["formationList"], function (err, res) {
                if (err)aCb(err, null)
                else {
                    var doOtherTeamSkill = battleModel.returnDoOtherTeamSkill(configData, res["enemyTeam"]);
                    enemyObj["battleTeam"] = res["enemyTeam"];
                    enemyObj["defaultTeam"] = res["enemyTeam"];
                    enemyObj["doOtherTeamSkill"] = doOtherTeamSkill;
                    enemyObj["reward"] = res["reward"];
                    enemyObj["name"] = res["name"];
                    aCb(null, null);
                }
            });
        }]
    }, function (err, res) {
        if (err) callBack(err, null);
        else {
            returnData.push(ownObj, enemyObj);
            callBack(null, returnData);
        }
    });
}
function calculateReward(roundData, goldData) { //金币副本计算伤害奖励
    var totleHurt = 0;
    for (var i = 0; i < roundData.length; i++) {
        var itemData = roundData[i];
        for (var j = 0; j < itemData.length; j++) {
            var attackData = itemData[j];
            var isMe = attackData["isMe"];
            if (isMe == true) {
                var targetBeAtt = attackData["targetBeAtt"] != null ? attackData["targetBeAtt"] : [];
                for (var s = 0; s < targetBeAtt.length; s++) {
                    var hurtOne = targetBeAtt[s];
                    totleHurt += hurtOne["hurt"];
                }
            }
        }
    }
    var returnData = {};
    returnData["gold"] = calculateOneHurt(totleHurt, goldData);
    returnData["totleHurt"] = totleHurt;
    return returnData;
}
function calculateOneHurt(hurt, goldData) {//计算一次伤害所获得的金币数量
    if (goldData == null) return 0;
    var damageLimitLine = goldData["damageLimitLine"] ? goldData["damageLimitLine"] - 0 : 0;
    var bigDamageRatio = goldData["bigDamageRatio"] ? goldData["bigDamageRatio"] - 0 : 0;
    var littleDamageRatio = goldData["littleDamageRatio"] ? goldData["littleDamageRatio"] - 0 : 0;
    var bigAdd = (hurt - damageLimitLine) > 0 ? (hurt - damageLimitLine) : 0;
    var smallAdd = (hurt - damageLimitLine) > 0 ? damageLimitLine : hurt;
    return Math.floor(bigAdd * littleDamageRatio + smallAdd * bigDamageRatio);
}
/**
 *获取单个config配置
 * @param id
 */
function getActivityConfigItem(userUid, id) {
    var configData = configManager.createConfig(userUid);
    var activityConfig = configData.getConfig("activityMap");
    for (var key in activityConfig) {
        var item = activityConfig[key];
        if ((item["type"] + "_" + item["level"]) == id) {
            return item;
            break;
        }
    }
}
/**
 * 判断当前是否满足可以打副本的条件
 * @param userUid
 * @param activityMapId
 * @param callBack
 */
function judgeAchieveConditions(userUid, activityMapId, callBack) {//判断是否满足条件
    var userData;
    var activeMapData;
    var returnData = {};
    async.auto({
        "getUserData": function (autoCb) {
            user.getUser(userUid, function (err, res) {
                if (err || res == null) {
                    autoCb("noThisUser", null);
                } else {
                    userData = res;
                    returnData["userData"] = res;
                    autoCb(null, null);
                }
            });
        },
        "getActiveData": function (autoCb) {
            activeMap.getActiveMapData(userUid, function (err, res) {
                if (err || res == null) {
                    autoCb("noThisUser", null);
                } else {
                    activeMapData = res;
                    returnData["activeMapData"] = activeMapData;
                    autoCb(null, null);
                }
            });
        },
        "judgeConditions": ["getUserData", "getActiveData", function (autoCb) {
            var configData = configManager.createConfig(userUid);
            var newPvePower = configData.getPvePower(userData["pvePower"], userData["lastRecoverPvePower"], jutil.now());
            var activityItem = getActivityConfigItem(userUid, activityMapId);
            if (activityItem == null) {
                autoCb("dbError", null);
                return;
            }

            var mCode = bitUtil.parseUserUid(userUid);
            if(mCode[0]=="h" || mCode[0]=="i"){// 台湾英文
                var vipConfig = configData.getConfig("vip");
                var activityMapTotleTimes = vipConfig[userData["vip"]]["activityMapTime"] - 0;//根据VIP取限制次数
            }else {
                var activityMapTotleTimes = activityItem["timeLimit"] - 0;//次数限制
            }

            var severActivityNum = activeMapData[activityMapId] - 0; //服务器上该地图数据已经打了的次数
            var needPower = activityItem["powerCost"] - 0;//需要的体力数量
            var thisTime = severActivityNum + 1;
            var needGold = activityItem["imeggaCost"][thisTime] != null ? activityItem["imeggaCost"][thisTime] : -1;//
            if (activityMapTotleTimes < thisTime) {
                autoCb("pveOverTimes", null); //挑战次数不足
                return;
            } else if (userData["ingot"] < needGold && needGold != -1) { //金币不足
                autoCb("ingotNotEnough", null);
                return;
            } else if (newPvePower[0] < needPower) { //体力不足
                autoCb("physicalShortagePVE", null);
                return;
            }
            var updateUser = {};
            var updateActiveMap = {};
            if (needPower > 0) {
                updateUser["pvePower"] = newPvePower[0] - needPower;
                updateUser["lastRecoverPvePower"] = newPvePower[1];
            }
            if (needGold > 0) {
                updateUser["ingot"] = userData["ingot"] - needGold;
            }
            updateActiveMap["value"] = thisTime;
            updateActiveMap["time"] = jutil.now();
            updateActiveMap["key"] = activityMapId;
            returnData["updateUser"] = updateUser;
            returnData["updateActiveMap"] = updateActiveMap;
            autoCb(null, null);
        }]
    }, function (err, res) {
        if (err) callBack(err, null);
        else {
            callBack(null, returnData);
        }
    })
}
exports.start = start;