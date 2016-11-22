/**
 * Created with JetBrains WebStorm.
 * User: joseppe
 * Date: 14-10-21
 * Time: 上午11:30
 * 联盟副本战斗
 */

var league = require("../model/league");
var leagueMap = require("../model/leagueMap");
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var configManager = require("../config/configManager");
var userVariable = require("../model/userVariable");
var battleModel = require("../model/battle");
var title = require("../model/titleModel");
var mail = require("../model/mail");
var hero = require("../model/hero");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var leagueDragon = require("../model/leagueDragon");


/**
 * 联盟副本战斗
 * @param postData  ({"leagueUid":xx,"leagueMapId":xx})
 * @param response
 * @param query
 */
function start(postData, response, query) {
    if (jutil.postCheck(postData,"leagueUid","leagueMapId") == false) {
        response.echo("leagueMap.battle",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var leagueUid = postData["leagueUid"];
    var leagueMapId = postData["leagueMapId"];
    var configData = configManager.createConfig(userUid);
    var leagueMapConfig;
    var mapdata = {};
    var times = 0;
    var userData;
    var listData;
    var heroList = {};
    var equipList = {};
    var skillList = {};
    var formationList = {};
    var returnOwnTeam = {};
    var returnEnemyTeam = {};
    var battleOwnTeam = {};
    var updateSkillTeam = {};
    var returnData = {};
    var mapConfig;
    var formation = {};
    var npcs = {};
    for(var i = 1; i <= 8; i++){
        npcs[i] = 0;
    }
    var reward = {};

    async.series([
        function (cb) {   ///获取userInfo，体力是否充足
            user.getUser(userUid, function (err, res) {
                if (err || res == null) {
                    cb("noThisUser");
                } else {
                    userData = res;
                    cb(null, null);
                }
            });
        },
        function (cb) {
            userVariable.getLanguage(userUid, function (err, res) {
                var language = res;
                var mailConfigDefault = configData.getConfig("guildMap");
                var mailConfigLocal = configData.getConfig("guildMap" + "_" + language);
                if (mailConfigLocal) {
                    leagueMapConfig = mailConfigLocal;
                } else {
                    leagueMapConfig = mailConfigDefault;
                }
                cb(err);
            });
        },
        function(cb){//验证联盟数据存在
            userVariable.getVariableTime(userUid, "leagueMap", function(err, res){
                if(err)
                    cb(err);
                else if(res == null)
                    cb(null);
                else {
                    if(res["time"] >= jutil.todayTime()){
                        times = res["value"];
                    }
                    if(times >= leagueMapConfig["dailyMaxTime"]){
                        cb("pveOverTimes");
                    } else {
                        cb(null);
                    }
                }
            });
        },
        function(cb){//验证联盟数据存在
            league.getLeague(userUid,leagueUid,function(err, res){
                if (err)
                    cb("dbError");
                else if(res == null)
                    cb("noLeague");
                else
                    cb(null);
            });
        },
        function(cb){
            league.getMember(userUid,leagueUid,userUid,function(err,res){
                if(err || res == null){
                    cb("dbError");
                } else{
                    cb(null);
                }
            });
        },
        function(cb){//取得地图配置
            leagueMap.getMap(userUid,leagueMapId,function(err, res){
                if(err || res == null){
                    cb("dbError");
                } else if(res["finish"] == 1) {
                    cb("dateOut");
                } else if(res["lockTime"] - jutil.now() > 0) {
                    cb("isBattling");
                } else {
                    leagueMap.lockMap(userUid,leagueMapId);
                    mapdata = res;
                    cb(null);
                }
            });
        },
        function(cb){
            mapConfig = leagueMapConfig["bigMap"][mapdata["bigMapId"]]["map"][mapdata["mapId"]];
            //做一次深拷贝
            var k = 1;
            for(var i = 1; i <= 8; i++){
                var npc = {};
                for(var j in mapConfig["formation"][i]){
                    npc[j] = mapConfig["formation"][i][j];
                }
                npc["hp"] -= mapdata["npc"+i];
                if(npc["hp"] <= 0)continue;
                formation[k] = npc;
                formation[k]["position"] = i;
                k++;
            }
            cb(null);
        },
        function (cb) {//检查体力是否足够
            if(userData["pvePower"] - mapConfig["powerCost"] < 0) {
                var newPowerTime = configManager.createConfig(userUid).getPvePower(userData["pvePower"], userData["lastRecoverPvePower"], jutil.now());
                if ((newPowerTime[0] - 0) >= mapConfig["powerCost"]) {
                    cb(null);
                } else {
                    cb("physicalShortagePVE");
                }
            } else {
                cb(null);
            }
        },
        function (cb) {
            battleModel.getBattleNeedData(userUid, function (err, res) {
                if (err) {
                    cb(err, null);
                } else {
                    heroList = res["heroList"];
                    equipList = res["equipList"];
                    skillList = res["skillList"];
                    formationList = res["formationList"];
                    listData = res;
                    cb(null, null);
                }
            })
        },
        function(cb){//获队伍
            leagueDragon.getDragon(userUid, userData["leagueUid"], function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    listData["dragonData"] = res;
                    cb(null);
                }
            });
        },
        function(cb) {//获取我方的气势
            title.getTitlesPoint(userUid , function(point) {
                userData["momentum"] = point;
                cb(null);
            });
        },
        function (cb) {  ///取得我方加成后的数据信息
            var enemyTeamData = {};
            var skillConfig = configData.getConfig("skill");
            var isMeFirst = mapConfig["momentum"] > userData["momentum"] ? false : true;
            battleModel.getUserTeamDataByUserId(userUid, userData, listData, function (err, targetData, defaultData) {
                if (err) {
                    cb(err);
                } else {
                    var enemyTeamSkillArr;
                    var ownTeamSkillArr;
                    enemyTeamData = configData.getLeagueNpc(formation);
                    var defaultEnemyTeam = configData.getLeagueNpc(formation);
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
                    returnEnemyTeam["name"] = jutil.toBase64(mapConfig["name"]);
                    returnEnemyTeam["momentum"] = mapConfig["momentum"];
                    returnEnemyTeam["team"] = [];
                    for (var eKey in enemyTeamData) {
                        var item = defaultEnemyTeam[eKey];
                        var battle = enemyTeamData[eKey];
                        var skillIdArr = [];
                        for (var s = 0; s < item["skill"].length; s++) {
                            skillIdArr.push(item["skill"][s]["skillId"]);
                        }
                        returnEnemyTeam["team"][(eKey - 0) - 1] = {"heroId": item["icon"], "spirit": battle["spirit"], "hp": battle["hp"], "skill": skillIdArr,"gravityEffect":item["gravityEffect"]}
                    }
                    returnData["enemyTeam"] = returnEnemyTeam;
                    returnData["ownTeam"] = returnOwnTeam;
                    battleModel.doSkillToAllHero(configData, enemyTeamSkillArr, battleOwnTeam, defaultOwnTeam);
                    battleModel.doSkillToAllHero(configData, ownTeamSkillArr, enemyTeamData, defaultEnemyTeam);
                    returnData["roundData"] = [];
                    returnData["isWin"] = false;
                    var defaultOwnTeam = jutil.copyObject(battleOwnTeam);
                    var defaultEnemyTeam = jutil.copyObject(enemyTeamData);
                    for (var i = 1; i <= leagueMapConfig["maxRound"]; i++) {
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
                            break;
                        }
                        isMeFirst = isMeFirst == true ? false : true;
                    }
                    cb(null);
                }
            });
        },
        function(cb){//计算打掉的伤害
            for (var i in returnData["roundData"]) {
                var round = returnData["roundData"][i];
                for(var j in round){
                    if(round[j]["isMe"]){
                        for(var k in round[j]["targetBeAtt"]){
                            var beAtt = round[j]["targetBeAtt"][k];
                            var hurt = beAtt["hurt"]-0;
                            if(formation[beAtt["position"]]["hp"] < beAtt["hurt"]){
                                hurt = formation[beAtt["position"]]["hp"]-0;
                            }
                            for(var g in mapConfig["formation"]){
                                if(g == formation[beAtt["position"]]["position"]){
                                    npcs[g] += Math.floor(hurt);
                                }
                            }
                            formation[beAtt["position"]]["hp"] -= hurt;
                        }
                    }
                }
                var newFormation = {};
                var k = 1;
                for(var j in formation){
                    if(formation[j]["hp"] <= 0)continue;
                    newFormation[k] = formation[j];
                    k++;
                }
                formation = newFormation;
            }
            cb(null);
        },
        function(cb){//更新用户战斗次数
            userVariable.setVariableTime(userUid, "leagueMap", ++times, jutil.now(), cb);
        },
        function(cb){//战斗伤害总量
            leagueMap.setUserHurt(userUid, leagueMapId, npcs, cb);
        },
        function(cb){//计算胜利掉落入库
            if(returnData["isWin"]){
                leagueMap.loot(userUid, mapdata, function(err, res){
                    reward = res;
                    cb(err, res);
                });
            } else {
                cb(null);
            }
        },
        function(cb){//计算无论是否胜利掉落入库
            var playerConfig = configData.getConfig("player");
            var playerLevel = userData["lv"];
            var playerConfigItem = playerConfig["" + playerLevel];
            var heroExp = mapConfig["expReward"] - 0;
            var gold = mapConfig["goldReward"] - 0;
            var personExp = (playerConfigItem["getPlayerExp"] - 0)*mapConfig["powerCost"];
            var personEndLevel = configData.userExpToLevel(userData["lv"], personExp + (userData["exp"] - 0));
            var userUpdate = {};
            userUpdate["exp"] = personExp + (userData["exp"] - 0);
            userUpdate["gold"] = userData["gold"] * 1 + gold;
            var newPower = configManager.createConfig(userUid).getPvePower(userData["pvePower"] - 0, userData["lastRecoverPvePower"] - 0, jutil.now());
            var lastPower = newPower[0];
            userUpdate["lastRecoverPvePower"] = newPower[1];
            userUpdate["pvePower"] = lastPower - mapConfig["powerCost"];
            var dropData = null;
            async.series([
                function (callback) {       //更新玩家信息
                    user.updateUser(userUid, userUpdate, function (err, res) {
                        if (err) {
                            callback(err);
                        } else {
                            returnData["updateUser"] = userUpdate;
                            callback(null);
                        }
                    })
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
                    var arr = [];
                    var heroGetExp = {};
                    for (var key in formationList) {
                        var formationItem = formationList[key];
                        var heroUid = formationItem["heroUid"];
                        var heroItem = heroList[heroUid];
                        var maxExp = configData.heroMaxExp(heroItem["heroId"], personEndLevel);
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
                },
                function (callback) {   //伤害档次掉落奖励
                    callback(null);
                    return;
                    var lootConfig = mapConfig["hurtReward"];
                    var hurt = 0;//单次战斗伤害总量
                    for(var i in npcs){
                        hurt += npcs[i]-0;
                    }
                    var hurtReward = null;
                    for(var i in lootConfig){
                        if(hurt >= i-0){
                            hurtReward = lootConfig[i];
                        }
                    }
                    dropData = {"equipData":hurtReward,"teachData":null};
                    if(hurtReward != null){
                        modelUtil.addDropItemToDB(hurtReward["id"], hurtReward["count"], userUid, 0, 1, function(err,res){
                            if (err) callback("dbError");
                            else {
                                dropData["equipData"] = res;
                                dropData["equipData"]["dropCount"] = hurtReward["count"];
                                mongoStats.dropStats(hurtReward["id"], userUid, '127.0.0.1', userData, mongoStats.E_LEAGUE_LOOT, hurtReward["count"]);
                                callback(null);
                            }
                        });
                    } else {
                        callback(null);
                    }
                }
            ], function (err) {
                if (err) {
                    cb(err, null);
                } else {
                    returnData["drop"] = dropData;
                    cb(null);
                }
            });
        },
        function(cb){//更新npc血量
            var otherData = {"finish":returnData["isWin"]?1:0};
            //if(returnData["isWin"]){
            //    otherData["reward"] = JSON.stringify(reward);
            //}
            leagueMap.updateMap(userUid, leagueMapId, npcs, otherData, cb);
        },
        function(cb){//给伤害最高人发奖励
            if(returnData["isWin"]){
                leagueMap.getMaxUserHurt(userUid, leagueMapId, function (err, res) {
                    if (err || res == 0) {
                        cb('dbError');
                    } else {
                        var lang;
                        async.series([function (caoCb) {
                            userVariable.getLanguage(res, function (err, res) {
                                lang = res;
                                caoCb(err);
                            });
                        }, function (caoCb) {
                            var mailConfig;
                            var mailConfigDefault = configData.getConfig("mail");
                            var mailConfigLocal = configData.getConfig("mail" + "_" + lang);
                            if (mailConfigLocal) {
                                mailConfig = mailConfigLocal;
                            } else {
                                mailConfig = mailConfigDefault;
                            }
                            var message = jutil.formatString(mailConfig["leagueMap"], [mapConfig["name"]]);
                            mongoStats.dropStats(reward["id"], res, '127.0.0.1', null, mongoStats.E_LEAGUE_LOOT, reward["count"]);
                            mail.addMail(res, -1, message, JSON.stringify([reward]), leagueMapId, caoCb);
                        }, function (caoCb) {
                            caoCb();
                        }], function (err, res) {
                            cb(err);
                        });
                    }
                });
            } else {
                cb(null);
            }
        },
        function (cb) {//给击杀者也就是当前用户发奖励
            if (returnData["isWin"]) {
                var killReward = mapConfig["killReward"];
                var message = jutil.formatString(leagueMapConfig["killRewardMsg"], [leagueMapConfig["bigMap"][mapdata["bigMapId"]]["name"], mapConfig["name"]]);
                mongoStats.dropStats(killReward["id"], userUid, '127.0.0.1', null, mongoStats.E_LEAGUE_LOOT, killReward["count"]);
                mail.addMail(userUid, -1, message, JSON.stringify(killReward), leagueMapId, cb);
            } else {
                cb(null);
            }
        },
        function(cb){//写入日志
            if(returnData["isWin"]){
                var content = jutil.formatString(leagueMapConfig["msg"], [mapConfig["name"]]);
                leagueMap.setMapLog(userUid, leagueUid, content, cb);
            } else {
                cb(null);
            }
        }
    ],function(err){
        if (err) {
            response.echo("leagueMap.battle",jutil.errorInfo(err));
        } else {
            response.echo("leagueMap.battle",returnData);
        }
    });

}

exports.start = start;