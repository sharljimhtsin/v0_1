/**
 * Created with JetBrains WebStorm.
 * 赛亚人图阵model--Matrix
 * User: za
 * Date: 16-4-8
 * Time: 下午19:51(预计三周)
 * To change this template use File | Settings | File Templates.
 */
var async = require("async");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var redis = require("../alien/db/redis");
var bitUtil = require("../alien/db/bitUtil");
var configManager = require("../config/configManager");
var battleModel = require("../model/battle");
var formation = require("../model/formation");
var hero = require("../model/hero");
var skill = require("../model/skill");
var equipment = require("../model/equipment");
var gravity = require("../model/gravity");
var card = require("../model/card");
var specialTeam = require("../model/specialTeam");
var jutil = require("../utils/jutil");
var user = require("../model/user");
var leagueDragon = require("../model/leagueDragon");
var title = require("../model/titleModel");
var modelUtil = require("../model/modelUtil");
var item = require("../model/item");
var ACTIVITY_CONFIG_NAME = "matrix";
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
    activityData.getActivityData(userUid, activityData.MATRIX, function (err, res) {
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
    activityData.updateActivityData(userUid, activityData.MATRIX, mObj, callbackFn);
}
//开始战斗
function battle(userUid, type, callbackFn){
    var configData = configManager.createConfig(userUid);
    var matConfig = configData.getConfig("pictureFormation");
    var rewardData = matConfig[type]["reward"];
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
                    enemyTeamData = configData.getPveNpcForMatrix(type);//TODO
                    var defaultEnemyTeam = configData.getPveNpcForMatrix(type);//TODO
                    battleOwnTeam = targetData;
                    defaultOwnTeam = defaultData;
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
                        if (round["complete"]) {
                            returnData["isWin"] = round["win"];
                            returnData["reward"] = rewardData;
                            break;
                        }
                        isMeFirst = isMeFirst == true ? false : true;
                    }
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
    redis.user(userUid).s("matrix:lable"+ACTIVITY_CONFIG_NAME).setObj(lable, callbackFn);
}
//获取关卡标识数据
function getLable(userUid,callbackFn){
    redis.user(userUid).s("matrix:lable"+ACTIVITY_CONFIG_NAME).getObj(callbackFn);
}
//初始化数据
function initData(userUid,callbackFn){
    var trial = {};
    var list = {};
    var trialTypeList = [];
    var trialTimes = 0;
    var trialFreeFreshTimes = 0;
    var summonFreeTimes = 0;
    var trialBattleTimesList = [];
    var currentConfig;
    var prism = {};
    var userVip = 0;
    var matrixData = {};
    var configData = configManager.createConfig(userUid);
    var matConfig = configData.getConfig("pictureFormation");
    var chips = 0;
    async.series([function(cb){
        getConfig(userUid,function(err,res){
            if(err)cb(err);
            else{
                currentConfig = res[2];
                summonFreeTimes = currentConfig["summonFreeTimes"]-0;
                trialFreeFreshTimes = matConfig["freeTime"]-0;
                trialTypeList = currentConfig["trialTypeList"];
                trialBattleTimesList = currentConfig["trialBattleTimesList"];
                cb(null);
            }
        });
    },function(cb){//取玩家的vip
        user.getUser(userUid,function(err,res){
            if(err)cb(err);
            else{
                userVip = res["vip"]-0;
//                    console.log(userVip,"vip...");
                cb(null);
            }
        });
    },function(cb){
        getUserData(userUid,function(err,res){
            if(err)cb(err);
            else{
                list = res["arg"];
                cb(null);
            }
        });
    },function(cb){//获取灵石碎片个数
        item.getItem(userUid,"153678",function(err,res){
            console.log(res,"23223");
            if(err)cb(err);
            else{
                if(res["number"] == null){
                    chips = 0;
                } else{
                    chips = res["number"] -0;
                }
                cb(null);
            }
        });
    },function(cb){
        matrixData = {"chips":chips,"prismValue":0,"activatePrism":0,"summonTimes":summonFreeTimes,"trial":{},"summon":{},"prismShop":[],"crystalShop":[],"prism":{},"bag":[]};
        cb(null);
    },

//        function(cb){
//        for(var p in trialBattleTimesList){
//            if(trialBattleTimesList[p]["s"] <= userVip && userVip <= trialBattleTimesList[p]["e"]){
//                trialTimes = trialBattleTimesList[p]["times"]-0;
//                break;
//            }
//        }
////        console.log(trialTimes,"trialTimes");
//        cb();
//    },function (cb) {//试炼
//        trial = {
//            "trialTimes":trialTimes,
//            "trialFreshTimes":trialFreeFreshTimes,
//            "battleList":{}
//        }
//        var t1List = {
//            "heroId": "",
//            "rewardList": []
//        }
//        var tList = {};
//        for(var x in trialTypeList){
//            x = trialTypeList[x];
//            var key = x;
//            tList[x] = key;
//            tList[x] = t1List;
//        }
//        trial["battleList"] = tList;
//        matrixData["trial"] = trial;
//        console.log(trial,"trial...");
//        cb(null);
//    },function(cb){//图阵卡册
//        prism = {
//            "crystal":0,
//            "trialValue":0,
//            "activateTrial":0,
//            "prismCardList":[],
//            "attack":0,
//            "defence":0,
//            "hp":0,
//            "spirit":0
//        };
//        matrixData["prism"] = prism;
//        cb(null);
//    },

//        function(cb){//试炼
//            if(list["trial"] == undefined){
//                console.log("gggggggg");
//                cb();
//            }else{
//                list["trial"] = trial;
//                console.log("bbbbbbbb");
//                cb();
//            }
//        },function(cb){//图阵列表
//            if(matrixData["prism"]){
//                cb();
//            }else{
//                matrixData["prism"] = prism;//配置
//                cb();
//            }
//        },
        function(cb){//初始化数据
            if (list == undefined) {
                list = matrixData;
                setUserData(userUid,list,cb);
            }else{
                cb(null);
            }
        }

//        function(cb){//图阵
//            if(matrixData["prism"]){
//                cb();
//            }else{
//                matrixData["prism"] = prism;//配置
//                cb();
//            }
//        },
//        function(cb){//背包
//            if(matrixData["bag"]){
//                cb();
//            }else{
//                matrixData["bag"] = bag;//配置
//                cb();
//            }
//},
        ],function(err,res){
        callbackFn(err,list);
    });
}

exports.getConfig = getConfig;//获取配置
exports.getUserData = getUserData;//获取用户数据
exports.setUserData = setUserData;//设置用户数据
exports.battle = battle;//战斗

exports.initData = initData;//初始化数据
exports.save = save;
exports.getLable = getLable;