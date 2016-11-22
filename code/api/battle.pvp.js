/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 13-11-11
 * Time: 下午6:29
 * battle.PVP
 */
var jutil = require("../utils/jutil");
var async = require("async");
var hero = require("../model/hero");
var userVariable = require("../model/userVariable");
var configManager = require("../config/configManager");
var user = require("../model/user");
var pvptop = require("../model/pvptop");
var battleModel = require("../model/battle");
var mail = require("../model/mail");
var title = require("../model/titleModel");
var titleApi = require("../api/title.get");
var achievement = require("../model/achievement");
var leagueDragon = require("../model/leagueDragon");
var upStar = require("../model/upStar");
var language;

function start(postData, response, query) {
    if (jutil.postCheck(postData, "enemyTop") == false) {
        response.echo("battle.pvp", jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var configData = configManager.createConfig(userUid);

    var enemyTop = postData["enemyTop"];
    var skillConfig = configData.getConfig("skill");
    var enemyUserUid;
    var ownBattleData;
    var ownListData;
    var battleReturnData = {};
    var isMeFirst = true;
    var ownDefaultBattleData;
    var enemyBattleData;
    var enemyDefaultData;
    var userData;
    var enemyUserData;
    var pvpData;
    var updateSkillTeam = {};
    var isRobot = false;
    var configData = configManager.createConfig(userUid);
    async.series([
        function (callback) {  //判断是否可以挑战
            judgeCanPlayPvp(userUid, enemyTop, function (err, res) {
                if (err) {
                    callback(err, null);
                } else {
                    userData = res["userData"];
                    pvpData = res["pvpData"];
                    enemyUserUid = pvpData["enemyUserId"];
                    callback(null, null);
                }
            });
        },
        function (callBack) {
            user.getUser(enemyUserUid, function (err, res) {
                if ((err || res == null) && pvpData["robot"] == 0) {
                    callBack("noThisUser", null);
                } else {
                    enemyUserData = res;
                    callBack(null, null);
                }
            });
        },
        function (callBack) {
            userVariable.getLanguage((pvpData["robot"] == 1 ? userUid : enemyUserUid), function (err, res) {
                language = res;
                callBack(err);
            });
        },
        function(callBack) {//获取我方的气势
            title.getTitlesPoint(userUid , function(point) {
                userData["momentum"] = point;
                callBack(null, null);
            });
        },
        function(callBack) {//获取敌方的气势
            if( pvpData["robot"] == 1 ) {
                callBack(null, null);
                return;
            }
            title.getTitlesPoint(enemyUserUid , function(point) {
                enemyUserData["momentum"] = point;
                callBack(null, null);
            });
        },
        function (callback) {//可以挑战开始挑战,获取己方的挑战队列
            async.series([function (cb) {
                battleModel.getBattleNeedData(userUid, function (err, res) {
                    if (err || res == null) {
                        cb("PVP DATA WRONG", null);
                    } else {
                        ownListData = res;
                        cb();
                    }
                });
            }, function (cb) {
                leagueDragon.getDragon(userUid, userData["leagueUid"], function (err, res) {
                    if (err) {
                        cb(err);
                    } else {
                        ownListData["dragonData"] = res;
                        cb();
                    }
                });
            }, function (cb) {
                upStar.getStarData(userUid, function (err, res) {
                    ownListData["starData"] = res;
                    cb(err);
                });
            }, function (cb) {
                battleModel.getUserTeamDataByUserId(userUid, userData, ownListData, function (err, targetData, defaultData) {
                    if (err) {
                        cb("pvpTeamDataWrong", null);
                    } else {
                        ownBattleData = targetData;
                        ownDefaultBattleData = defaultData;
                        cb(null, null);
                    }
                });
            }], function (err, res) {
                callback(err);
            });
        },
        function (callback) {//获取敌方挑战队列
            if (pvpData["robot"] == 1) { //是机器人
                enemyBattleData = configData.getPvpNpc(enemyUserUid);
                enemyDefaultData = configData.getPvpNpc(enemyUserUid);
                isRobot = true;
                callback(null, null);
            } else {
                var enemyListData;
                async.series([function (cb) {
                    battleModel.getBattleNeedData(enemyUserUid, function (err, res) {
                        if (err) {
                            cb("PVP DATA WRONG", null);
                        } else {
                            enemyListData = res;
                            cb();
                        }
                    });
                }, function (cb) {
                    leagueDragon.getDragon(userUid, userData["leagueUid"], function (err, res) {
                        if (err) {
                            cb(err);
                        } else {
                            enemyListData["dragonData"] = res;
                            cb();
                        }
                    });
                }, function (cb) {
                    upStar.getStarData(enemyUserUid, function (err, res) {
                        enemyListData["starData"] = res;
                        cb(err);
                    });
                }, function (cb) {
                    battleModel.getUserTeamDataByUserId(enemyUserUid, enemyUserData, enemyListData, function (err, targetData, defaultData) {
                        if (err) {
                            cb("pvpTeamDataWrong", null);
                        } else {
                            enemyBattleData = targetData;
                            enemyDefaultData = defaultData;
                            cb(null, null);
                        }
                    });
                }], function (err, res) {
                    callback(err);
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
            battleReturnData["enemyTeam"]["name"] = enemyUserData != null ? enemyUserData["userName"] : jutil.toBase64(configData.getPvpNpcName(enemyUserUid));
            battleReturnData["ownTeam"]["name"] = userData["userName"];
            battleReturnData["roundData"] = [];
            var enemyMomentum = enemyUserData == null ? 0 : enemyUserData["momentum"];
            battleReturnData["ownTeam"]["momentum"] = userData["momentum"];
            battleReturnData["enemyTeam"]["momentum"] = enemyMomentum;
            isMeFirst = enemyMomentum > userData["momentum"] ? false : true;
            var defaultOwnTeam = jutil.copyObject(ownBattleData);
            var defaultEnemyTeam = jutil.copyObject(enemyBattleData);
            for (var i = 1; i <= 3; i++) {
                var teamAcode = battleModel.returnNewTeam(ownBattleData, defaultOwnTeam);
                ownBattleData = teamAcode[0];
                defaultOwnTeam = teamAcode[1];
                var teamBcode = battleModel.returnNewTeam(enemyBattleData, defaultEnemyTeam);
                enemyBattleData = teamBcode[0];
                defaultEnemyTeam = teamBcode[1];
                var round = battleModel.twoTeamBattle(configData, ownBattleData, enemyBattleData, isMeFirst, i, defaultOwnTeam, defaultEnemyTeam);
                battleModel.addDeadInBackData(ownBattleData, battleReturnData["ownTeam"]["team"], i);
                battleReturnData["roundData"].push(round["roundData"]);
                if (round["complete"]) {
                    battleReturnData["isWin"] = round["win"];
                    UpDateDatabase(pvpData, userData, ownListData["formationList"], ownListData["heroList"], round["win"], function (err, res) {
                        if (err) {
                            callback(err, null);
                        } else {
                            battleReturnData["updateData"] = res;
                            callback(null, null);
                        }
                    });
                    break;
                }
                isMeFirst = isMeFirst == true ? false : true;
            }
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
        function (callback) {
            pvptop.unLock(userUid,pvpData["enemyTop"]);
            pvptop.unLock(userUid,pvpData["ownPvpTop"]);
            callback(null);
        }
    ], function (err, res) {
        if (err) {
            response.echo("battle.pvp", jutil.errorInfo(err));
        } else {


            if (battleReturnData["isWin"]) {
                achievement.pvpRankWinTime(userUid, 1, function(){}); // 成就数据统计
            }

            titleApi.getNewAndUpdate(userUid, "arena", function(err, res){
                if (!err && res) {
                    battleReturnData["titleInfo"] = res;
                }

                response.echo("battle.pvp", battleReturnData);
            });
        }
    });
}
function UpDateDatabase(pvpData, userData, formationList, heroList, isWin, cb) {//更新数据库信息
    var configData = configManager.createConfig(userData["userUid"]);
    var playerConfig = configData.getConfig("player");
    var mailConfig;
    var mailConfigLocal = configData.getConfig("mail" + "_" + language);
    var mailConfigDefault = configData.getConfig("mail");
    if (mailConfigLocal) {
        mailConfig = mailConfigLocal;
    } else {
        mailConfig = mailConfigDefault;
    }
    //var userLevel = configData.userExpToLevel(userData["exp"]);
    var updateUser = {};
    var returnData = {};
    var highest = 0;
    var returnHero = {};
    var addMax = 0;
    async.series([
        function (callBack) {//发送邮件
            if (isWin == false) {
                callBack(null);
                return;
            }
            if (pvpData["robot"] == 1) {
                callBack(null);
            } else {
                var ownTop = pvpData["ownPvpTop"];
                var ownName = jutil.fromBase64(userData["userName"]);
                var enemyUserUid = pvpData["enemyUserId"];
                var message = jutil.formatString(mailConfig["pvpRankDown"], [ownName, ownTop]);
                mail.addMail(enemyUserUid, -1, message, "", "0", function (err, res) {
                    callBack(err);
                });
            }
        },
        function (callBack) {//获取最高排行
            pvptop.getHighest(userData["userUid"], function (err, res) {
                if (err) {
                    callBack(err);
                } else {
                    if (res == null) {
                        highest = 0;
                    } else {
                        highest = (res - 0);
                    }
                    callBack(null);
                }
            });
        },
        function(callBack) { //刷新我方积分
            if (isWin == false) {
                callBack(null);
                return;
            }
            pvptop.refreshCurrentPoint(userData["userUid"] , pvpData["ownPvpTop"] , function(err ,res) {
                callBack(err);
            })
        },
        function(callBack) { //刷新敌方积分
            if (isWin == false || pvpData["robot"] == 1) {
                callBack(null);
                return;
            }
            pvptop.refreshCurrentPoint(pvpData["enemyUserId"] , pvpData["ownPvpTop"] , function(err ,res) {
                callBack(err);
            })
        },
        function (callBack) {//更新玩家排名
            if (isWin == true) {//胜利更新列表
                pvptop.changeRank(userData["userUid"], pvpData["ownPvpTop"], pvpData["enemyTop"], function (err, res) {
                    if (err || res != 1) {
                        callBack(err);
                    } else {
                        callBack(null);
                    }
                })
            } else {
                callBack(null);
            }
        },
        function (callBack) {//加积分
            if (isWin) {
                pvptop.getCurrentPoint(userData["userUid"], function (err, res) {
                    if (err) {
                        callBack(err);
                    } else {
                        var points = res["value"] - 0;
                        var enemyTop = pvpData["enemyTop"] - 0;
                        var pvpRankConfig = configData.getConfig("pvpRank");
                        var rankRewardPoint = pvpRankConfig["rankRewardPoint"];
                        var rankItem;
                        for (var key in rankRewardPoint) {
                            var item = rankRewardPoint[key];
                            var highestRank = item["highestRank"] - 0;
                            var lowestRank = item["lowestRank"] - 0;
                            if (enemyTop >= highestRank && enemyTop <= lowestRank) {
                                rankItem = item;
                                break;
                            }
                        }
                        var newPoints = (rankItem["reward"] - 0) + points;
                        userVariable.setVariableTime(userData["userUid"], "redeemPoint", newPoints, res["time"], function (err, res) {
                            callBack(null);
                        });
                    }
                });
            } else {
                callBack(null);
            }
        },
        function (callBack) { //更新最高排行
            if (isWin == false) {
                callBack(null);
                return;
            }
            if (highest == 0 || highest > pvpData["enemyTop"]) {
                userVariable.setVariable(userData["userUid"], "pvpHighest", pvpData["enemyTop"], function (err, res) {
                    if (err) {
                        callBack(err);
                    } else {
                        highest = res;
                        returnData["pvpHighest"] = highest;
                        callBack(null);
                    }
                });
            } else {
                callBack(null);
            }

        },
        function (callBack) {//更新精力，金币,声望
            if(userData["monthCard"] == "fifty"){
                addMax = 18;
            }else{
                addMax = 0;
            }
            var newPower = configData.getPvpPower(userData["pvpPower"] - 0, userData["lastRecoverPvpPower"] - 0, jutil.now(), addMax);
            updateUser["pvpPower"] = (newPower[0] - 0) - 1;
            updateUser["lastRecoverPvpPower"] = newPower[1];
            var getExp = playerConfig[userData["lv"]]["getPlayerExp"] - 0;
            if (isWin) {
                updateUser["exp"] = (userData["exp"] - 0)  + getExp;
                updateUser["gold"] = userData["gold"] - 0;
            } else {
                var mongoStats = require("../model/mongoStats");
                mongoStats.expendStats("gold", userData["userUid"], '127.0.0.1', userData, mongoStats.E_CLEAR_CONTINUE,1000);
                updateUser["exp"] = (userData["exp"] - 0)  + getExp;
                updateUser["gold"] = userData["gold"] - 0;
            }
            user.updateUser(userData["userUid"], updateUser, function (err, res) {
                if (err) {
                    callBack(err);
                } else {
                    returnData["updateUser"] = updateUser;
                    callBack(null);
                }
            });
        },
        function (callBack) {//更新弟子经验
            returnData["heroGetExp"] = [];
            var arr = [];
            if (isWin) {
                var addExp = playerConfig[userData["lv"]]["getHeroExp"];
                for (var key in formationList) {
                    var formationItem = formationList[key];
                    var heroUid = formationItem["heroUid"];
                    var heroItem = heroList[heroUid];
                    var maxExp = configData.heroMaxExp(heroItem["heroId"], userData["lv"]);
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
                    hero.updateHero(userData["userUid"], item["heroUid"], item, function (err, res) {
                        if (err) {
                            esCb(err);
                        } else {
                            esCb(null);
                        }
                    });
                }, function(err){
                    callBack(null);
                });

//                async.forEach(arr, function (item, callBackArr) {
//                    hero.updateHero(userData["userUid"], item["heroUid"], item, function (err, res) {
//                        if (err) {
//                            callBackArr(err);
//                        } else {
//                            callBackArr(null);
//                        }
//                    });
//                }, function (err) {
//                    callBack(null);
//                });
            } else {
                callBack(null);
            }
        },
        function (callBack) {//更新挑战次数
            pvpData["pvpTimes"] -= 1;
            pvpData["pvpLastUseTime"] = jutil.now();
            userVariable.setVariableTime(userData["userUid"], "pvpChangeTime", pvpData["pvpTimes"], pvpData["pvpLastUseTime"], function (err, res) {
                if (err || res == null) {
                    callBack("PVP Data error");
                } else {
                    returnData["pvpChangeTimes"] = pvpData["pvpTimes"];
                    callBack(null);
                }
            })
        }
    ], function (err) {
        if(err){
            cb(err,null);
        }else{
            cb(null, returnData);
        }
    });
}
/**
 * 判断是否可以进行PVE
 * @param userUid    己方
 * @param enemyUid   被挑战方
 * @param callBack
 */
function judgeCanPlayPvp(userUid, enemyTop, callBack) {
    var configData = configManager.createConfig(userUid);
    var pvpData = {};
    var userData = {};
    var returnData = {};
    var ownPvpTop;
    var enemyPvpTop;
    var isInCanChangList = false;
    var vipConfig = configData.getConfig("vip");
    var mainConfig = configData.getConfig("main");
    var pvpRankConfig = configData.getConfig("pvpRank");
    async.series([
        function (callback) {//获取用户基本信息
            user.getUser(userUid, function (err, res) {
                if (err || res == null) {
                    callback("noThisUser");
                } else {
                    userData = res;
                    callback(null);
                }
            });
        },
        function (callback) {//获取用户挑战信息
            pvptop.getUserTop(userUid, function (err, res) {
                if (err || res == null) {
                    callback("PVP ERROR");
                } else if(res["lockTime"] - jutil.now() > 0){
                    callback("isBattling");
                } else {
                    ownPvpTop = res["top"] - 0;
                    pvpData["ownPvpTop"] = res["top"] - 0;
                    callback(null);
                }
            })
        },
        function (callback) {//获取最后一次使用PVP次数时间
            userVariable.getVariableTime(userUid, "pvpChangeTime", function (err, res) {
                if (err) {
                    callback(err);
                } else {
                    if (res == null) {
                        var userVipLevel = "" + userData["vip"];
                        pvpData["pvpLastUseTime"] = 0;
                        pvpData["pvpTimes"] = vipConfig[userVipLevel]["pvpTimes"];
                        callback(null);
                    } else {
                        pvpData["pvpTimes"] = res["value"] - 0;
                        pvpData["pvpLastUseTime"] = res["time"];
                        callback(null);
                    }
                }
            })
        },
        function (callback) {//判断挑战次数是否足够
            var lastUserTime = pvpData["pvpLastUseTime"] - 0;  //最后使用体力的时间
            var totleTimes = pvpData["pvpTimes"] - 0;
            var userVipLevel = "" + userData["vip"];
            var pureTimes = 0;
            if (jutil.compTimeDay(lastUserTime, jutil.now()) == true) { //今天使用的
                pureTimes = totleTimes;
            } else {
                if (totleTimes >= vipConfig[userVipLevel]["pvpTimes"]) {
                    pureTimes = totleTimes;
                } else {
                    pureTimes = vipConfig[userVipLevel]["pvpTimes"];
                }
            }
            if (pureTimes < 1) {
                callback("pvpTimesNotEnough"); //PVP挑战次数不足
                return;
            } else {
                pvpData["pvpTimes"] = pureTimes;
                pvpData["pvpLastUseTime"] = jutil.now();
                callback(null);
            }
        },
        function (callback) {//判断精力是否充足
            var lastRestorationTime = userData["lastRecoverPvpPower"] - 0;
            var severPvpPower = userData["pvpPower"] - 0;
            var addMax = userData["monthCard"] == "fifty" ? 18 : 0;
            var newPower = configData.getPvpPower(severPvpPower, lastRestorationTime, jutil.now(), addMax);
            var lastPvpPower = newPower[0];
            if (lastPvpPower < 1) {
                callback("pvpPowerNotEnough");
            } else {
                callback(null);
            }
        },
        function (callback) {//判断是否出可挑战队列中
            pvptop.getTopUser(userUid, enemyTop, function (err, res) {
                if (err || res == null) {
                    isInCanChangList = false;
                    callback(null);
                    return;
                } else if(res["lockTime"] - jutil.now() > 0){
                    callback("isBattling");
                    return;
                } else {
                    enemyPvpTop = res["top"] - 0;
                    pvpData["enemyTop"] = res["top"] - 0;
                    pvpData["enemyUserId"] = res["userUid"];
                    pvpData["robot"] = res["robot"];
                    pvpData["lockTime"] = res["lockTime"];
                }
                var rankWatchCount = pvpRankConfig["rankWatchCount"] - 0;
                var rankWatchRatio = pvpRankConfig["rankWatchRatio"] - 0;
                var preTop = ownPvpTop;//上一个排名
                for (var i = 0; i < rankWatchCount; i++) {
                    preTop = Math.floor(preTop * rankWatchRatio);
                    if (preTop == enemyPvpTop) {
                        isInCanChangList = true;
                        break;
                    }
                }
                callback(null);
            });
        },
        function (callback) {//判断是否处于反击队列中
            pvptop.getCounterList(userUid, function (err, res) {
                if (err) {
                    callback(err);
                } else {
                    if (isInCanChangList == false && res == null) {
                        callback("pvpCanNotHitLower");
                        return;
                    }
                    if (isInCanChangList == true) {
                        callback(null);
                    } else if (res != null && res.length != 0) {
                        pvptop.getUserTopList(userUid, [enemyPvpTop], function (err, listData) {
                            if (err || listData == null) {
                                callback("pvpCanNotHitLower");
                                return;
                            } else {
                                var userUid = listData[0]["userUid"];
                                var isInList = false;
                                for (var i = 0; i < res.length; i++) {
                                    var listItem = res[i];
                                    if (("" + listItem) == userUid && enemyPvpTop < ownPvpTop) {
                                        isInList = true;
                                    }
                                }
                                if (isInList) {
                                    callback(null);
                                } else {
                                    callback("pvpCanNotHitLower");
                                }
                            }
                        })
                    } else {
                        callback("pvpCanNotHitLower");
                    }
                }
            });
        },
        function(callback){
            pvptop.lock(userUid, ownPvpTop);
            pvptop.lock(userUid, enemyPvpTop);
            callback(null);
        }
    ], function (err) {
        if (err) {
            callBack(err, null);
        } else {
            returnData["userData"] = userData;
            returnData["pvpData"] = pvpData;
            callBack(null, returnData);
        }
    });
}
exports.start = start;