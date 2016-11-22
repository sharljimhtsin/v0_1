/**
 * Created by xiayanxin on 2016/9/19.
 *
 * 跨服激戰戰斗接口
 */

var jutil = require("../utils/jutil");
var async = require("async");
var hero = require("../model/hero");
var userVariable = require("../model/userVariable");
var configManager = require("../config/configManager");
var user = require("../model/user");
var pvptop = require("../model/pvpTopCross");
var battleModel = require("../model/battle");
var title = require("../model/titleModel");
var leagueDragon = require("../model/leagueDragon");
var upStar = require("../model/upStar");
var language;
var TAG = "pvp.cross.battle";

function start(postData, response, query) {
    if (jutil.postCheck(postData, "enemyTop") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
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
    var isAll;
    var key;
    var currentConfig;
    var topUserUid = 0;
    async.series([
        function (callback) {
            pvptop.getConfig(userUid, function (err, res) {
                if (err) {
                    callback(err);
                } else if (jutil.now() > res[0] - 0 + 86400 * 2) {
                    callback("timeOut");
                } else {
                    isAll = parseInt(res[2]["isAll"]) || 0;
                    key = res[2]["key"] || "1";
                    currentConfig = res[2];
                    if (currentConfig.hasOwnProperty("topUserUid")) {
                        topUserUid = currentConfig["topUserUid"];
                    }
                    callback();
                }
            });
        },
        function (callback) {
            judgeCanPlayPvp(userUid, enemyTop, isAll, key, function (err, res) {
                if (err) {
                    callback(err, null);
                } else {
                    userData = res["userData"];
                    pvpData = res["pvpData"];
                    enemyUserUid = pvpData["enemyUserId"];
                    if (pvpData["robot"] == 1 && enemyTop <= 10 && topUserUid > 0) {
                        isRobot = false;
                        enemyUserUid = topUserUid;
                    }
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
        function (callBack) {//获取我方的气势
            title.getTitlesPoint(userUid, function (point) {
                userData["momentum"] = point;
                callBack(null, null);
            });
        },
        function (callBack) {//获取敌方的气势
            if (pvpData["robot"] == 1 && (enemyTop > 10 || topUserUid == 0)) {
                callBack(null, null);
            } else {
                title.getTitlesPoint(enemyUserUid, function (point) {
                    enemyUserData["momentum"] = point;
                    callBack(null, null);
                });
            }
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
            if (pvpData["robot"] == 1 && (enemyTop > 10 || topUserUid == 0)) { //是机器人
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
                    UpDateDatabase(pvpData, userData, ownListData["formationList"], ownListData["heroList"], round["win"], isAll, key, function (err, res) {
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
                    callback();
                }
            });
        },
        function (callback) {
            pvptop.unLock(userUid, pvpData["enemyTop"], isAll, callback);
        },
        function (callback) {
            pvptop.unLock(userUid, pvpData["ownPvpTop"], isAll, callback);
        }
    ], function (err, res) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, battleReturnData);
        }
    });
}
function UpDateDatabase(pvpData, userData, formationList, heroList, isWin, isAll, key, cb) {//更新数据库信息
    var configData = configManager.createConfig(userData["userUid"]);
    var playerConfig = configData.getConfig("player");
    var updateUser = {};
    var returnData = {};
    var highest = 0;
    var returnHero = {};
    var addMax = 0;
    async.series([
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
                    callBack();
                }
            });
        },
        function (callBack) { //刷新我方积分
            if (isWin == false) {
                callBack();
            } else {
                pvptop.refreshCurrentPoint(userData["userUid"], pvpData["ownPvpTop"], callBack);
            }
        },
        function (callBack) { //刷新敌方积分
            if (isWin == false || pvpData["robot"] == 1) {
                callBack();
            } else {
                pvptop.refreshCurrentPoint(pvpData["enemyUserId"], pvpData["ownPvpTop"], callBack);
            }
        },
        function (callBack) {//更新玩家排名
            if (isWin == true) {//胜利更新列表
                pvptop.changeRank(userData["userUid"], pvpData["ownPvpTop"], pvpData["enemyTop"], isAll, key, function (err, res) {
                    if (err || res != 1) {
                        callBack(err);
                    } else {
                        callBack();
                    }
                });
            } else {
                callBack();
            }
        },
        function (callBack) {//加积分
            if (isWin && pvpData["ownPvpTop"] < 10 && pvpData["enemyTop"] < 10) {
                pvptop.getCurrentPoint(userData["userUid"], isAll, function (err, res) {
                    if (err) {
                        callBack(err);
                    } else {
                        var points = res["value"] - 0;
                        var enemyTop = pvpData["enemyTop"] - 0;
                        var pvpRankConfig = configData.getConfig("pvpRankCross");
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
                        var newDataObj = {"value": newPoints, "time": res["time"]};
                        var newData = {"arg": JSON.stringify(newDataObj)};
                        pvptop.setUserData(userData["userUid"], newData, callBack);
                    }
                });
            } else {
                callBack();
            }
        },
        function (callBack) { //更新最高排行
            if (isWin == false) {
                callBack();
            } else if (highest == 0 || highest > pvpData["enemyTop"]) {
                userVariable.setVariable(userData["userUid"], "pvpHighestCross", pvpData["enemyTop"], function (err, res) {
                    if (err) {
                        callBack(err);
                    } else {
                        highest = res;
                        returnData["pvpHighest"] = highest;
                        callBack();
                    }
                });
            } else {
                callBack();
            }
        },
        function (callBack) {//更新精力，金币,声望
            if (userData["monthCard"] == "fifty") {
                addMax = 18;
            } else {
                addMax = 0;
            }
            var newPower = configData.getPvpPower(userData["pvpPower"] - 0, userData["lastRecoverPvpPower"] - 0, jutil.now(), addMax);
            updateUser["pvpPower"] = (newPower[0] - 0) - 1;
            updateUser["lastRecoverPvpPower"] = newPower[1];
            var getExp = playerConfig[userData["lv"]]["getPlayerExp"] - 0;
            if (isWin) {
                updateUser["exp"] = (userData["exp"] - 0) + getExp;
                updateUser["gold"] = userData["gold"] - 0;
            } else {
                updateUser["exp"] = (userData["exp"] - 0) + getExp;
                updateUser["gold"] = userData["gold"] - 0;
            }
            user.updateUser(userData["userUid"], updateUser, function (err, res) {
                if (err) {
                    callBack(err);
                } else {
                    returnData["updateUser"] = updateUser;
                    callBack();
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
                async.eachSeries(Object.keys(arr), function (key, esCb) {
                    var item = arr[key];
                    hero.updateHero(userData["userUid"], item["heroUid"], item, function (err, res) {
                        if (err) {
                            esCb(err);
                        } else {
                            esCb(null);
                        }
                    });
                }, function (err) {
                    callBack();
                });
            } else {
                callBack();
            }
        },
        function (callBack) {//更新挑战次数
            pvpData["pvpTimes"] -= 1;
            pvpData["pvpLastUseTime"] = jutil.now();
            var newData = {"value": pvpData["pvpTimes"], "time": pvpData["pvpLastUseTime"]};
            pvptop.setChallengeTimes(userData["userUid"], newData, function (err, res) {
                returnData["pvpChangeTimes"] = pvpData["pvpTimes"];
                callBack(err);
            });
        }
    ], function (err) {
        if (err) {
            cb(err, null);
        } else {
            cb(null, returnData);
        }
    });
}
/**
 * 判断是否可以进行PVP
 * @param userUid    己方
 * @param enemyUid   被挑战方
 * @param callBack
 */
function judgeCanPlayPvp(userUid, enemyTop, isAll, key, callBack) {
    var configData = configManager.createConfig(userUid);
    var pvpData = {};
    var userData = {};
    var returnData = {};
    var ownPvpTop;
    var enemyPvpTop;
    var isInCanChangList = false;
    var pvpRankConfig = configData.getConfig("pvpRankCross");
    async.series([
        function (callback) {//获取用户基本信息
            user.getUser(userUid, function (err, res) {
                if (err || res == null) {
                    callback("noThisUser");
                } else {
                    userData = res;
                    callback();
                }
            });
        },
        function (callback) {//获取用户挑战信息
            pvptop.getUserTop(userUid, isAll, function (err, res) {
                if (err || res == null) {
                    callback("PVP ERROR");
                } else if (res["lockTime"] - jutil.now() > 0) {
                    callback("isBattling");
                } else {
                    ownPvpTop = res["top"] - 0;
                    pvpData["ownPvpTop"] = res["top"] - 0;
                    callback();
                }
            });
        },
        function (callback) {//获取最后一次使用PVP次数时间
            pvptop.getChallengeTimes(userUid, function (err, res) {
                pvpData["pvpTimes"] = res["value"] - 0;
                pvpData["pvpLastUseTime"] = res["time"];
                callback(err);
            });
        },
        function (callback) {//判断挑战次数是否足够
            var totalTimes = pvpData["pvpTimes"] - 0;
            if (totalTimes < 1) {
                callback("pvpTimesNotEnough"); //PVP挑战次数不足
            } else {
                pvpData["pvpTimes"] = totalTimes;
                pvpData["pvpLastUseTime"] = jutil.now();
                callback();
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
                callback();
            }
        },
        function (callback) {//判断是否出可挑战队列中
            pvptop.getTopUser(userUid, enemyTop, isAll, function (err, res) {
                if (err || res == null) {
                    isInCanChangList = false;
                    callback();
                } else if (res["lockTime"] - jutil.now() > 0) {
                    callback("isBattling");
                } else {
                    enemyPvpTop = res["top"] - 0;
                    pvpData["enemyTop"] = res["top"] - 0;
                    pvpData["enemyUserId"] = res["userUid"];
                    pvpData["robot"] = res["robot"];
                    pvpData["lockTime"] = res["lockTime"];
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
                    callback();
                }
            });
        },
        function (callback) {//判断是否处于反击队列中
            pvptop.getCounterList(userUid, key, function (err, res) {
                if (err) {
                    callback(err);
                } else {
                    if (isInCanChangList == false && res == null) {
                        callback("pvpCanNotHitLower");
                    } else if (isInCanChangList == true) {
                        callback();
                    } else if (res != null && res.length != 0) {
                        pvptop.getUserTopList(userUid, [enemyPvpTop], isAll, function (err, listData) {
                            if (err || listData == null) {
                                callback("pvpCanNotHitLower");
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
                                    callback();
                                } else {
                                    callback("pvpCanNotHitLower");
                                }
                            }
                        });
                    } else {
                        callback("pvpCanNotHitLower");
                    }
                }
            });
        },
        function (callback) {
            pvptop.lock(userUid, ownPvpTop, isAll, callback);
        },
        function (callback) {
            pvptop.lock(userUid, enemyPvpTop, isAll, callback);
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