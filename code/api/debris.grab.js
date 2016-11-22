/**
 * 残章抢夺
 * User: liyuluan
 * Date: 13-12-10
 * Time: 下午5:55
 */

var jutil = require("../utils/jutil");
var debris = require("../model/debris");
var battle = require("../model/battle");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var user = require("../model/user");
var userVariable = require("../model/userVariable");
var hero = require("../model/hero");
var mail = require("../model/mail");
var async = require("async");
var title = require("../model/titleModel");
var mongoStats = require("../model/mongoStats");
var achievement = require("../model/achievement");
var leagueDragon = require("../model/leagueDragon");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "targetUid", "skillId", "debrisType") == false) {
        response.echo("debris.grab", jutil.errorInfo("postError"));
        return;
    }

    var targetUid = postData["targetUid"];
    var skillId = postData["skillId"];
    var debrisType = postData["debrisType"];
    var userUid = query["userUid"];
    var configData = configManager.createConfig(userUid);

    var gUserLevel = 0;//玩家等级
    var gTargetData = null; // 目标数据  {"type":0,"level":targetLevel,"id":mKey};
    var gTeamA = null; //my team 数据
    var gTeamB = null; //敌方数据
    var gOperandNum = 100; //已合成次数
    var gUserData = null;//用户数据

    var rReturnResult = null;//返回的数据

    async.auto({
        "getGrabTarget":function(cb) { //取目标数据
            debris.getGrabTarget(userUid, function(err, res) {
                if (err) cb("dbError");
                else {
                    if (res == null || res[targetUid] == null || res[targetUid]["skillId"] != skillId) {
                        cb("targetInvalid");
                    } else {
                        gTargetData = res[targetUid];
                        cb(null);
                    }
                }
            });
        },
        "getOperandNum":function(cb) {
            debris.getDebrisItem(userUid, skillId, function(err,res) {
                if (err || res == null) cb("dbError");
                else {
                    gOperandNum = res["operandNum"];
                    cb(null);
                }
            });
        },
        "getTeamAData":["getGrabTarget",function(cb) { //取已方战斗数据
            getTeamData(userUid, function(err, res) {
                if (err) cb("dbError");
                else {
                    gTeamA = res;
                    gUserData = res["userData"];
                    gUserLevel = gUserData["lv"];
                    var mUserData = res["userData"];
                    var addMax = 0;
                    if(mUserData["monthCard"] == "fifty"){
                        addMax = 18;
                    }
                    var pvpPowerList = configData.getPvpPower(mUserData["pvpPower"], mUserData["lastRecoverPvpPower"], jutil.now(),addMax);
                    if (pvpPowerList[0] <= 0) {
                        cb("pvpPowerNotEnough");
                    } else {
                        title.getTitlesPoint(userUid , function(point) { //取我方气势
                            gUserData["momentum"] = point;
                            cb(null);
                        });
                    }
                }
            });
        }],
        "getTeamBData":["getGrabTarget",function(cb) { //取敌方战斗数据
            if (gTargetData["type"] == 0) {
                getNpcTeamData(configData, gTargetData["level"], gTargetData["id"], function(err, res) {
                    if (err) cb("configError");
                    else {
                        gTeamB = res;
                        gTeamB["userData"]["momentum"] = 0;
                        cb();
                    }
                });
            } else {
                var targetUid = gTargetData["id"];
                getTeamData(targetUid, function(err, res) {
                    if (err) cb("dbError");
                    else {
                        gTeamB = res;
                        title.getTitlesPoint(targetUid , function(point) { //取敌方气势
                            gTeamB["userData"]["momentum"] = point;
                            cb(null);
                        });
                    }
                });
            }
        }],
        "twoTeamBattle":["getTeamAData","getTeamBData",function(cb) {
            var returnResult = {};
            doOwnAdd(configData, gTeamB["targetData"],gTeamB["defaultData"]);
            returnResult["ownTeam"] = battle.getTeamReturnData(gTeamA["defaultData"],gTeamA["targetData"],gTeamA["userData"]);
            returnResult["enemyTeam"] = battle.getTeamReturnData(gTeamB["defaultData"],gTeamB["targetData"],gTeamB["userData"]);
            battle.doSkillToAllHero(configData, gTeamB["doOtherTeamSkill"],gTeamA["targetData"],gTeamA["defaultData"]);
            battle.doSkillToAllHero(configData, gTeamA["doOtherTeamSkill"],gTeamB["targetData"],gTeamB["defaultData"]);
            var momentumA = gTeamA["userData"]["momentum"];
            var momentumB = gTeamB["userData"]["momentum"];
            returnResult["ownTeam"]["momentum"] = momentumA;
            returnResult["enemyTeam"]["momentum"] = momentumB;
            var isOwnFirst = true;
            if (momentumA < momentumB) isOwnFirst = false;
            var returnResultRoundData = [];
            var teamATargetData = gTeamA["targetData"];
            var teamBTargetData = gTeamB["targetData"];
            var defaultOwnTeam = jutil.copyObject(teamATargetData);
            var defaultEnemyTeam = jutil.copyObject(teamBTargetData);

            for (var i = 0; i < 3; i++) {
                var teamAcode = battle.returnNewTeam(teamATargetData, defaultOwnTeam);
                teamATargetData = teamAcode[0];
                defaultOwnTeam = teamAcode[1];
                var teamBcode = battle.returnNewTeam(teamBTargetData, defaultEnemyTeam);
                teamBTargetData = teamBcode[0];
                defaultEnemyTeam = teamBcode[1];
                var battleResult = battle.twoTeamBattle(configData, teamATargetData,teamBTargetData,isOwnFirst,i+1, defaultOwnTeam, defaultEnemyTeam);
                battle.addDeadInBackData(gTeamA["targetData"],returnResult["ownTeam"]["team"],i + 1);
                returnResultRoundData.push(battleResult["roundData"]);
                if (battleResult["complete"] == true) {
                    returnResult["isWin"] = battleResult["win"];
                    break;
                }
                isOwnFirst = !isOwnFirst;
            }
            returnResult["roundData"] = returnResultRoundData;
            rReturnResult = returnResult;

            cb(null);
        }],
        "drop":["twoTeamBattle","getOperandNum",function(cb) { //掉落
            if (rReturnResult["isWin"] == false) {
                cb(null); //输了跳过掉落
                return;
            }
            var mUserLevel = gUserLevel; //玩家等级
            var targetUserLevel = gTargetData["level"];
            var mProb = targetUserLevel - mUserLevel; //等级差
            if (mProb < -3) mProb = -3;
            if (mProb > 3) mProb = 3;
            var mPatchRewardProb = configData.g("pvpPatch")("patchRewardProb")();
            if (gOperandNum >= mPatchRewardProb.length) gOperandNum = mPatchRewardProb.length - 1;
            var mProbability = configData.g("pvpPatch")("patchRewardProb")(gOperandNum)(mProb)();//取得概率
            if (mProbability == null) mProbability("configError");
            else {
                if (Math.random() < mProbability ) {
                    debris.addDebris(userUid,skillId,"type" + debrisType,1,0,function(err,res) {
                        if (err) cb("dbError");
                        else {
                            var userIP = '127.0.0.1';//response.response.socket.remoteAddress;
                            mongoStats.dropStats(skillId, userUid, userIP, gUserData, mongoStats.DEBRIS_GRAB, 1, 1, "type" + debrisType);
                            rReturnResult["drop"] = res;
                            rReturnResult["dropType"] = debrisType;
                            if (gTargetData["type"] != 0) {
                                userVariable.getLanguage(gTargetData["id"], function (err, res) {
                                    var language = res;
                                    var mailConfig;
                                    var mailConfigLocal = configData.getConfig("mail" + "_" + language);
                                    var mailConfigDefault = configData.getConfig("mail");
                                    if (mailConfigLocal) {
                                        mailConfig = mailConfigLocal;
                                    } else {
                                        mailConfig = mailConfigDefault;
                                    }
                                    var pvpPatchLostMsg = mailConfig["pvpPatchLost"];
                                    pvpPatchLostMsg = pvpPatchLostMsg.replace("{0}", gUserData["userName"]);
                                    var skillName = configData.g("skill")(skillId)("name")() || "";
                                    pvpPatchLostMsg = pvpPatchLostMsg.replace("{1}", skillName);
                                    if (pvpPatchLostMsg != null) { //发送残章被抢邮件
                                        mail.addMail(gTargetData["id"], -1, pvpPatchLostMsg, "", 0, function () {
                                        });
                                    }
                                });

                                debris.addDebris(gTargetData["id"],skillId,"type" + debrisType,-1,0, function(err,res) { //扣去被抢的人的残章
                                    cb(null);
                                    if (err) console.error("debris.grab",err.stack);
                                });
                            } else {
                                cb(null);
                            }
                        }
                    });
                } else {
                    rReturnResult["drop"] = null;
                    cb(null);
                }
            }
        }],
        "userDataUpdate":["drop",function(cb) { //更新玩家的经验和精力值
            var newUserData = {};
            var mUserData = gTeamA["userData"];
            var getPlayerExp = configData.g("player")(gUserLevel)("getPlayerExp")() - 0;
            newUserData["exp"] = mUserData["exp"] - 0 + getPlayerExp;
            var addMax = mUserData["monthCard"] == "fifty" ? 18 : 0;
            var pvpPowerArray = configData.getPvpPower(mUserData["pvpPower"],mUserData["lastRecoverPvpPower"], jutil.now(),addMax);
            newUserData["pvpPower"] = pvpPowerArray[0] - 1;
            newUserData["lastRecoverPvpPower"] = pvpPowerArray[1];
            user.updateUser(userUid, newUserData, function(err,res) {
                if (err) console.error("debris.grab",err.stack);
                else {
                    newUserData["gold"] = mUserData["gold"];
                    rReturnResult["updateUser"] = newUserData;
                }
                cb(null);
            });
        }],
        "heroDataUpdate":["userDataUpdate", function(cb) { //更新编队中武将的经验
            if (rReturnResult["isWin"] == false) {
                cb(null); //输了跳过hero经验处理
                return;
            }
            var getHeroExp = configData.g("player")(gUserLevel)("getHeroExp")() - 0;

            updateHeroExp(userUid,gUserLevel, gTeamA["formationList"],gTeamA["heroList"],getHeroExp,function(err, res) {
                rReturnResult["heroGetExp"] = res;
                cb(null);
            });
        }]
    }, function(err) {
        if (err) response.echo("debris.grab", jutil.errorInfo(err));
        else {
            if (rReturnResult["isWin"]) {
                achievement.pvpPatchWinTime(userUid, 1, function(){}); // 成绩数据统计
            }

            response.echo("debris.grab",rReturnResult);
        }
    });
}

function doOwnAdd(configData, enemyBattleData, enemyDefaultData){
    var skillConfig = configData.getConfig("skill");
    for(var key in enemyBattleData){
        var enemyItem = enemyBattleData[key];
        var defaultItem = enemyDefaultData[key];
        if (enemyItem == null) {
            console.error(key, "key 不存在", enemyBattleData);
            continue;
        }
        var skillList = enemyItem["skill"];
        if (skillList == null || skillList.length == 0) {
            continue;
        }
        var skill = enemyItem["skill"][0];
        var skillId = skill["skillId"];
        var configSkill = skillConfig[skillId];
        var add = configSkill["attr"] / 100;
        if(battle.doSkillAdd(enemyBattleData,enemyDefaultData,key,add,configSkill["skillType"])){
            enemyItem["skill"] = [];
        }else{
            if(enemyItem["skill"] == null || enemyItem["skill"].length == 0){
                continue;
            }else{
                defaultItem["skill"] = [];
                enemyItem["skill"][0]["skillProp"] = 0;
                enemyItem["skill"][0]["skillCount"] = 0;
                enemyItem["skill"][0]["skillTime"] = 0;
            }
        }
    }
}
/**
 * 取一team的数据 (非NPC)
 * @param userUid
 * @param callbackFn
 */
function getTeamData(userUid, callbackFn) {
    var configData = configManager.createConfig(userUid);
    battle.getBattleNeedData(userUid, function(err,res) {
        if (err) callbackFn(err);
        else {
            var battleNeedData = res;
            var mHeroList = battleNeedData.heroList;
            var mSkillList = battleNeedData.skillList;
            var mEquipList = battleNeedData.equipList;
            var mFormationList = battleNeedData.formationList;
            var returnData = {};

            user.getUser(userUid, function(err,res) {
                if (err) callbackFn(err);
                else {
                    returnData["userData"] = res;
                    returnData["formationList"] = mFormationList;
                    returnData["heroList"] = mHeroList;
                    leagueDragon.getDragon(userUid, res["leagueUid"], function (err, res) {
                        if (err) {
                            callbackFn(err);
                        } else {
                            battleNeedData["dragonData"] = res;
                            battle.getUserTeamDataByUserId(userUid, res, battleNeedData, function (err, targetData, defaultData) {
                                if (err) callbackFn(err);
                                else {
                                    var doOtherTeamSkill = battle.returnDoOtherTeamSkill(configData, defaultData);
                                    returnData["doOtherTeamSkill"] = doOtherTeamSkill;
                                    returnData["targetData"] = targetData;
                                    returnData["defaultData"] = defaultData;
                                    callbackFn(null, returnData);
                                }
                            });
                        }
                    });
                }
            });
        }
    });
}

/**
 * 取NPC team的数据
 * @param level
 * @param id
 * @param callbackFn
 */
function getNpcTeamData(configData, level, id, callbackFn) {
    var npcList = configData.g("pvpPatch")("fakeData")(level)("fakeDataFormation")(id)("formation")();
    var npcLevel = configData.g("pvpPatch")("fakeData")(level)("npcLevel")();

    if (npcList == null || npcList instanceof Array == false || npcLevel == null) callbackFn("configError");
    else {
        var mData = {};
        var dData = {};
        for (var i = 0; i < npcList.length; i++) {
            var npcHeroId = npcList[i];
            var teamId = i+1;
            mData[teamId] = configData.getHeroObjByIdLevel(npcHeroId, npcLevel - 0, 0);
            dData[teamId] = configData.getHeroObjByIdLevel(npcHeroId, npcLevel - 0, 0);
        }
        var doOtherTeamSkill = battle.returnDoOtherTeamSkill(configData, mData);
        var returnData = {};
        returnData["doOtherTeamSkill"] = doOtherTeamSkill;
        returnData["targetData"] = mData;
        returnData["defaultData"] = dData;
        var npcData = configData.g("pvpPatch")("fakeData")(level)("fakeDataFormation")(id)();
        var mUserData = {};
        mUserData["userName"] = npcData["playerName"];
        mUserData["momentum"] = 0;
        returnData["userData"] = mUserData;
        callbackFn(null, returnData);
    }
}


/**
 * 更新编队中的hero
 * @param formationList
 * @param heroList
 * @param addExp
 * @param callbackFn
 */
function updateHeroExp(userUid,userLevel, formationList, heroList, addExp, callbackFn) {
    var configData = configManager.createConfig(userUid);
    var heroUidList = [];
    for (var key in formationList) {
        var mItem = formationList[key];
        heroUidList.push(mItem["heroUid"]);
    }

//    var newHeroDataList = null;

    async.map(heroUidList, function(heroUid,forCb) {
        var heroData = heroList[heroUid];
        if (heroData != null) {
            var newHeroExp = heroData["exp"] - 0 + addExp;
            var maxHeroExp = configData.heroMaxExp(heroData["heroId"], userLevel);
            if (newHeroExp > maxHeroExp) newHeroExp = maxHeroExp; //大于允许的最高等级的经验取最高等级的经验
            var newHeroLevel = configData.heroExpToLevel(heroData["heroId"],newHeroExp);
            var newHeroData = {"exp":newHeroExp, "level":newHeroLevel};
            hero.updateHero(userUid,heroUid,newHeroData, function(err,res) {
                if (err) forCb(null);
                else {
                    newHeroData["heroUid"] = heroUid;
//                    newHeroDataList[heroUid] = newHeroData;
                    forCb(null, newHeroData);
                }
            });
        } else {
            forCb(null);
        }
    }, function(err, res){
        callbackFn(null, res);
    });

//    async.map(heroUidList, function(heroUid,forCb) {
//        var heroData = heroList[heroUid];
//        if (heroData != null) {
//            var newHeroExp = heroData["exp"] - 0 + addExp;
//            var maxHeroExp = configData.heroMaxExp(heroData["heroId"], userLevel);
//            if (newHeroExp > maxHeroExp) newHeroExp = maxHeroExp; //大于允许的最高等级的经验取最高等级的经验
//            var newHeroLevel = configData.heroExpToLevel(heroData["heroId"],newHeroExp);
//            var newHeroData = {"exp":newHeroExp, "level":newHeroLevel};
//            hero.updateHero(userUid,heroUid,newHeroData, function(err,res) {
//                if (err) forCb(null);
//                else {
//                    newHeroData["heroUid"] = heroUid;
////                    newHeroDataList[heroUid] = newHeroData;
//                    forCb(null, newHeroData);
//                }
//            });
//        } else {
//            forCb(null);
//        }
//    }, function(err, res) {
//        callbackFn(null, res);
//    });
}


exports.start = start;