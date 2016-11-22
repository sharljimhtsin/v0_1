/**
 * 神位争夺（跨服战）战斗
 * User: peter.wang
 * Date: 14-12-04
 * Time: 下午
 */

var async = require("async");
var redis = require("../alien/db/redis");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");
var user = require("../model/user");
var userVariable = require("../model/userVariable");
var item = require("../model/item");
var hero = require("../model/hero");
var battleModel = require("../model/battle");
var title = require("../model/titleModel");
var achievement = require("../model/achievement");
var gsData = require("../model/gsData");
var gsTabletsUser = require("../model/gsTabletsUser");
var leagueDragon = require("../model/leagueDragon");
var upStar = require("../model/upStar");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "tabletsUserUid","type") == false) {
        response.echo("pvp.tabletsBattle", jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];
    var tabletsUserUid = postData["tabletsUserUid"] - 0;
    var type = postData["type"];

    if((type!=0 && type!=1) || tabletsUserUid<1) {
        response.echo("pvp.tabletsBattle", jutil.errorInfo("postError"));
        return;
    }

    var configData  = configManager.createConfig(userUid);
    var skillConfig = configData.getConfig("skill");

    var issueId = 0;
    var activityConfig = {};

    var ownBattleData;
    var ownListData;
    var returnData = {};
    var battleReturnData = {};
    var ownDefaultBattleData;
    var enemyBattleData;
    var enemyDefaultData;
    var userData;
    var enemyUserData;
    var updateSkillTeam = {};
    var isMeFirst = true;
    var isRobot = (tabletsUserUid-0>1000)? false:true;

    var useBattleCard = false;//有没有用背水一战券
    async.series([
        function(cb){// 开服时间条件
            gsTabletsUser.checkUserServerStatus(userUid, function (err, res) {
                if (err) cb(err);
                else if (res == 0) cb("postError");
                else {
                    cb(null);
                }
            });
        },
        function(cb){// 是否活动中
            gsData.getCurIssueId(userUid, gsData.GS_TABLETSCOMPETE, function (err, res) {
                if (err) cb(err);
                else if (res == 0) cb("gpActivityEnd");
                else {
                    issueId = res;
                    cb(null);
                }
            });
        },
        function(cb){ // 活动配制
            gsData.getActivityConfig(userUid,gsData.GS_TABLETSCOMPETE,function(err,res){
                activityConfig = res[2];
                cb(null);
            })
        },
        function(cb) { // 是否用券
            if (type == 0) {
                useBattleCard = false;
                cb(null);
            }else {
                item.getItem(userUid, "153301", function (err, res) {
                    if (err) cb(err)
                    else if (res == null || res["number"] - 0 <= 0) {
                        useBattleCard = false;
                        cb(null);
                    }else {
                        useBattleCard = true;
                        cb(null);
                    }
                })
            }
        },
        function(cb){ // 验证挑战次数
            if(useBattleCard==true) cb(null);
            else {
                gsTabletsUser.getTabletsUser(userUid, issueId, function (err, res) {
                    if (err) cb(err);
                    else {
                        var totalChallengeTimes = (res["dailyBuyTime"] - 0) + (activityConfig["dailyBattleTime"] - 0);
                        if(type==0){
                            if(res["dailyBattleTime"]-0+1>totalChallengeTimes) cb("challengingTimesNotEnough");
                            else cb(null);
                        }else{
                            if(res["dailyBattleTime"]-0+4>totalChallengeTimes) cb("challengingTimesNotEnough");
                            else cb(null);
                        }
                    }
                })
            }
        },
        function (callBack) {
            userVariable.getVariable(userUid, "tabletsStatus", function (err, res) {
                if (res == "1") {
                    err = "busy";
                }
                callBack(err);
            });
        },
        function (callBack) {
            userVariable.setVariable(userUid, "tabletsStatus", 1, function (err, res) {
                callBack(err);
            });
        },
        function (callBack) {
            user.getUser(userUid, function (err, res) {
                if (err || res == null) {
                    callBack("noThisUser", null);
                } else {
                    userData = res;
                    callBack(null, null);
                }
            });
        },
        function (callBack) {
            user.getUser(tabletsUserUid, function (err, res) {
                if ((err || res == null) && isRobot==false) {
                    callBack("noThisUser", null);
                } else {
                    enemyUserData = res;
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
        function(callBack) {//获取敌方的气势
            if( isRobot==true ) {
                callBack(null, null);
                return;
            }
            title.getTitlesPoint(tabletsUserUid , function(point) {
                enemyUserData["momentum"] = point;
                callBack(null, null);
            });
        },
        function (callback) {//获取己方的挑战队列
            battleModel.getBattleNeedData(userUid, function (err, res) {
                if (err || res == null) {
                    callback("PVP DATA WRONG", null);
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
            upStar.getStarData(userUid, function (err, res) {
                ownListData["starData"] = res;
                callback(err);
            });
        },
        function (callback) {
            battleModel.getUserTeamDataByUserId(userUid, userData, ownListData, function (err, targetData, defaultData) {
                if (err) {
                    callback("pvpTeamDataWrong", null);
                } else {
                    ownBattleData = targetData;
                    ownDefaultBattleData = defaultData;
                    callback(null, null);
                }
            });
        },
        function (callback) {//获取敌方挑战队列
            if (isRobot==true) { //是机器人
                enemyBattleData = configData.getTabletsCompeteNpc(tabletsUserUid);
                enemyDefaultData = configData.getTabletsCompeteNpc(tabletsUserUid);
                callback(null, null);
            } else {
                battleModel.getBattleNeedData(tabletsUserUid, function (err, battleData) {
                    if (err) {
                        callback("PVP DATA WRONG", null);
                    } else {
                        //取被挑战玩家保存阵型
                        gsTabletsUser.getRedisBattleData(tabletsUserUid, issueId, battleData,function(err,battleDataNew){
                            if(err) callback(err,null);
                            else{
                                battleModel.getUserTeamDataByUserId(tabletsUserUid, enemyUserData, battleDataNew, function (err, targetData, defaultData) {
                                    if (err) {
                                        callback("PVP DATA WRONG", null);
                                    } else {
                                        enemyBattleData = targetData;
                                        enemyDefaultData = defaultData;
                                        callback(null, null);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        },
        function (callback) {//开始战斗
            var enemyTeamSkillArr;  //敌方作用于己方的技能
            var ownTeamSkillArr;   //己方作用于敌方的技能
            if (isRobot == true) {//跟机器打
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
                        enemyItem["skill"][0]["skillProp"] = 0;
                        enemyItem["skill"][0]["skillCount"] = 0;
                        enemyItem["skill"][0]["skillTime"] = 0;
                    }
                }
            } else {
                for (var key in enemyBattleData) {
                    var battleItem = enemyBattleData[key];
                    battleModel.sortOn(battleItem["skill"], "skillTime");
                }
            }
            for (var key in ownBattleData) {
                var battleItem = ownBattleData[key];
                updateSkillTeam[key] = ownBattleData[key];
                battleModel.sortOn(battleItem["skill"], "skillTime");
            }
            enemyTeamSkillArr = battleModel.returnDoOtherTeamSkill(configData, enemyDefaultData);
            ownTeamSkillArr = battleModel.returnDoOtherTeamSkill(configData, ownDefaultBattleData);
            battleModel.doSkillToAllHero(configData, ownTeamSkillArr, ownBattleData, ownDefaultBattleData);
            battleModel.doSkillToAllHero(configData, enemyTeamSkillArr, enemyBattleData, enemyDefaultData);
            battleReturnData["enemyTeam"] = battleModel.getTeamReturnData(enemyDefaultData, enemyBattleData, {"userName": "???"});
            battleReturnData["ownTeam"] = battleModel.getTeamReturnData(ownDefaultBattleData, ownBattleData, {"userName": userData});
            battleReturnData["enemyTeam"]["name"] = enemyUserData != null ? enemyUserData["userName"] : jutil.toBase64(configData.getTabletsCompeteNpcName(tabletsUserUid));
            battleReturnData["ownTeam"]["name"] = userData["userName"];
            battleReturnData["roundData"] = [];
            var enemyMomentum = enemyUserData == null ? 0 : enemyUserData["momentum"];
            battleReturnData["ownTeam"]["momentum"] = userData["momentum"];
            battleReturnData["enemyTeam"]["momentum"] = enemyMomentum;
            isMeFirst = enemyMomentum > userData["momentum"] ? false : true;
            if(type==1){//背水一战，全属性增加20%
                stats.events(userUid,"127.0.0.1",null,mongoStats.tabletsBattle);
                var greatBattleAttributeAdd = 1+(activityConfig["greatBattleAttributeAdd"]-0);
                for(var index in battleReturnData["ownTeam"]["team"]){
                    battleReturnData["ownTeam"]["team"][index]["spirit"] = Math.round(battleReturnData["ownTeam"]["team"][index]["spirit"] * greatBattleAttributeAdd);
                    battleReturnData["ownTeam"]["team"][index]["hp"] = Math.round(battleReturnData["ownTeam"]["team"][index]["hp"] * greatBattleAttributeAdd);
                }
                for(var key in ownBattleData){
                    ownBattleData[key]["attack"] = Math.round(ownBattleData[key]["attack"] * greatBattleAttributeAdd);
                    ownBattleData[key]["defence"] = Math.round(ownBattleData[key]["defence"] * greatBattleAttributeAdd);
                    ownBattleData[key]["hp"] = Math.round(ownBattleData[key]["hp"] * greatBattleAttributeAdd);
                    ownBattleData[key]["spirit"] = Math.round(ownBattleData[key]["spirit"] * greatBattleAttributeAdd);
                }
            }
            var defaultOwnTeam = jutil.copyObject(ownBattleData);
            var defaultEnemyTeam = jutil.copyObject(enemyBattleData);
            for (var i = 1; i <= 3; i++) {
                var teamAcode = battleModel.returnNewTeam(ownBattleData, defaultOwnTeam);
                ownBattleData = teamAcode[0];
                defaultOwnTeam = teamAcode[1];
                var teamBcode = battleModel.returnNewTeam(enemyBattleData, defaultEnemyTeam);
                enemyBattleData = teamBcode[0];
                defaultEnemyTeam = teamBcode[1];
                var round = battleModel.twoTeamBattle(configData, ownBattleData, enemyBattleData, isMeFirst, i, defaultOwnTeam, defaultEnemyTeam,userUid,tabletsUserUid);
                battleModel.addDeadInBackData(ownBattleData, battleReturnData["ownTeam"]["team"], i);
                battleReturnData["roundData"].push(round["roundData"]);
                if (round["complete"]) {
                    battleReturnData["isWin"] = round["win"];
                    battleComplete(userUid, issueId, type, tabletsUserUid, activityConfig, useBattleCard, round["win"], ownListData["formationList"], ownListData["heroList"], isRobot, function (err, res) {
                        if (err) {
                            callback(err, null);
                        } else {
                            battleReturnData["updateData"] = res["updateData"];
                            returnData["battle"] = battleReturnData;

                            returnData["web"] =  res["returnData"];
//                            for(var key in res){
//                                battleReturnData[key] = res[key];
//                            }
                            callback(null, null);
                        }
                    });
                    break;
                }
                isMeFirst = isMeFirst == true ? false : true;
            }
        },
        function(cb){ // 保箱领取状态
            gsTabletsUser.userGetBoxStatus(userUid, activityConfig["winTimeReward"], function(err,res){
                if(err) cb(err);
                else{
                    returnData["web"]["userGetBoxStatus"] = res;
                    cb(null);
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
        function (callback){ // 奖励
            if(battleReturnData["isWin"]==true){
                var winReward = activityConfig["winReward"];
                var randomItem = {};
                var randomRate = Math.random();
                var compareRate=0;
                for(var key in winReward){
                    compareRate += winReward[key]["prob"]-0;
                    //console.log("-----",randomRate, compareRate);
                    if(randomRate<=compareRate){
                        randomItem = winReward[key];
                        break;
                    }
                }
                returnData["battle"]["winRewardList"] = activityConfig["winReward"];
                returnData["battle"]["getReward"] = randomItem;
                stats.dropStats(randomItem["id"], userUid, '127.0.0.1', null, mongoStats.TABLETSCOMPETE_BATTLE, randomItem["count"]);
                modelUtil.addDropItemToDB(randomItem["id"], randomItem["count"], userUid, 0, 1, function (err, res) {
                    returnData["battle"]["dropReward"] = res;
                    callback(null);
                });
            }else{
                callback(null);
            }
        },
        function (callback){ // 用户伊美加币
            user.getUser(userUid, function (err, res) {
                if (err) {
                    callback(err);
                } else {
                    returnData["web"]["ingot"] = res["ingot"];
                    callback(err);
                }
            })
        }
    ],function(err,res){
        userVariable.setVariable(userUid, "tabletsStatus", 0, function (err, res) {
            // no nothing
        });
        if (err) {
            response.echo("pvp.tabletsBattle", jutil.errorInfo(err));
        } else {
            response.echo("pvp.tabletsBattle", returnData);
        }
    })
}

function battleComplete(userUid, issueId, type, tabletsUserUid, activityConfig, useBattleCard, isWin, formationList, heroList, isRobot, callbackFn) {
    var returnData = {};
    var returnBattleData = {};
    var tabletsEnemyData = {};
    var tabletsUserData = {};
    async.series([
        function (cb) { // 被挑战者Tablets数据
            if (isRobot) {// 机器人
                var configData = configManager.createConfig(userUid);
                var tabletsCompeteConfig = configData.getConfig("tabletsCompete");
                tabletsEnemyData["robot"] = 1;
                tabletsEnemyData["userUid"] = tabletsUserUid;
                tabletsEnemyData["rank"] = tabletsCompeteConfig["rank"]["RankIni"];
                cb(null);
            } else {
                gsTabletsUser.getTabletsUser(tabletsUserUid, issueId, function (err, res) {
                    if (err) cb(err);
                    else {
                        res["robot"] = 0;
                        tabletsEnemyData = res;
                        cb(null);
                    }
                });
            }
        },
        function (cb) {// 挑战者Tablets数据
            gsTabletsUser.getTabletsUser(userUid, issueId, function (err, res) {
                if (err) cb(err);
                else {
                    tabletsUserData = res;
                    UpdateData(userUid, issueId, type, activityConfig, useBattleCard, isWin, formationList, heroList, tabletsUserData, tabletsEnemyData, function (err, res) {
                        if (err) cb(err);
                        else {
                            returnData["challengeTimes"] = res["dailyBattleTime"];
                            returnData["winTimes"] = res["dailyWinTime"]
                            returnData["refreshTimes"] = res["dailyRefreshTime"];
                            returnData["usedBattleBuyTime"] = res["dailyBuyTime"];
                            returnData["totalChallengeTimes"] = (res["dailyBuyTime"] - 0) + (activityConfig["dailyBattleTime"] - 0);;
                            returnData["point"] = res["point"];
                            returnData["freeRefreshTime"] = activityConfig["freeRefreshTime"];
                            returnData["refreshCost"] = activityConfig["refreshCost"];
                            returnData["maxBattleBuyTime"] = activityConfig["maxBattleBuyTime"];
                            returnData["battleTimeCost"] = activityConfig["battleTimeCost"];
                            returnData["winTimeReward"] = activityConfig["winTimeReward"];
                            returnData["list"] = res["matchUsers"];

                            returnBattleData["updateData"] = {};
                            //returnData["updateData"]["updateUser"] = res["updateUser"];
                            returnBattleData["updateData"]["heroGetExp"] = res["heroGetExp"];
                            cb(null);
                        }
                    })
                }
            })
        }
    ], function (err, res) {
        callbackFn(err, {"returnData":returnData, "updateData":returnBattleData["updateData"]});
    })
}

function UpdateData(userUid, issueId, type, activityConfig, useBattleCard, isWin, formationList, heroList, tabletsUserData, tabletsEnemyData, callbackFn) {
    var configData = configManager.createConfig(userUid);
    var playerConfig = configData.getConfig("player");
    var tabletsCompeteConfig = configData.getConfig("tabletsCompete");

    var userLevel = 0;
    var returnData = tabletsUserData;
    var newValueData = {};
    var newEnemyValueData = {};
    var joinWinTime = 0;
    async.series([
        function(callBack) { // 连胜值
            var joinWinTimeKey = gsTabletsUser.getGSRedisKey(issueId, "gsTabletsUser:joinWinTime");
            redis.user(userUid).s(joinWinTimeKey).get(function(err,res){
                joinWinTime = res - 0;
                if(joinWinTime>0){
                    joinWinTime = (isWin==true)? (joinWinTime-0+1):0;
                }else if(joinWinTime<0){
                    joinWinTime = (isWin==true)? 0:(joinWinTime-1);
                }else{
                    joinWinTime = (isWin==true)? 1:-1;
                }
                redis.user(userUid).s(joinWinTimeKey).set(joinWinTime, function(err,res){
                    callBack(null);
                })
            })
        },
        function(callBack) { // 刷新双方rank
            if (isWin == true) {
                newValueData["rank"] = (tabletsUserData["rank"]-0) + (1-1/(1+Math.pow(10,(tabletsEnemyData["rank"]-tabletsUserData["rank"])/4000000)))*240000;
                newEnemyValueData["rank"] = (tabletsEnemyData["rank"]-0) + (0-1/(1+Math.pow(10,(tabletsUserData["rank"]-tabletsEnemyData["rank"])/4000000)))*240000;
            }else{
                newValueData["rank"] = (tabletsUserData["rank"]-0) + (0-1/(1+Math.pow(10,(tabletsEnemyData["rank"]-tabletsUserData["rank"])/4000000)))*240000;
                newEnemyValueData["rank"] = (tabletsEnemyData["rank"]-0) + (1-1/(1+Math.pow(10,(tabletsUserData["rank"]-tabletsEnemyData["rank"])/4000000)))*240000;
            }
//            console.log((1-1/(1+Math.pow(10,(tabletsEnemyData["rank"]-tabletsUserData["rank"])/4000000)))*240000,(0-1/(1+Math.pow(10,(tabletsUserData["rank"]-tabletsEnemyData["rank"])/4000000)))*240000)
//            //console.log((0-1/(1+Math.pow(10,(tabletsEnemyData["rank"]-tabletsUserData["rank"])/4000000)))*240000,(1-1/(1+Math.pow(10,(tabletsUserData["rank"]-tabletsEnemyData["rank"])/4000000)))*240000)
//            console.log(tabletsUserData["rank"],tabletsEnemyData["rank"])
//            console.log(newValueData["rank"],newEnemyValueData["rank"])

            newValueData["rank"] = Math.ceil(newValueData["rank"]);
            newEnemyValueData["rank"] = Math.ceil(newEnemyValueData["rank"]);

            if(newValueData["rank"]-0<0) newValueData["rank"] = 0;
            if(newEnemyValueData["rank"]-0<0) newEnemyValueData["rank"] = 0;

            callBack(null);
        },
        function(callBack) { // 刷新胜方积分
            if (isWin == true) {
                newValueData["pointUpdateTime"] = jutil.now();
                if (tabletsEnemyData["robot"] == 1) {
                    var userLevel = tabletsCompeteConfig["npc"][tabletsEnemyData["userUid"]-1]["heroLevel"];
                    newValueData["point"] = (tabletsUserData["point"] - 0) + Math.ceil(userLevel * activityConfig["levelToPointAdd"]);

                    callBack(null);
                }else{
                    user.getUser(tabletsEnemyData["userUid"],function(err,res){
                        if(err) callBack(err);
                        else{
                            var userLevel = res["lv"];//configData.userExpToLevel(res["exp"]);
                            newValueData["point"] = (tabletsUserData["point"] - 0) + Math.ceil(userLevel * activityConfig["levelToPointAdd"]);

                            callBack(null);
                        }
                    })
                }
            } else {
                callBack(null);
            }
        },
        function(callBack){// 刷新挑战玩家
            if (isWin == true ) {
                gsTabletsUser.getTwoMatchUsers(userUid, issueId, function (err, res) {
                    if (err) callBack(err);
                    else {
                        returnData["matchUsers"] = res;
                        redis.user(userUid).s(gsTabletsUser.getGSRedisKey(issueId, "rankMatchUsers")).setObj(res);
                        callBack(null);
                    }
                })
            }else{
                redis.user(userUid).s(gsTabletsUser.getGSRedisKey(issueId, "rankMatchUsers")).getObj(function (err, res) {
                    if (err) callBack(err);
                    else if (res != null) {
                        returnData["matchUsers"] = res;
                        callBack(null);
                    } else {
                        gsTabletsUser.addTabletsUser(userUid, issueId, function (err, res) {
                            if (err) callBack(err);
                            else {
                                gsTabletsUser.getTwoMatchUsers(userUid, issueId, function (err, res) {
                                    if (err) callBack(err);
                                    else {
                                        returnData["matchUsers"] = res;
                                        redis.user(userUid).s(gsTabletsUser.getGSRedisKey(issueId, "rankMatchUsers")).setObj(res);
                                        callBack(null);
                                    }
                                })
                            }
                        })
                    }
                })
            }
        },
        function (callBack) {
            user.getUser(userUid, function (err, res) {
                if (err) {
                    callBack(err);
                } else {
                    userLevel = res["lv"];//configData.userExpToLevel(res["exp"]);
                    newValueData["lv"] = res["lv"];
                    callBack(err);
                }
            })
        },
        function (callBack) {//更新弟子经验
            returnData["heroGetExp"] = [];
            callBack();
            /*
            var arr = [];
            if (isWin) {
                var returnHero = {};
                var addExp = playerConfig["" + userLevel]["getHeroExp"];
                for (var key in formationList) {
                    var formationItem = formationList[key];
                    var heroUid = formationItem["heroUid"];
                    var heroItem = heroList[heroUid];
                    var maxExp = configData.heroMaxExp(heroItem["heroId"], userLevel);
                    heroItem["exp"] = (heroItem["exp"] - 0) + addExp;
                    heroItem["level"] = configData.heroExpToLevel(heroItem["heroId"], heroItem["exp"]) - 0;
                    if (heroItem["exp"] > maxExp) {
                        heroItem["exp"] = maxExp;
                        heroItem["level"] = configData.heroExpToLevel(heroItem["heroId"], maxExp);
                    }
                    returnHero[key] = {};
                    returnHero[key]["heroUid"] = heroUid;
                    returnHero[key]["exp"] = heroItem["exp"];
                    arr.push(heroItem);
                }
                returnData["heroGetExp"] = returnHero;
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
                    callBack(null);
                });
            } else {
                callBack(null);
            }*/
        },
        function (callBack) {//更新背水一战券
            if(useBattleCard==true){
                stats.expendStats("153301", userUid, "127.0.0.1", null, mongoStats.E_TABLETS_BATTLE, -1);
                item.updateItem(userUid,"153301",-1,function(err,res){
                    callBack(err,null);
                })
            }else{
                callBack(null);
            }
        },
        function (callBack) {// 更新挑战者数据（rank，积分，胜利数，挑战次数）
            if (isWin==true) {
                newValueData["dailyWinTime"] = tabletsUserData["dailyWinTime"] - 0 + 1;
            }
            if (useBattleCard == false) {
                if (type == 0) {
                    newValueData["dailyBattleTime"] = tabletsUserData["dailyBattleTime"] - 0 + 1;
                } else {
                    newValueData["dailyBattleTime"] = tabletsUserData["dailyBattleTime"] - 0 + 4;
                }
            }
            newValueData["dailyTimeLastUpdateTime"] = jutil.now();

            for(var key in newValueData){
                returnData[key] = newValueData[key];
            }
            gsTabletsUser.updateTabletsUser(userUid, issueId, newValueData, function (err, res) {
                callBack(err,res)
            })
        },
        function (callBack) {// 更新被挑战者数据（rank）
            if (tabletsEnemyData["robot"] == 1) callBack(null);//机器人
            else {
                gsTabletsUser.updateTabletsUser(tabletsEnemyData["userUid"], issueId, newEnemyValueData, function (err, res) {
                    callBack(err, res)
                })
            }
        },
        function(callBack){ // 刷新防守阵容
            gsTabletsUser.updateRedisTabletsUserBattleData(userUid, issueId, function(err,res){
                callBack(err,res);
            })
        }
    ], function (err) {
        if(err){
            callbackFn(err,null);
        }else{
            callbackFn(null,  returnData);
        }
    });
}


exports.start = start;