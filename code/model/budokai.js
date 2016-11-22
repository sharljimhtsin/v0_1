/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 13-11-18
 * Time: 下午6:35
 * To change this template use File | Settings | File Templates.
 */
var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var configManager = require("../config/configManager");
var bloodyLeaderboard = require("../model/bloodyLeaderboard");
var jutil = require("../utils/jutil");
//var configData = require("../model/configData");
/**
 *获取血战基本信息
 * @param userUid
 */
function getBloodyBattleInfo(userUid,callback){
    var configData = configManager.createConfig(userUid);
    var sql = "SELECT * FROM budokai WHERE userUid=" + mysql.escape(userUid);
    mysql.game(userUid).query(sql,function(err,res) {
        if (err) callback(err,null);
        else {
            if (res == null || res.length == 0){
                var newValueData = {};
                newValueData["todayMostStar"] = 0;
                newValueData["lastTimeMostStar"] = 0;
                newValueData["bigestJumpPoints"] = 0;
                newValueData["todayMostPoints"] = 0;
                newValueData["challengingTimes"] = 0;
                newValueData["lastFightTime"] = 0;
                newValueData["todayLastFightTime"] = 0;
                upDateBattleInfo(userUid,newValueData,function(err,res){
                    if(err || res == null){
                        callback("bloodBattleWrong");
                    }else{
                        callback(null,newValueData);
                    }
                })
            }
            else {
                callback(null,res[0]);
            }
        }
    });
}
/**
 * 更新血战数据
 * @param userUid
 * @param callback
 */
function upDateBattleInfo(userUid,newValueData,callbackFn){
    var configData = configManager.createConfig(userUid);
    var whereSql = "userUid=" + mysql.escape(userUid);
    mysql.dataIsExist(userUid,"budokai",whereSql,function(err, res) {
        if (res == 0) {
            var insertSql = "INSERT INTO budokai SET ?";
            newValueData["userUid"] = userUid;
            mysql.game(userUid).query(insertSql,newValueData,function(err,res){
//                redis.game(userUid).del("userUid:" + userUid);
                callbackFn(err,res);
            });
        } else {
            var updateSql = "UPDATE budokai SET ? WHERE " + whereSql;
            mysql.game(userUid).query(updateSql,newValueData,function(err, res) {
//                redis.game(userUid).del("userUid:" + userUid);
                callbackFn(err,res);
            });
        }
    });
}
function judgeUserInTop(userUid,type,cb){//判断玩家昨天是否入榜了
    var inTop = false;
    bloodyLeaderboard.getTopTwenty(userUid,type,jutil.day()-1,function(err,res){
        if(err){
            cb(err,null);
        }else{
            for(var i = 0 ; i < res.length ; i++){
                if(res[i]["userId"] == userUid){
                    inTop = true;
                }
            }
            cb(null,inTop);
        }
    });
}
/**
 * 随机加成
 * @param userUid
 */
function randomBattleAdd(){
    var addType = ["attackAddition","defenceAddition","bloodAddition","spiritAddition"];
    var returnData = [];
    var lowerKey = addType.splice(Math.floor(Math.random() * addType.length),1);
    var middleKey = addType.splice(Math.floor(Math.random() * addType.length),1);
    var highKey = addType.splice(Math.floor(Math.random() * addType.length),1);
    returnData.push({"type":lowerKey[0],"num": 0.03,"needStar":3},{"type":middleKey[0],"num": 0.15,"needStar":15},{"type":highKey[0],"num": 0.3,"needStar":30});
    return returnData;
}
/**
 * 获取血战的队伍
 * @param userLevel 玩家等级
 * @param points    关卡数  小关卡
 * @param isSame   是否敌我两方人数相同
 */
function getBloodBattleTeam(configData, isSame,userLevel,points,callBack){
    var returnData = {};
    var bloodBattleConfig = configData.getConfig("bloodBattle");
    var roundRewardKeyPro = bloodBattleConfig["roundRewardKeyProb"];
    var bloodBattleFormationSize = bloodBattleConfig["bloodBattleFormationSize"];
    var enemyGroup = bloodBattleConfig["enemyGroup"];   //敌方队列
    var bloodItem = null;
    for(var key in bloodBattleFormationSize){
        if(bloodBattleFormationSize[key].hasOwnProperty("maxPlayerLevel"))
        {
            if((bloodBattleFormationSize[key]["minPlayerLevel"] <= userLevel && bloodBattleFormationSize[key]["maxPlayerLevel"] >= userLevel))
            {
                bloodItem = bloodBattleFormationSize[key]; //根据等级获取该等级对应的血战配置 5  6  7 8 人制
                break;
            }
        }else if(userLevel >= (bloodBattleFormationSize[key]["minPlayerLevel"])){
            bloodItem = bloodBattleFormationSize[key]; //根据等级获取该等级对应的血战配置 5  6  7 8 人制
            break;
        }
    }
    var proKey = "";
    var teamKeyIndex;
    for(var key in roundRewardKeyPro){
        var random1 = Math.random();
        if(random1 <= roundRewardKeyPro[key]){
            proKey = key;
            break;
        }
    }
    if(proKey != ""){
        var random = Math.random();
        teamKeyIndex = Math.floor(random * 3) + 1;
    }
    if(bloodItem == null){
        callBack("levelIsNotEnough",null);
        return;
    }
    var bloodBattleRound = bloodItem["bloodBattleRound"];     //获取该配置下该轮对应的配置
    var formationSize = bloodItem["formationSize"];
    var bloodBattleRoundItem = bloodBattleRound["" + points];   //获取该关卡下对应的数据
    var randomGroup = bloodBattleRoundItem["randomGroup"];    //随机队列
    var easyGroupKey = "" + randomGroup["easy"];
    var normalKey = "" + randomGroup["normal"];
    var hardKey = "" + randomGroup["hard"];
    var easyGroupIndex = Math.floor(enemyGroup[easyGroupKey].length * Math.random());
    var normalGroupIndex = Math.floor(enemyGroup[normalKey].length * Math.random());
    var hardGroupIndex = Math.floor(enemyGroup[hardKey].length * Math.random());
    var enemyLevel = bloodBattleRoundItem["enemyLevel"];   //队伍等级
    var easyHeroId = enemyGroup[easyGroupKey][easyGroupIndex]["formation"][0];
    var normalHeroId = enemyGroup[normalKey][normalGroupIndex]["formation"][0];
    var hardHeroId = enemyGroup[hardKey][hardGroupIndex]["formation"][0];
    var indexEasy;
    var indexNormal;
    var indexHard;
    if(isSame){
        indexEasy = Math.floor(Math.random() * formationSize) + 1 ;
        indexNormal = Math.floor(Math.random() * formationSize) + 1;
        indexHard = Math.floor(Math.random() * formationSize) + 1;
    }else{
        indexEasy = Math.floor(Math.random() * formationSize) + 1;
        indexNormal = Math.floor(Math.random() * formationSize) + 1;
        indexHard = Math.floor(Math.random() * formationSize) + 1;
        if(indexEasy == formationSize){
            indexEasy = formationSize - 1;
        }
        if(indexHard == 1){
            indexHard = 2;
        }
    }
    returnData["teamInfo"] = {"easy":{"groupKey":easyGroupKey ,"heroId":easyHeroId,"indexGroup":easyGroupIndex,"index":indexEasy,"enemyLevel":enemyLevel},
                                "normal":{"groupKey":normalKey ,"heroId":normalHeroId,"indexGroup":normalGroupIndex,"index":indexNormal,"enemyLevel":enemyLevel},
                                "hard":{"groupKey":hardKey ,"heroId":hardHeroId,"indexGroup":hardGroupIndex,"index":indexHard,"enemyLevel":enemyLevel},
                                "same":isSame,"rewardKey":proKey,"keyIndex":teamKeyIndex};
    callBack(null,returnData);
}
function getOneTeam(configData, teamData,indexGroup,length,level){
    //var randomGroupIndex = Math.floor(Math.random() *teamData.length);
    indexGroup = indexGroup == null ? 0 :indexGroup;
    var teamDataL = teamData.length;
    var groupItem = teamData[indexGroup];
    if(groupItem == null || groupItem == undefined) {
        groupItem = teamData[teamDataL - 1];
    }
    var returnData = {};
    var defaultTeam = {};
    var addTeam = {};
    var formationData = groupItem["formation"];
    var hpRatio = groupItem["hpRatio"];
    var attackRatio = groupItem["attackRatio"];
    var defenceRatio = groupItem["defenceRatio"];
    var spiritRatio = groupItem["spiritRatio"];
    for(var i = 0 ; i < length ; i++){
        var heroId = formationData[i];
        var hero = configData.getHeroObjByIdLevel(heroId,level,0);
        hero["attack"] = hero["attack"] * attackRatio;
        hero["defence"] = hero["defence"] * defenceRatio;
        hero["hp"] = hero["hp"] * hpRatio;
        hero["spirit"] = hero["spirit"] * spiritRatio;
        var key = "" + (i + 1);
        defaultTeam[key] = configData.getHeroObjByIdLevel(heroId,level,0);
        addTeam[key] = hero;
    }
    returnData["default"] = defaultTeam;
    returnData["add"] = addTeam;
    return returnData;
}
/**
 *获取缓存中战斗数据
 * @param userUid
 * @param callBack
 */
function getRedisBattleInfo(userUid,callBack){
//    redis.game(userUid).getObj("bloodBattle:" + userUid,function(err,res){
    redis.user(userUid).s("bloodBattle").getObj(function(err,res){
        if(err){
            callBack(err,null);
        }else if(res == null){
            var returnObj = getDefaultBattleRedis();
            callBack(null,returnObj);
        }else{
            callBack(null,res);
        }
    });
}
function getDefaultBattleRedis(){
    var returnObj = {};
    returnObj["attackAddition"] = 0;    //攻击加成
    returnObj["defenceAddition"] = 0;  //防御加成
    returnObj["bloodAddition"] = 0;     //血加成
    returnObj["spiritAddition"] = 0;   //灵力加成
    returnObj["leastStar"] = 0;         //剩余星数量
    returnObj["numberOfPoints"] = 1;    //当前进行的关卡数量,但是没有通关
    returnObj["currentTotleStar"] = 0; //当前所有的星数量
    returnObj["currentEachPointStar"] = null;   //每一大关的星级数两总量
    returnObj["lastEachPointStar"] = null    //上一次每一大关的星级数两总量
    returnObj["status"] = 0;//当前状态  0 未进行   1  进行
    returnObj["reward"] = null;         //奖励信息
    returnObj["todayLastTime"] = 0;     //今天最后一次挑战时间
    returnObj["challengingTimes"] = 3;  //今天剩余挑战次数
    returnObj["addInfo"] = null;        //加成信息
    returnObj["bigestJumpPoints"] = 0;
    returnObj["team"] = {};
    returnObj["freeAdd"] = 0.15;
    returnObj["topForecasts"] = 0;
    return returnObj;
}
function getTeamType(configData, level){
    var topKey = "";
    var bloodBattleConfig = configData.getConfig("bloodBattle");
    var bloodBattleFormationSize = bloodBattleConfig["bloodBattleFormationSize"];
    for(var key in bloodBattleFormationSize){
        if(bloodBattleFormationSize[key].hasOwnProperty("maxPlayerLevel"))
        {
            if((bloodBattleFormationSize[key]["minPlayerLevel"] <= level && bloodBattleFormationSize[key]["maxPlayerLevel"] >= level))
            {
                topKey = "top" + key; //根据等级获取该等级对应的血战配置 5  6  7 8 人制
                break;
            }
        }else if(level >= (bloodBattleFormationSize[key]["minPlayerLevel"])){
            topKey = "top" + key; //根据等级获取该等级对应的血战配置 5  6  7 8 人制
            break;
        }
    }
    return topKey;
}
/**
 * 更新数据添加到缓存当中
 * @param userUid
 * @param data
 * @param callBack
 */
function updateBloodBattleToRedis(userUid,data,callBack){
//    var key = "bloodBattle:" + userUid;
//    redis.game(userUid).setObj(key,data,function(err,res){
    redis.user(userUid).s("bloodBattle").setObj(data,function(err,res){
        if(err){
            callBack(err,null);
        }else{
            callBack(null,res);
        }
    });
}
/**
 *
 * @param lastStar   上一次这一大关卡的星级数量
 * @param thisStar   这一次这一大关卡的星级数量
 * @param point      关卡数量
 */
function getStarRewardByPoints(configData, level,lastStar,thisStar,point){
    if(thisStar <= lastStar){ //当前成绩比上次差
        return null;
    }
    var returnData = [];
    var bloodBattleConfig = configData.getConfig("bloodBattle");
    var bloodBattleFormationSize = bloodBattleConfig["bloodBattleFormationSize"];
    var enemyGroup = bloodBattleConfig["enemyGroup"];   //敌方队列
    var bloodItem = null;
    for(var key in bloodBattleFormationSize){
        if(bloodBattleFormationSize[key].hasOwnProperty("maxPlayerLevel"))
        {
            if((bloodBattleFormationSize[key]["minPlayerLevel"] <= level && bloodBattleFormationSize[key]["maxPlayerLevel"] >= level))
            {
                bloodItem = bloodBattleFormationSize[key]; //根据等级获取该等级对应的血战配置 5  6  7 8 人制
                break;
            }
        }else if(level >= (bloodBattleFormationSize[key]["minPlayerLevel"])){
            bloodItem = bloodBattleFormationSize[key]; //根据等级获取该等级对应的血战配置 5  6  7 8 人制
            break;
        }
    }
    if(bloodItem == null){
        return null;
    }
    var roundItem = bloodItem["normalReward"]["" + point];
    var rewardPerStar = roundItem["rewardPerStar"];
    var rewardReachStar = roundItem["rewardReachStar"];
    var ingot = 0;
    var obj = {};
    var gold = (thisStar - lastStar) * rewardPerStar;
    for(var key in rewardReachStar){
        var item = rewardReachStar[key];
        if(item["reachStar"] > lastStar && item["reachStar"] <= thisStar){ //比上次好
            var key = item["reward"];
            if(key == "zeini"){ //银币
                gold += item["rewardCount"];
            }else if(key == "imegga"){
                ingot += item["rewardCount"];
            }else{
                if(obj.hasOwnProperty(key)){
                    obj[key] += item["rewardCount"];
                }else{
                    obj[key] = item["rewardCount"];
                }

            }
        }
    }
    returnData.push({"type" : "gold","count":gold});
    if(ingot > 0){
        returnData.push({"type" : "ingot","count":ingot});
    }
    for(var key in obj){
        returnData.push({"type" : key,"count":obj[key]});
    }
    return returnData;
}
exports.upDateBattleInfo = upDateBattleInfo;
exports.getBloodyBattleInfo = getBloodyBattleInfo;
exports.getBloodBattleTeam = getBloodBattleTeam;   //获取血战队伍
exports.getRedisBattleInfo = getRedisBattleInfo;     //获取缓存中的血战信息
exports.getDefaultBattleRedis = getDefaultBattleRedis;
exports.getOneTeam = getOneTeam;
exports.updateBloodBattleToRedis = updateBloodBattleToRedis;
exports.getStarRewardByPoints = getStarRewardByPoints;
exports.randomBattleAdd = randomBattleAdd;
exports.getTeamType = getTeamType;
exports.judgeUserInTop = judgeUserInTop;