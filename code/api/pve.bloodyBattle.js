/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 13-11-18
 * Time: 下午5:47
 * To change this template use File | Settings | File Templates.
 */
var jutil = require("../utils/jutil");
var budokai = require("../model/budokai");
var bloodyLeaderboard = require("../model/bloodyLeaderboard");
var async = require("async");
var battleModel = require("../model/battle");
var configManager = require("../config/configManager");
var user = require("../model/user");
var item = require("../model/item");
var bloodyBattle = require("../model/bloodyBattle");
var activityConfig = require("../model/activityConfig");
var title = require("../model/titleModel");
var titleApi = require("../api/title.get");
var mongoStats = require("../model/mongoStats");
var vitality = require("../model/vitality");
var leagueDragon = require("../model/leagueDragon");

function start(postData, response, query){
    if (jutil.postCheck(postData,"type") == false) {
        response.echo("pve.bloodyBattle",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var type = postData["type"];
    var ownBattleData = {};
    var ownDefaultBattleData = {};
    var enemyBattleData;
    var enemyDefaultData;
    var dealOwnData;
    var dealOwnDefaultData;
    var bloodBattleInfo;
    var lastEachPointStarOld='';
    var starData = {"easy" : 1 , "normal" : 2 ,"hard" : 3};
    var isMeFirst = true;
    var battleReturnData = {};
    var userData;
    var userLevel = 0;
    var teamInfo;
    var updateSkillTeam = {};
    var configData = configManager.createConfig(userUid);
    var multiplesConfig ={};
    var userIP = '127.0.0.1';//response.response.socket.remoteAddress;
    var ownListData;
    async.series([
        function(callBack){
            user.getUser(userUid,function(err,res){
                if(err || res == null){
                    callBack("noThisUser",null)
                }else{
                    userData = res;
                    userLevel = userData["lv"] - 0;
                    callBack(null,null);
                }
            })
        },
        function(callBack) {//获取我方的气势
            title.getTitlesPoint(userUid , function(point) {
                userData["momentum"] = point;
                callBack(null, null);
            });
        },
        function(callBack){    //获取血战信息
            budokai.getRedisBattleInfo(userUid,function(err,res){
                if(err || res == null){
                    callBack("bloodyBattleWrong",null);
                }else{
                    bloodBattleInfo = res;
                    if(jutil.compTimeDay(bloodBattleInfo["todayLastTime"],jutil.now()) == false){
                        bloodyBattle.upDataDb(userData,bloodBattleInfo,function(err,res){
                            var da = {};
                            da["error"] = "bloodBattleTimeOver";
                            response.echo("pve.bloodyBattle",da);
                            return;
                        });
                    }else{
                        if(bloodBattleInfo["challengingTimes"] < 1 || bloodBattleInfo["team"]["teamInfo"] == null){  //挑战次数是否足够,或者队伍存在
                            callBack("challengingTimesNotEnough",null);
                            return;
                        }else{
                            teamInfo = bloodBattleInfo["team"]["teamInfo"];
                            callBack(null,null);
                        }
                    }
                }
            });
        },
        function(callback) { // 添加称号数据
            if(bloodBattleInfo["numberOfPoints"] == 1){
                vitality.vitality(userUid, "bloodBattal", {"completeCnt":1}, function(){});
                title.bloodBattleCountChange(userUid, function(){
                    callback();
                });
            } else {
                callback();
            }
        },
        function (callback) {//可以挑战开始挑战,获取己方的挑战队列
            battleModel.getBattleNeedData(userUid, function (err, res) {
                if (err || res == null) {
                    callback("bloodyBattleWrong", null);
                } else {
                    ownListData = res;
                    callback();
                }
            })
        },
        function (callback) {
            leagueDragon.getDragon(userUid, userData["leagueUid"], function (err, res) {
                if (err) {
                    callback(err);
                } else {
                    ownListData["dragonData"] = res;
                    callback();
                }
            });
        },
        function (callback) {
            battleModel.getUserTeamDataByUserId(userUid, userData, ownListData, function (err, targetData, defaultData) {
                if (err) {
                    callback("bloodyBattleWrong", null);
                } else {
                    dealOwnData = targetData;
                    dealOwnDefaultData = defaultData;
                    callback(null, null);
                }
            });
        },
        function(callBack){  //
            var bloodBattleConfig = configData.getConfig("bloodBattle");
            var enemyGroup = bloodBattleConfig["enemyGroup"];   //敌方队列
            var groupItem = teamInfo[type];
            var groupArr = enemyGroup[groupItem["groupKey"]];
            var data = budokai.getOneTeam(configData, groupArr,groupItem["indexGroup"],groupItem["index"],groupItem["enemyLevel"]);
            enemyBattleData = data["default"];
            enemyDefaultData = data["add"];
            var index = teamInfo["same"] == true ? 0 : -1;
            var length;
            switch (type){
                case "easy":
                    length = groupItem["index"] - index;
                    break;
                case "normal":
                    length = groupItem["index"];
                    break;
                case "hard":
                    length = groupItem["index"] + index;
                    break;
            }
            for(var i = 0 ; i < length ; i++){
                var key = "" + (i + 1);
                if(dealOwnData[key] == null){
                    continue;
                }
                ownBattleData[key] = dealOwnData[key];
                ownDefaultBattleData[key] = dealOwnDefaultData[key];
            }
            callBack(null,null);
        },
        function(callBack){
            var enemyTeamSkillArr;  //敌方作用于己方的技能
            var ownTeamSkillArr;   //己方作用于敌方的技能
            var skillConfig = configData.getConfig("skill");
                for(var key in enemyBattleData){
                    var enemyItem = enemyBattleData[key];
                    var defaultItem = enemyDefaultData[key];
                    var skill = enemyItem["skill"][0];
                    var skillId = skill["skillId"];
                    var configSkill = skillConfig[skillId];
                    var add = configSkill["attr"] / 100;
                    if(battleModel.doSkillAdd(enemyBattleData,enemyDefaultData,key,add,configSkill["skillType"])){
                        enemyItem["skill"] = [];
                    }else{
                        defaultItem["skill"] = [];
                        enemyItem["skill"][0]["skillProp"] = 0;
                        enemyItem["skill"][0]["skillCount"] = 0;
                        enemyItem["skill"][0]["skillTime"] = 0;
                    }
                }
            for(var key in ownBattleData){
                var battleItem = ownBattleData[key];
                updateSkillTeam[key] = ownBattleData[key];
                battleModel.sortOn(battleItem["skill"],"skillTime");
            }
            enemyTeamSkillArr = battleModel.returnDoOtherTeamSkill(configData, enemyDefaultData);
            ownTeamSkillArr =  battleModel.returnDoOtherTeamSkill(configData, ownDefaultBattleData);
            battleModel.doSkillToAllHero(configData, ownTeamSkillArr,ownBattleData,ownDefaultBattleData);
            battleModel.doSkillToAllHero(configData, enemyTeamSkillArr,enemyBattleData,enemyDefaultData);
            battleModel.addBloodAddInfo(ownBattleData,ownDefaultBattleData,bloodBattleInfo);
            battleReturnData["enemyTeam"] = battleModel.getTeamReturnData(enemyDefaultData,enemyBattleData,{"userName":"???"});
            battleReturnData["ownTeam"] = battleModel.getTeamReturnData(ownDefaultBattleData,ownBattleData,userData);
            battleReturnData["ownTeam"]["momentum"] = userData["momentum"];
            battleReturnData["roundData"] = [];
            var defaultOwnTeam = jutil.copyObject(ownBattleData);
            var defaultEnemyTeam = jutil.copyObject(enemyBattleData);
            for(var i = 1 ; i <= 3 ; i ++){
                battleModel.addDeadInBackData(ownBattleData,battleReturnData["ownTeam"]["team"],i);
                var teamAcode = battleModel.returnNewTeam(ownBattleData, defaultOwnTeam);
                ownBattleData = teamAcode[0];
                defaultOwnTeam = teamAcode[1];
                var teamBcode = battleModel.returnNewTeam(enemyBattleData, defaultEnemyTeam);
                enemyBattleData = teamBcode[0];
                defaultEnemyTeam = teamBcode[1];
                var round = battleModel.twoTeamBattle(configData, ownBattleData,enemyBattleData,isMeFirst,i, defaultOwnTeam, defaultEnemyTeam);
                battleReturnData["roundData"].push(round["roundData"]);
                if(round["complete"]){
                    battleReturnData["isWin"] = round["win"];
                    callBack(null,null);
                    break;
                }
                isMeFirst = isMeFirst == true ? false : true;
            }
        },
        function (callBack){//判断五关奖励
            if(bloodBattleInfo["numberOfPoints"] % 5 == 0){  //5关完成附加奖励
                activityConfig.getConfig(userUid, "bloodBoxM", function(err, res) {
                    var configArray = res;
                    if (configArray[0] == false) {
                        callBack(null,null); //当前没有活动， 取默认
                    } else if(configArray[1] == 0){//活动参数是0  取默认2倍
                        multiplesConfig = {"bloodBoxM":2};
                        callBack(null,null);
                    }else{
                        multiplesConfig = configArray[2] || {}; //如果报错，取默认为1的项
                        callBack(null,null);
                    }
                });
            }else{
                callBack(null,null);
            }
        },
        function(callBack){//战斗结束处理
            if(battleReturnData["isWin"] == true){//赢了，返回队伍信息
                var bigPoint;
                var round = battleReturnData["roundData"].length;  //打了多少回合
                var roundStar = (4 - round) * starData[type];
                if(bloodBattleInfo["numberOfPoints"] % 5 == 0){  //5关完成附加奖励
                    bigPoint = ((Math.ceil(bloodBattleInfo["numberOfPoints"] / 5))) * 5;
                    var lastStar;
                    if(bloodBattleInfo["lastEachPointStar"] && bloodBattleInfo["lastEachPointStar"]["" + bigPoint]){
                        lastStar = bloodBattleInfo["lastEachPointStar"]["" + bigPoint];
                    }else{
                        lastStar = 0;
                    }
                    if(bloodBattleInfo["lastEachPointStar"]) lastEachPointStarOld = JSON.stringify(bloodBattleInfo["lastEachPointStar"]);

                    var thisStar = bloodBattleInfo["currentEachPointStar"]["" + bigPoint] +  roundStar;
                    if(thisStar > lastStar) {
                        if(bloodBattleInfo["lastEachPointStar"] == null) bloodBattleInfo["lastEachPointStar"] = {};
                        bloodBattleInfo["lastEachPointStar"]["" + bigPoint] = thisStar;
                    }
                    bloodBattleInfo["currentEachPointStar"]["" + bigPoint] += roundStar;
                    bloodBattleInfo["reward"]= budokai.getStarRewardByPoints(configData, userLevel, lastStar,thisStar,bloodBattleInfo["numberOfPoints"]);
                    var multiples = multiplesConfig["bloodBoxM"] != null ? multiplesConfig["bloodBoxM"] : 1;
                    if(multiples != 1){
                        var rewardL = bloodBattleInfo["reward"] != null ? bloodBattleInfo["reward"].length : 0;
                        for(var i = 0 ; i < rewardL ; i ++) {
                            var item = bloodBattleInfo["reward"][i];
                            if(item["type"] != "gold" || item["type"] != "ingot"){
                                item["count"] = (item["count"] - 0) * multiples;
                            }
                        }
                    }
                }else{
                    bigPoint = ((Math.ceil(bloodBattleInfo["numberOfPoints"] / 5))) * 5;
                    var pointKey = "" + bigPoint;
                    if(bloodBattleInfo["currentEachPointStar"] && bloodBattleInfo["currentEachPointStar"].hasOwnProperty(pointKey)){
                        bloodBattleInfo["currentEachPointStar"]["" + bigPoint] += roundStar ;
                    }else{
                        if(bloodBattleInfo["currentEachPointStar"] == null){
                            bloodBattleInfo["currentEachPointStar"] = {};
                        }
                        bloodBattleInfo["currentEachPointStar"]["" + bigPoint] = roundStar;
                    }
                }
                if(roundStar == 9){//本次3 * 3星
                    if(bloodBattleInfo["bigestJumpPoints"] + 1 == bloodBattleInfo["numberOfPoints"]){
                        bloodBattleInfo["bigestJumpPoints"] += 1;
                    }
                }
                if(bloodBattleInfo["numberOfPoints"] % 3 == 0){  //该给加成了
                    bloodBattleInfo["addInfo"] = budokai.randomBattleAdd();
                }
                bloodBattleInfo["currentTotleStar"] += roundStar;
                bloodBattleInfo["leastStar"] += roundStar;
                var same = Math.random() <= 0.6 ? true : false;
                var level = userData["lv"] - 0;
                bloodBattleInfo["numberOfPoints"] = bloodBattleInfo["numberOfPoints"] + 1;
                budokai.getBloodBattleTeam(configData, same,level,bloodBattleInfo["numberOfPoints"],function(err,res){ //返回战斗队伍
                    bloodBattleInfo["team"] = res;
                    callBack(null,null);
                });
            }else{
                bloodBattleInfo["team"] = null;
                bloodBattleInfo["status"] = 0;
                bloodBattleInfo["addInfo"] = null;
                callBack(null,null);
            }
        },
        function(callback){       //更新技能信息
            battleModel.upDataSkillInfo(updateSkillTeam,userUid,function(err,res){
                if(err){
                    callback(err);
                }else{
                    callback(null);
                }
            })
        },
        function(callback){//检测钥匙掉落
            var keyType = starData[type];
            if((teamInfo["keyIndex"] - 0) == (keyType - 0) && teamInfo["rewardKey"] != "" && battleReturnData["isWin"] == true){
                battleReturnData["dropKey"] = teamInfo["rewardKey"];
                item.updateItem(userUid,teamInfo["rewardKey"],1,function(err,res){
                    if(err || res == null){
                        callback("dbError",null);
                    }else{
                        mongoStats.dropStats(teamInfo["rewardKey"], userUid, userIP, userData, mongoStats.BLOODY, 1);
                        battleReturnData["dropKeyData"] = res;
                        callback(null,null);
                    }
                })
            }else{
                battleReturnData["dropKey"] = "";
                callback(null,null);
            }
        },
        function(callback){//更新数据库信息
            if(battleReturnData["isWin"] == true){
                callback(null,null);
            }else{
                bloodyBattle.upDataDb(userData,bloodBattleInfo,function(err,res){
                    if(err){
                        callback(err,null);
                    }else{
                        battleReturnData["bloodInfo"] = res;
                        callback(null,null);
                    }
                });
            }
        },
        function(callback){//更新缓存信息
            if(battleReturnData["isWin"] == false){
                bloodBattleInfo["numberOfPoints"] = 0;   //当前进行的闯关数量
                bloodBattleInfo["attackAddition"] = 0;    //攻击加成
                bloodBattleInfo["defenceAddition"] = 0;  //防御加成
                bloodBattleInfo["bloodAddition"] = 0;     //血加成
                bloodBattleInfo["spiritAddition"] = 0;   //灵力加成
                bloodBattleInfo["leastStar"] = 0;         //剩余星数量
                bloodBattleInfo["numberOfPoints"] = 0;    //当前进行的关卡数量,但是没有通关
                bloodBattleInfo["currentTotleStar"] = 0; //当前所有的星数量
               // bloodBattleInfo["lastEachPointStar"] = bloodBattleInfo["currentEachPointStar"]    //上一次每一大关的星级数两总量
                bloodBattleInfo["currentEachPointStar"] = null;   //每一大关的星级数两总量
                bloodBattleInfo["status"] = 0;          //当前状态  0 未进行   1  进行
                bloodBattleInfo["reward"] = null;         //奖励信息,钥匙type:key，关卡奖励type:pointsReard
                bloodBattleInfo["challengingTimes"] -= 1;  //今天剩余挑战次数
                bloodBattleInfo["team"] = {};
            }
            budokai.updateBloodBattleToRedis(userUid,bloodBattleInfo,function(err,res){
                if(err){
                    callback(err,null);
                }else{
                    if(lastEachPointStarOld!='') bloodBattleInfo["lastEachPointStar"] =JSON.parse(lastEachPointStarOld);
                    else bloodBattleInfo["lastEachPointStar"] = {};

                    battleReturnData["bloodInfoRedis"] = bloodBattleInfo;
                    callback(null,null);
                }
            })
        }
    ],function(err,res){
        if(err){
            response.echo("pve.bloodyBattle",jutil.errorInfo(err));
        }else{
            titleApi.getNewAndUpdate(userUid, "bloodBattle", function(err, res){
                if (!err && res) {
                    battleReturnData["titleInfo"] = res;
                }
                response.echo("pve.bloodyBattle",battleReturnData);
            });
        }
    });
}
exports.start = start;