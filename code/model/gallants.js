/**
 * Created with JetBrains WebStorm.
 * 武道会擂台赛model
 * User: za
 * Date: 16-1-21
 * Time: 上午10:20(预计两周)
 * To change this template use File | Settings | File Templates.
 */
var async = require("async");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var battleModel = require("../model/battle");
var formation = require("../model/formation");
var hero = require("../model/hero");
var skill = require("../model/skill");
var equipment = require("../model/equipment");
var gravity = require("../model/gravity");
var card = require("../model/card");
var specialTeam = require("../model/specialTeam");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var user = require("../model/user");
var redis = require("../alien/db/redis");
var leagueDragon = require("../model/leagueDragon");
var title = require("../model/titleModel");

var ACTIVITY_CONFIG_NAME = "gallants";
//获取配置
function getConfig(userUid,callbackFn){
    // 1.获取活动配置数据
    activityConfig.getConfig(userUid,ACTIVITY_CONFIG_NAME,function(err,res){
        if(err || res ==null)callbackFn("CannotgetConfig");
        else{
            if(res[0]){
                var sTime = res[4];
                var eTime = res[5];
                var currentConfig = res[2];
                callbackFn(null, [sTime, eTime, currentConfig]);
            }else{
                callbackFn("notOpen");
            }
        }
    });
}
//获取用户数据
function getUserData(userUid, callbackFn) {
    activityData.getActivityData(userUid, activityData.GALLANTS, function (err, res) {
        var obj;
        var returnData = {};
        if (res["arg"] == "") {
            obj = null;
        } else {
            try {
                obj = JSON.parse(res["arg"]);
            } catch (e) {
                returnData["arg"] = null;
            } finally {
                returnData["arg"] = obj;
            }
        }
        callbackFn(err, returnData);
    });
}
//设置用户当前数据
function setUserData(userUid, data, callbackFn){
    var mObj = {};
    mObj["data"] = 0;
    mObj["dataTime"] = 0;
    mObj["status"] = 0;
    mObj["statusTime"] = 0;
    mObj["arg"] = JSON.stringify(data);
    activityData.updateActivityData(userUid, activityData.GALLANTS, mObj, callbackFn);
}
//开始战斗
function battle(userUid, type, index, callbackFn){
    var configData = configManager.createConfig(userUid);
    var momentum = 0;
    var userData = {};
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
    var npcNameList = {};
    var mapItem = null;

    async.series([
        function(callBack){
            user.getUser(userUid,function(err,res){
                if (err) {
                    callBack(err, null);
                } else {
                    if(res == null)callBack("noThisUser", null);
                    else{
                        userData = res;
                        callBack(null,null);
                    }
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
            battleModel.getUserTeamDataByUserId(userUid, userData, listData, function (err, targetData, defaultData) {
                if (err) {
                    callBack(err, null);
                } else {
                    var enemyTeamSkillArr = [];
                    var ownTeamSkillArr = [];
                    enemyTeamData = configData.getPveNpcForGallants(type,index);//TODO
                    var defaultEnemyTeam = configData.getPveNpcForGallants(type,index);//TODO
//                    console.log(enemyTeamData,"66666666666",defaultEnemyTeam,"7777777");
                    battleOwnTeam = targetData;
                    defaultOwnTeam = defaultData;
//                    console.log(battleOwnTeam,defaultOwnTeam,"9-9-9");
                    for (var key in enemyTeamData) {
                        var enemyItem = enemyTeamData[key];
                        var defaultItem = defaultEnemyTeam[key];
                        var skill = enemyItem["skill"][0];
                        var skillId = skill["skillId"];
                        var configSkill = skillConfig[skillId];
                        var add = configSkill["attr"] / 100;
                        npcNameList = enemyItem["name"];
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

                    returnEnemyTeam["name"] = jutil.toBase64(npcNameList);
                    returnEnemyTeam["momentum"] = "???";
                    returnEnemyTeam["team"] = [];
                    for (var eKey in enemyTeamData) {
                        var item = defaultEnemyTeam[eKey];
                        var battle = enemyTeamData[eKey];
                        var skillIdArr = [];
                        for (var s = 0; s < item["skill"].length; s++) {
                            skillIdArr.push(item["skill"][s]["skillId"]);
                        }
                        returnEnemyTeam["team"][(eKey - 0) - 1] = {"formationId": item["formationId"], "heroId": item["heroId"], "spirit": battle["spirit"], "hp": battle["hp"], "skill": skillIdArr,"gravityEffect":item["gravityEffect"]}
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
//                        console.log(JSON.stringify(round),"9-9-9");
                        if (round["complete"]) {
                            returnData["isWin"] = round["win"];
                            break;
                        }
                        isMeFirst = isMeFirst == true ? false : true;
                    }
//                    console.log(returnData["roundData"],"44444444",round["complete"],round["win"],isMeFirst);
                    callBack();
                }
            });
        }
    ],function(err,res){
        callbackFn(err,returnData);
    });
}
//保存关卡标识数据
function save(userUid,lable,callbackFn){
    redis.user(userUid).s("practice:lable"+ACTIVITY_CONFIG_NAME).setObj(lable, callbackFn);
}
//获取关卡标识数据
function getLable(userUid,callbackFn){
    redis.user(userUid).s("practice:lable"+ACTIVITY_CONFIG_NAME).getObj(callbackFn);
}
exports.getConfig = getConfig;//获取配置
exports.getUserData = getUserData;//获取用户数据
exports.setUserData = setUserData;//设置用户数据 battle
exports.battle = battle;//战斗

exports.save = save;
exports.getLable = getLable;