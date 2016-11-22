/**
 * Created with JetBrains WebStorm.
 * User: za
 * Date: 14-10-28
 * Time: 下午4:36
 * To change this template use File | Settings | File Templates.
 */
var activityData = require("../model/activityData");
var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var jutil = require("../utils/jutil");
var async = require("async");
var configManager = require("../config/configManager");
var bitUtil = require("../alien/db/bitUtil");
var league = require("../model/league");
var mongoStats = require("../model/mongoStats");
var user = require("../model/user");
var battleModel = require("../model/battle");
var crypto = require("crypto");
var formation = require("../model/formation");
var title = require("../model/titleModel");
var activityConfig = require("../model/activityConfig");
var leagueDragon = require("../model/leagueDragon");
var item = require("../model/item");
var hero = require("../model/hero");
var card = require("../model/card");
var specialTeam = require("../model/specialTeam");
var ACTIVITY_CONFIG_NAME = "integralBattle";
var fuse = require("../model/fuse");
var skill = require("../model/skill");
var userVariable = require("../model/userVariable");
var mail = require("../model/mail");
var upStar = require("../model/upStar");
var equipment = require("../model/equipment");
var teach = require("../model/teach");
var debris = require("../model/debris");
var heroSoul = require("../model/heroSoul");

//获取配置
function getConfig(userUid, callbackFn, giveMeItAnyWay) {//7天活动
    // 1.获取活动配置数据
    var isOpen = null;
    activityConfig.getConfig(userUid, ACTIVITY_CONFIG_NAME, function (err, res) {
        if (err || res == null) {
            callbackFn("CannotgetConfig");
        } else {
            var sTime = 0;
            var eTime = 0;
            var currentConfig;
            var userLv = 0;
            if (res[0] || giveMeItAnyWay) {
                async.series([
                    function (cb) {
                        user.getUser(userUid, function (err, res) {
                            if (err) {
                                cb(err);
                            } else {
                                if (res["lv"] == undefined) {
                                    cb("noThisUser");
                                } else {
                                    userLv = res["lv"] - 0;
                                    cb();
                                }
                            }
                        });
                    },
                    function (cb) {
                        sTime = res[4];
                        eTime = res[5];
                        currentConfig = res[2];
                        if (userLv < currentConfig["openLv"]) {
                            isOpen = "notOpen";
                        }
                        cb();
                    }
                ], function (err, res) {
                    callbackFn(isOpen, [sTime, eTime, currentConfig]);
                });
            } else {
                callbackFn("notOpen");
            }
        }
    });
}

//获取用户状态
function getUserData(userUid, sTime, callbackFn, giveMeItAnyWay) {
    var badgeShop = [];
    var returnData = {"data": 0, "dataTime": sTime, "status": 0, "statusTime": 0, "arg": {}};//statusTime--战斗次数 residueTimesList--剩余兑换次数列表（商城）
    var residueTimesList = [];
    var freeBattleTimes = 0;
    async.series([function (cb) {
        getConfig(userUid, function (err, res) {//7天活动
            if (err || res == null) {
                cb("CannotgetConfig");
            } else {
                if (res[2]["badgeShop"] || res[2]["freeBattleTimes"]) {
                    badgeShop = res[2]["badgeShop"];
                    for (var w in badgeShop) {
                        residueTimesList.push(badgeShop[w]["times"]);
                    }
                    freeBattleTimes = res[2]["freeBattleTimes"] - 0;
                    returnData["statusTime"] = freeBattleTimes;
                    returnData["arg"] = {"residueTimesList": residueTimesList};
                    cb();
                } else {
                    cb("configError");
                }
            }
        }, giveMeItAnyWay);
    }, function (cb) {
        activityData.getActivityData(userUid, activityData.INTEGRALBATTLE, function (err, res) {
            if (res != null && res["dataTime"] == sTime) {
                returnData["data"] = res["data"] - 0;
                returnData["status"] = res["status"] - 0;
                returnData["dataTime"] = sTime - 0;
                returnData["statusTime"] = res["statusTime"] - 0;
                returnData["arg"] = JSON.parse(res["arg"]);
                cb(err);
            } else {
                var uData = {};
                uData["data"] = returnData["data"];
                uData["status"] = returnData["status"];
                uData["dataTime"] = returnData["dataTime"];
                uData["statusTime"] = returnData["statusTime"];
                uData["arg"] = JSON.stringify(returnData["arg"]);
                activityData.updateActivityData(userUid, activityData.INTEGRALBATTLE, uData, cb);
            }
        });
    }], function (err, res) {
        callbackFn(err, returnData);
    });
}

//设置用户当前数据
function setUserData(userUid, data, callbackFn) {
    var uData = {};
    uData["data"] = data["data"];
    uData["status"] = data["status"];
    uData["dataTime"] = data["dataTime"];
    uData["statusTime"] = data["statusTime"];
    uData["arg"] = JSON.stringify(data["arg"]);
    activityData.updateActivityData(userUid, activityData.INTEGRALBATTLE, uData, callbackFn);
}
//开始战斗
function battle(userUid, enemyUserUid, callbackFn) {
    var configData = configManager.createConfig(userUid);
    var momentum = 0;
    var userData = {};
    var listData;
    var heroList = {};
    var equipList = {};
    var skillList = {};
    var formationList = {};
    var updateSkillTeam = {};
    var enemyBattleData;
    var enemyDefaultData;
    var ownBattleData;
    var ownListData;
    var ownDefaultBattleData;
    var enemyUserData;
    var enemyListData;
    var battleReturnData = {};
    var isMeFirst = true;

    async.series([
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
        function (callBack) {//获取我方的气势
            title.getTitlesPoint(userUid, function (point) {
                userData["momentum"] = point;
                callBack(null, null);
            });
        },
        function (callBack) {
            user.getUser(enemyUserUid, function (err, res) {
                if (err || res == null) {
                    callBack("noThisUser", null);
                } else {
                    enemyUserData = res;
                    callBack(null, null);
                }
            });
        },
        function (callBack) {//获取敌方的气势
            title.getTitlesPoint(enemyUserUid, function (point) {
                enemyUserData["momentum"] = point;
                callBack(null, null);
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
                    callBack(null, null);
                }
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
            battleModel.getBattleNeedData(enemyUserUid, function (err, battleData) {
                if (err) {
                    callback("PVP DATA WRONG", null);
                } else {
                    enemyListData = battleData;
                    callback();
                }
            });
        },
        function (callback) {
            leagueDragon.getDragon(enemyUserUid, userData["leagueUid"], function (err, res) {
                if (err) {
                    callback(err);
                } else {
                    enemyListData["dragonData"] = res;
                    callback();
                }
            });
        },
        function (callback) {
            upStar.getStarData(enemyUserUid, function (err, res) {
                enemyListData["starData"] = res;
                callback(err);
            });
        },
        function (callback) {
            battleModel.getUserTeamDataByUserId(enemyUserUid, enemyUserData, enemyListData, function (err, targetData, defaultData) {
                if (err) {
                    callback("pvpTeamDataWrong", null);
                } else {
                    enemyBattleData = targetData;
                    enemyDefaultData = defaultData;
                    callback(null, null);
                }
            });
        },
        function (callback) {//开始战斗
            var enemyTeamSkillArr;  //敌方作用于己方的技能
            var ownTeamSkillArr;   //己方作用于敌方的技能
            for (var key in enemyBattleData) {
                var battleItem = enemyBattleData[key];
                battleModel.sortOn(battleItem["skill"], "skillTime");
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
                    UpDateDatabase(userData, ownListData["formationList"], ownListData["heroList"], round["win"], function (err, res) {
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
        }
    ], function (err, res) {
        callbackFn(err, battleReturnData);
    });
}
//保存积分
function addPoint(userUid, isAll, key, eTime, pay, callbackFn) {//"loginFromUserUid"--全服  "domain"--跨服
    //排序
    var time = eTime - jutil.now();
    var number = bitUtil.leftShift(pay, 24) + time;
    var rk = isAll ? (isAll == 2 ? "country" : "loginFromUserUid") : "domain";
    redis[rk](userUid).z("integral:topList:" + key).add(number, userUid, callbackFn);
}

//排行榜
function getRankList(userUid, isAll, key, callbackFn) {
    var rankList = [];
    var currentConfig;
    var sTime = 0;
    var rankReward = [];
    var rk = isAll ? (isAll == 2 ? "country" : "loginFromUserUid") : "domain";

    redis[rk](userUid).z("integral:topList:" + key).revrange(0, 99, "WITHSCORES", function (err, res) {
        if (err) {
            callbackFn(err, null);
        } else {
            if (res == null || res.length < 2) {
                callbackFn(err, null);
            } else {
                var c = 0;
                for (var i = 0; i < res.length; i += 2) {
                    var number = bitUtil.rightShift(res[i + 1] - 0, 24);
                    c++;
                    rankList.push({
                        "userUid": res[i],
                        "userName": "",
                        "number": number,
                        "top": c,
                        "heroId": "",
                        "reward": []
                    });
                }
                async.eachSeries(rankList, function (item, esCb) {
                    async.series([function (cb) {
                        user.getUser(item["userUid"], function (err, res) {
                            if (err) {
                                cb(err);
                            } else {
                                if (res["userName"] == undefined) {
                                    cb("getUserError");
                                } else {
                                    item["userName"] = res["userName"];
                                    cb();
                                }
                            }
                        });
                    }, function (cb) { // 获取活动配置数据
                        getConfig(item["userUid"], function (err, res) {
                            if (err || res == null) {
                                cb("CannotGetConfig");
                            } else {
                                sTime = res[0];
                                currentConfig = res[2];
                                if (currentConfig["rankRewardList"] == undefined) {
                                    cb("configError");
                                } else {
                                    var rwd = currentConfig["rankRewardList"];
                                    rankReward = jutil.deepCopy(rwd);
                                    cb();
                                }
                            }
                        });
                    }, function (cb) {
                        formation.getUserFormation(item["userUid"], function (err, res) {
                            if (err || res == null) {
                                cb("dbError");
                            } else {
                                if (res[1]["formationUid"] == 1) {
                                    item["heroUid"] = res[1]["heroUid"];
                                }
                                cb(null);
                            }
                        });
                    }, function (cb) {
                        if (item["heroUid"] == undefined) {
                            cb("formationError");
                        } else {
                            hero.getHero(item["userUid"], function (err, res) {
                                if (err || res == null) {
                                    cb("dbError");
                                } else {
                                    for (var x in res) {
                                        if (res[x]["heroUid"] == item["heroUid"]) {
                                            item["heroId"] = res[x]["heroId"];
                                            break;
                                        }
                                    }
                                    cb(null);
                                }
                            });
                        }
                    }, function (cb) {
                        var reward = [];
                        for (var w in rankReward) {
                            if (item["top"] >= rankReward[w]["s"] && item["top"] <= rankReward[w]["e"]) {
                                reward = rankReward[w]["reward"];
                                break;
                            }
                        }
                        item["reward"] = reward;
                        cb();
                    }], function (err, res) {
                        esCb();
                    });
                }, function (err, res) {
                    callbackFn(err, rankList);
                });
            }
        }
    });
}

//刷新战斗力
function freshFight(userUid, fight, isAll, callbackFn) {//计算并刷新当前用户的全阵容战斗力
    var sTime = 0;
    var eTime = 0;
    var key = "";
    var currentConfig;
    var userTop = 0;
    var userFight = 0;
    var rk = isAll ? (isAll == 2 ? "country" : "loginFromUserUid") : "domain";
    async.series([
        function (cb) { // 获取活动配置数据
            getConfig(userUid, function (err, res) {
                if (err || res == null) cb("CannotGetConfig");
                else {
                    sTime = res[0];
                    eTime = res[1] - 0;
                    currentConfig = res[2];
                    key = currentConfig["key"];
                    cb(null);
                }
            });
        },
        function (cb) {
            getFightTop(userUid, key, isAll, function (err, res) {
                if (err)cb(err);
                else {
                    userTop = res;
                    cb();
                }
            });
        },
        function (cb) {
            if (userTop == 1) {
                userFight = fight;
                redis[rk](userUid).z("integral:fight:" + key).add(userFight, userUid, cb);
            } else {
                redis[rk](userUid).z("integral:fight:" + key).revrange(0, userTop, "WITHSCORES", function (err, res) {
                    if (err)cb(err);
                    else {
                        var join = false;
                        for (var j = 0; j < res.length; j += 2) {
                            if (userUid == res[j]) {
                                if (fight != res[j + 1]) {
                                    userFight = fight;
                                    join = true;
                                    break;
                                } else {
                                    userFight = res[j + 1];
                                    break;
                                }
                            }
                        }
                        if (join == true) {
                            redis[rk](userUid).z("integral:fight:" + key).add(userFight, userUid, cb);
                        } else {
                            cb();
                        }
                    }
                });
            }
        }], function (err, res) {
        callbackFn(err, userFight);
    });
}
//获取战斗力
function getFightList(userUid, isAll, callbackFn) {//取全服战斗力排行
    var fight = 0;
    var sTime = 0;
    var eTime = 0;
    var point = 0;
    var badge = 0;//勋章
    var fightList = [];
    var matchRankMin = 0;
    var matchRankMax = 0;
    var matchRankLimit = 0;
    var currentConfig;
    var rewardByLv;
    var fightData = [];
    var userLv = 0;
    var list = [];
    var randomList = [];
    var key = "";

    async.series([function (cb) { // 获取活动配置数据
        getConfig(userUid, function (err, res) {
            if (err || res == null) cb("CannotGetConfig");
            else {
                sTime = res[0];
                eTime = res[1];
                currentConfig = res[2];
                key = currentConfig["key"];
                matchRankLimit = currentConfig["matchRankLimit"] - 0;//上下取
                rewardByLv = currentConfig["rewardByLv"];//勋章和积分使用同一配置，掉落个数相同
                cb(null);
            }
        });
    }, function (cb) {
        getBattleResultList(userUid, key, isAll, function (err, res) {
            if (err)cb(err);
            else {
                randomList = res;
                cb(null);
            }
        });
    }, function (cb) {
        var status = 0;
        async.eachSeries(randomList, function (data, esCb) {
            async.series([function (cCb) {
                user.getUser(data["userUid"], function (err, res) {
                    if (err)cCb(err);
                    else {
                        userLv = res["lv"] - 0;
                        cCb();
                    }
                });
            }, function (cCb) {
                for (var x in rewardByLv) {
                    if (userLv >= rewardByLv[x]["s"] && userLv <= rewardByLv[x]["e"]) {
                        point = rewardByLv[x]["ct"] - 0;//积分
                        badge = rewardByLv[x]["ct"] - 0;//勋章
                        break;
                    }
                }
                list.push({"userUid": data["userUid"]});
                fightList.push({
                    "userUid": data["userUid"],
                    "fight": data["fight"],
                    "point": point,
                    "badge": badge,
                    "status": data["status"]
                });
                cCb();
            }], function (err, res) {
                esCb();
            });
        }, function (err, res) {
            cb();
        });
    }, function (cb) {
        getAllList(userUid, key, isAll, "fight", matchRankMin, matchRankMax, list, function (err, res) {
            if (err)cb(err, null);
            else {
                fightData = res;
                async.eachSeries(fightData, function (item, esCb) {
                    for (var r in fightList) {
                        if (item["userUid"] == fightList[r]["userUid"]) {
                            item["fight"] = fightList[r]["fight"];
                            item["point"] = fightList[r]["point"];
                            item["badge"] = fightList[r]["badge"];
                            item["status"] = fightList[r]["status"];//对手当前状态
                            break;
                        }
                    }
                    esCb();
                }, function (err, res) {
                    cb(err);
                });
            }
        });
    }], function (err, res) {
        callbackFn(err, fightData);
    });
}
//取战斗排行名次
function getFightTop(userUid, key, isAll, callbackFn) {
    var userTop = 0;
    var rk = isAll ? (isAll == 2 ? "country" : "loginFromUserUid") : "domain";

    redis[rk](userUid).z("integral:fight:" + key).revrank(userUid, function (err, res) {
        if (err) callbackFn(err, null);
        else if (res == null) {
            userTop = 1;
            callbackFn(err, userTop);
        } else {
            userTop = res - 0 + 1;
            callbackFn(err, userTop);
        }
    });
}

function UpDateDatabase(userData, formationList, heroList, isWin, cb) {//更新数据库信息
    var configData = configManager.createConfig(userData["userUid"]);
    var playerConfig = configData.getConfig("player");
    var updateUser = {};
    var returnData = {};
    var returnHero = {};
    var addMax = 0;
    async.series([
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
                    callBack(null);
                });
            } else {
                callBack(null);
            }
        }
    ], function (err) {
        if (err) {
            cb(err, null);
        } else {
            cb(null, returnData);
        }
    });
}

function getAllList(userUid, key, isAll, type, min, max, list, callbackFn) {
    var rankList = [];
    var teamInfo = {};
    var userData = {};
    var formationInfo = null;
    var cardInfo = null;
    var currentConfig = {};
    var rankRewardList = [];
    var rk = isAll ? (isAll == 2 ? "country" : "loginFromUserUid") : "domain";

    redis[rk](userUid).z("integral:" + type + ":" + key).revrange(min, max, "WITHSCORES", function (err, res) {
        var c = 0;
        for (var i = 0; i < res.length; i += 2) {
            var number = bitUtil.rightShift(res[i + 1] - 0, 24);
            c++;
            rankList.push({"userUid": res[i], "number": number, "top": c});
        }
        if (type == "fight") {//战斗列表
            rankList = list;
        }
        async.eachSeries(rankList, function (item, esCb) {
            async.series([function (cb) { // 获取活动配置数据
                getConfig(userUid, function (err, res) {
                    if (err || res == null) cb("CannotGetConfig");
                    else {
                        currentConfig = res[2];
                        rankRewardList = currentConfig["rankRewardList"];//排行奖励列表
                        cb(null);
                    }
                });
            }, function (cb) {
                user.getUser(item["userUid"], function (err, res) {
                    if (err || res == null) {
                        cb("dbError");
                    } else {
                        userData = res;
                        item["userName"] = res["userName"];
                        item["lv"] = res["lv"];
                        item["leagueUid"] = res["leagueUid"];
                        item["teamInfo"] = {
                            "formation": {},
                            "hero": {},
                            "equip": {},
                            "skill": {},
                            "card": {},
                            "integrationData": {},
                            "dragonData": {},
                            "specialTeam": {}
                        };
                        if (type == "topList") {
                            item["reward"] = [];
                            for (var x in rankRewardList) {
                                if (item["top"] >= rankRewardList[x]["s"] && item["top"] <= rankRewardList[x]["e"]) {
                                    item["reward"] = rankRewardList[x]["reward"];
                                    break;
                                }
                            }
                            cb();
                        } else {
                            cb();
                        }
                    }
                });
            }, function (cb) {
                formation.getUserFormation(item["userUid"], function (err, res) {
                    if (err || res == null) {
                        cb("dbError");
                    } else {
                        formationInfo = res;
                        if (res[1]["formationUid"] == 1) {
                            item["heroUid"] = res[1]["heroUid"];
                        }
                        cb(null);
                    }
                });
            }, function (cb) {
                if (item["heroUid"] == undefined) {
                    cb("formationError");
                } else {
                    hero.getHero(item["userUid"], function (err, res) {
                        if (err || res == null) {
                            cb("dbError");
                        } else {
                            for (var x in res) {
                                if (res[x]["heroUid"] == item["heroUid"]) {
                                    item["heroId"] = res[x]["heroId"];
                                    break;
                                }
                            }
                            cb(null);
                        }
                    });
                }
            }, function (cb) {
                card.getCardList(item["userUid"], function (err, res) {
                    if (err) cb("dbError");
                    else {
                        var cards = res;
                        cardInfo = {};
                        for (var key in formationInfo) {
                            for (var i = 1; i <= 6; i++) {
                                var cardUid = formationInfo[key]["card" + i];
                                if (cardUid != null && cardUid != 0) {
                                    for (var index in cards) {
                                        if (cards[index]["cardUid"] == cardUid)
                                            cardInfo[cardUid] = cards[index];
                                    }
                                }
                            }
                        }
                        item["teamInfo"]["card"] = cardInfo;
                        cb(null);
                    }
                });
            }, function (cb) {
                specialTeam.get(item["userUid"], function (err, res) {
                    if (err || res == null) {
                        cb("dbError");
                    } else {
                        item["teamInfo"]["specialTeam"] = res;
                        cb(null);
                    }
                });
            }, function (cb) {
                fuse.getFuse(item["userUid"], function (err, res) {
                    if (err) cb("dbError");
                    else {
                        item["teamInfo"]["integrationData"] = res;
                        cb(null);
                    }
                });
            }, function (cb) {
                battleModel.getBattleNeedData(item["userUid"], function (err, res) {
                    if (err || res == null) {
                        cb("PVP DATA WRONG");
                    } else {
                        item["teamInfo"]["formation"] = res["formationList"];
                        item["teamInfo"]["hero"] = res["heroList"];
                        item["teamInfo"]["equip"] = res["equipList"];
                        item["teamInfo"]["skill"] = res["skillList"];
                        leagueDragon.getDragon(item["userUid"], item["leagueUid"], function (err, res) {
                            if (err) {
                                cb(err);
                            } else {
                                item["teamInfo"]["dragonData"] = res;
                                cb();
                            }
                        });
                    }
                });
            }, function (cb) {
                var mArr = bitUtil.parseUserUid(item["userUid"]);
                try {
                    var serverList = require("../../config/" + mArr[0] + "_server.json")["serverList"];
                } catch (err) {
                    cb(null);
                    return;
                }
                item["serverName"] = jutil.toBase64(serverList[mArr[1]]["name"]);
                cb(null);
            }], function (err, res) {
                esCb();
            });

        }, function (err, res) {
            callbackFn(err, rankList);
        });
    });
}

function getBattleTimes(userUid, key, isAll, callbackFn) {
    var times = 0;
    var rk = isAll ? (isAll == 2 ? "country" : "loginFromUserUid") : "domain";

    redis[rk](userUid).s("integral:battleTimes:" + key + ":" + userUid).get(function (err, res) {
        if (err)callbackFn(err);
        else {
            if (res != null) {
                times = res - 0;
                callbackFn(err, times);
            } else {
                redis[rk](userUid).s("integral:battleTimes:" + key + ":" + userUid).set(times, function (err, res) {
                    callbackFn(err, times);
                });
            }
        }
    });
}

function setBattleTimes(userUid, key, isAll, number, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "country" : "loginFromUserUid") : "domain";
    redis[rk](userUid).s("integral:battleTimes:" + key + ":" + userUid).set(number, callbackFn);
}

function getFreshTimes(userUid, key, isAll, callbackFn) {
    var times = 10;
    var rk = isAll ? (isAll == 2 ? "country" : "loginFromUserUid") : "domain";

    redis[rk](userUid).s("integral:freshTimes:" + key + ":" + userUid).get(function (err, res) {
        if (err)callbackFn(err);
        else {
            if (res != null) {
                times = res - 0;
                callbackFn(err, times);
            } else {
                redis[rk](userUid).s("integral:freshTimes:" + key + ":" + userUid).set(times, function (err, res) {
                    callbackFn(err, times);
                });
            }
        }
    });
}

function setFreshTimes(userUid, key, isAll, number, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "country" : "loginFromUserUid") : "domain";

    redis[rk](userUid).s("integral:freshTimes:" + key + ":" + userUid).set(number, callbackFn);
}
//获取可攻击的玩家列表
function getBattleResultList(userUid, key, isAll, callbackFn) {
    var battleResultList = [];
    var fight = 0;
    var sTime = 0;
    var eTime = 0;
    var matchRankMin = 0;
    var matchRankMax = 0;
    var matchRankLimit = 0;
    var currentConfig;
    var rewardByLv;
    var rk = isAll ? (isAll == 2 ? "country" : "loginFromUserUid") : "domain";

    redis[rk](userUid).s("integral:battleResultList:" + key + ":" + userUid).getObj(function (err, res) {
        if (err)callbackFn(err, null);
        else {
            if (res != null) {
                battleResultList = res;
                callbackFn(err, battleResultList);
            } else {
                async.series([function (cb) { // 获取活动配置数据
                    getConfig(userUid, function (err, res) {
                        if (err || res == null) cb("CannotGetConfig");
                        else {
                            sTime = res[0];
                            eTime = res[1];
                            currentConfig = res[2];
                            matchRankLimit = currentConfig["matchRankLimit"] - 0;//上下取
                            rewardByLv = currentConfig["rewardByLv"];//勋章和积分使用同一配置，掉落个数相同
                            cb(null);
                        }
                    });
                }, function (cb) {
                    getFightTop(userUid, key, isAll, function (err, res) {
                        if (err)cb(err);
                        else {
                            if (res > matchRankLimit) {//缩小范围
                                matchRankMin = res - matchRankLimit - 1;
                                matchRankMax = res + matchRankLimit;
                                cb();
                            } else {
                                matchRankMax = res + matchRankLimit;
                                cb();
                            }
                        }
                    });
                }, function (cb) {
                    redis[rk](userUid).z("integral:fight:" + key).revrange(matchRankMin, matchRankMax, "WITHSCORES", function (err, res) {
                        if (err)cb(err);
                        else {
                            var idList = [];
                            for (var j = 0; j < res.length; j += 2) {
                                if (userUid == res[j]) {
                                    continue;
                                } else {
                                    idList.push({"userUid": res[j], "fight": res[j + 1], "status": 0});
                                }
                            }
                            if (idList.length < 3) {
                                battleResultList = idList;
                            } else {
                                var randomList = [];
                                while (randomList.length < 3) {
                                    var ke = Math.floor(Math.random() * idList.length);
                                    if (randomList.indexOf(idList[ke]) == -1) {
                                        randomList.push(idList[ke]);
                                    }
                                }
                                battleResultList = randomList;
                            }
                            cb();
                        }
                    });
                }, function (cb) {
                    setBattleResultList(userUid, key, isAll, battleResultList, cb);
                }], function (err, res) {
                    callbackFn(err, battleResultList);
                });
            }
        }
    });
}

function setBattleResultList(userUid, key, isAll, battleResultList, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "country" : "loginFromUserUid") : "domain";
    redis[rk](userUid).s("integral:battleResultList:" + key + ":" + userUid).setObj(battleResultList, callbackFn);
}
//获取战斗力
function freshFightList(userUid, isAll, callbackFn) {//取全服战斗力排行 deadList
    var fight = 0;
    var sTime = 0;
    var eTime = 0;
    var point = 0;
    var badge = 0;//勋章
    var fightList = [];
    var matchRankMin = 0;
    var matchRankMax = 0;
    var matchRankLimit = 0;
    var currentConfig;
    var rewardByLv;
    var fightData = [];
    var userLv = 0;
    var list = [];
    var randomList = [];
    var battleResultList = [];
    var key = "";
    var rk = isAll ? (isAll == 2 ? "country" : "loginFromUserUid") : "domain";

    async.series([function (cb) { // 获取活动配置数据
        getConfig(userUid, function (err, res) {
            if (err || res == null) cb("CannotGetConfig");
            else {
                sTime = res[0];
                eTime = res[1];
                currentConfig = res[2];
                key = currentConfig["key"];
                matchRankLimit = currentConfig["matchRankLimit"] - 0;//上下取
                rewardByLv = currentConfig["rewardByLv"];//勋章和积分使用同一配置，掉落个数相同
                cb(null);
            }
        });
    }, function (cb) {
        getFightTop(userUid, key, isAll, function (err, res) {
            if (err)cb(err);
            else {
                if (res == null) {
                    cb(null);
                } else {
                    if (res > matchRankLimit) {//缩小范围
                        matchRankMin = res - matchRankLimit - 1;
                        matchRankMax = res + matchRankLimit;
                    } else {
                        matchRankMax = res + matchRankLimit;
                    }
                    cb();
                }
            }
        });
    }, function (cb) {
        redis[rk](userUid).z("integral:fight:" + key).revrange(matchRankMin, matchRankMax, "WITHSCORES", function (err, res) {
            if (err)cb(err);
            else {
                var idList = [];
                for (var j = 0; j < res.length; j += 2) {
                    if (userUid == res[j]) {//&& deadList.indexOf(res[j]) == -1
                        continue;
                    } else {
                        idList.push({"userUid": res[j], "fight": res[j + 1], "status": 0});
                    }
                }
                if (idList.length < 3) {
                    battleResultList = idList;
                } else {
                    var randomList = [];
                    while (randomList.length < 3) {
                        var ke = Math.floor(Math.random() * idList.length);
                        if (randomList.indexOf(idList[ke]) == -1) {
                            randomList.push(idList[ke]);
                        }
                    }
                    battleResultList = randomList;
                }
                cb();
            }
        });
    }, function (cb) {
        setBattleResultList(userUid, key, isAll, battleResultList, cb);
    }, function (cb) {
        var status = 0;
        async.eachSeries(battleResultList, function (data, esCb) {
            async.series([function (cCb) {
                user.getUser(data["userUid"], function (err, res) {
                    if (err)cCb(err);
                    else {
                        userLv = res["lv"] - 0;
                        cCb();
                    }
                });
            }, function (cCb) {
                for (var x in rewardByLv) {
                    if (userLv >= rewardByLv[x]["s"] && userLv <= rewardByLv[x]["e"]) {
                        point = rewardByLv[x]["ct"] - 0;//积分
                        badge = rewardByLv[x]["ct"] - 0;//勋章
                        break;
                    }
                }
                list.push({"userUid": data["userUid"]});
                fightList.push({
                    "userUid": data["userUid"],
                    "fight": data["fight"],
                    "point": point,
                    "badge": badge,
                    "status": data["status"]
                });
                cCb();
            }], function (err, res) {
                esCb();
            });
        }, function (err, res) {
            cb();
        });
    }, function (cb) {
        getAllList(userUid, key, isAll, "fight", matchRankMin, matchRankMax, list, function (err, res) {
            if (err)cb(err, null);
            else {
                fightData = res;
                async.eachSeries(fightData, function (item, esCb) {
                    for (var r in fightList) {
                        if (item["userUid"] == fightList[r]["userUid"]) {
                            item["fight"] = fightList[r]["fight"];
                            item["point"] = fightList[r]["point"];
                            item["badge"] = fightList[r]["badge"];
                            item["status"] = fightList[r]["status"];//对手当前状态
                            break;
                        }
                    }
                    esCb();
                }, function (err, res) {
                    cb(err);
                });
            }
        });
    }], function (err, res) {
        callbackFn(err, fightData);
    });
}


//清数据(每日)
function dailyFresh(userUid, callBackFn) {//清除玩家挑战次数和刷新战斗次数
    var list = {};
    var sTime = 0;
    var currentConfig;
    var key = "";
    var times = 0;
    var isAll = 0;
    var rk;

    async.series([function (cb) {
        getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res[2] == undefined) {
                    cb("timeNotMatch");
                } else {
                    sTime = res[0];
                    currentConfig = res[2];
                    key = currentConfig["key"];
                    times = currentConfig["freeBattleTimes"] - 0;
                    isAll = parseInt(res[2]["isAll"]) || 0;
                    rk = isAll ? (isAll == 2 ? "country" : "loginFromUserUid") : "domain";
                    cb();
                }
            }
        }, true);
    }, function (cb) {//清除用户战斗次数
        getUserData(userUid, sTime, function (err, res) {
            if (err) {
                cb(err);
            } else {
                list = res;
                list["statusTime"] = times;
                setUserData(userUid, list, cb);
            }
        }, true);
    }, function (cb) {
        redis[rk](userUid).s("integral:battleTimes:" + key + ":" + userUid).del(cb);
    }, function (cb) {
        redis[rk](userUid).s("integral:freshTimes:" + key + ":" + userUid).del(cb);
    }
    ], function (err, res) {
        callBackFn(null);
    });
}

//清数据（每周）
function weeklyFresh(userUid, callBackFn) {//清除玩家积分
    var currentConfig;//配置
    var list = {};
    var key = "";
    var eTime = 0;
    var sTime = 0;
    var isAll = 0;
    var rk;

    async.series([function (cb) {
        getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res[2] == undefined) {
                    cb("timeNotMatch");
                } else {
                    sTime = res[0];
                    eTime = res[1];
                    currentConfig = res[2];
                    key = currentConfig["key"];
                    isAll = parseInt(res[2]["isAll"]) || 0;
                    rk = isAll ? (isAll == 2 ? "country" : "loginFromUserUid") : "domain";
                    cb();
                }
            }
        }, true);
    }, function (cb) {
        getUserData(userUid, sTime, function (err, res) {
            if (err) {
                cb(err);
            } else {
                var time = eTime - 86400;
                if (jutil.now() > time && jutil.compTimeDay(time, jutil.now()) == false) {//活动结束初始化数据
                    list = res;
                    list["data"] = 0;
                    list["status"] = 0;
                    setUserData(userUid, list, cb);
                } else {
                    cb("timeNotMatch");
                }
            }
        }, true);
    }, function (cb) {//过凌晨清除排行榜
        redis[rk](userUid).z("integral:topList:" + key).del(cb);
    }], function (err, res) {
        callBackFn(null);
    });
}

//擂台赛积分战 发奖
function weeklyReward(userUid, callbackFn) {
    var currentConfig;
    var rankReward = {};
    var lang;
    var userTop = 0;
    var eTime = 0;
    var sTime = 0;
    var list = {};
    var winTimes = 0;
    var badgeRewardList = [];
    var rrdList = [];//勋章奖励
    var reward = [];
    var key = "";
    var isAll = 0;
    /*
     1.判断是否进榜  不符合：跳过
     2.发奖
     */
    async.series([function (cb) {//取配置
        getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res[2] == undefined) {
                    cb("timeNotMatch");
                } else {
                    sTime = res[0];
                    eTime = res[1];
                    currentConfig = res[2];
                    key = currentConfig["key"];
                    badgeRewardList = currentConfig["badgeRewardList"];
                    rankReward = currentConfig["rankRewardList"];
                    var time = eTime - 86400;
                    isAll = parseInt(res[2]["isAll"]) || 0;
                    if (jutil.now() >= time && jutil.now() <= eTime) {
                        cb();
                    } else {
                        cb("timeNotMatch");
                    }
                }
            }
        }, true);
    }, function (cb) {//取胜利次数
        getUserData(userUid, sTime, function (err, res) {
            list = res;
            cb(err);
        }, true);
    }, function (cb) {
        winTimes = parseInt(list["data"]);
        var ct = 0;
        for (var x in badgeRewardList) {
            if (winTimes >= badgeRewardList[x]["times"]) {
                var rrd = badgeRewardList[x]["reward"];
                for (var h in rrd) {
                    if (rrd[h]["id"] == "156003") {
                        ct += rrd[h]["count"];
                        break;
                    }
                }
            }
        }
        if (ct != 0) {
            rrdList.push({"id": "156003", "count": ct});
        }
        cb();
    }, function (cb) {
        userVariable.getLanguage(userUid, function (err, res) {
            lang = res;
            cb(err);
        });
    }, function (cb) {
        var rk = isAll ? (isAll == 2 ? "country" : "loginFromUserUid") : "domain";
        redis[rk](userUid).z("integral:topList:" + key).revrank(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else if (res == null) {
                userTop = 0;
                cb();
            } else {
                userTop = res - 0 + 1;
                cb();
            }
        });
    }, function (cb) {//发邮件
        //準備排名獎勵
        var rData = jutil.deepCopy(rankReward);
        if (userTop > 0) {//进榜了。。。
            for (var w in rData) {
                if (userTop >= rData[w]["s"] && userTop <= rData[w]["e"]) {
                    reward = rData[w]["reward"];
                    break;
                }
            }
        }
        //準備成就獎勵
        if (rrdList.length > 0) {
            for (var fv in rrdList) {
                reward.push({"id": rrdList[fv]["id"], "count": rrdList[fv]["count"], "tag": "1"});
            }
        }
        cb();
    }, function (cb) {
        if (reward.length > 0) {
            var mailStr = "Congrats, you got the Match rewards, please claim it!";//北美活动，暂时用英文 中文："恭喜你获得积分擂台赛奖励，请点击领取";
            mail.addMail(userUid, -1, mailStr, JSON.stringify(reward), "156003", function (err, res) {
                if (err == undefined) {
                    for (var item in reward) {
                        item = reward[item];
                        if (item.hasOwnProperty("tag")) {
                            mongoStats.dropStats(item["id"], userUid, '127.0.0.1', null, mongoStats.E_INTEBATTLE6, item["count"]);
                        } else {
                            mongoStats.dropStats(item["id"], userUid, '127.0.0.1', null, mongoStats.E_INTEBATTLE7, item["count"]);
                        }
                    }
                }
                cb(err);
            });
        } else {
            cb("noReward");
        }
    }], function (err, res) {
        callbackFn();
    });
}

function addDropItem(dropId, dropCount, userUid, isPatch, level, callBack) {
    var dropId = dropId + "";
    var resone = [];
    var rData = [];
    dropCount = dropCount || 1;
    dropCount = dropCount - 0;
    var isHero = false;
    if (arguments.length == 7) {
        isHero = callBack;
        callBack = arguments[6];
    }
    var configData = configManager.createConfig(userUid);

    switch (dropId.substr(0, 2)) {
        case "10"://hero 魂魄
            if (isHero == false) {
                heroSoul.addHeroSoul(userUid, dropId, dropCount, function (err, res) {
                    if (err || res == null) {
                        callBack(err, null);
                    } else {
                        callBack(null, res);
                    }
                });
            } else {
                hero.addHero(userUid, dropId, 0, 1, function (err, res) {
                    callBack(err, res);
                });
            }
            break;
        case "11"://skill 技能  或者技能碎片
            var skillC = configData.getConfig("skill");
            var skillItem = skillC[dropId];
            if (isPatch == 1) { //碎片
                var pathIndex = Math.floor(Math.random() * (skillItem["patchCount"] - 0)) + 1;
                debris.addDebris(userUid, dropId, "type" + pathIndex, dropCount, 1, function (err, res) {
                    if (err || res == null) {
                        callBack(err, null);
                    } else {
                        callBack(null, res);
                    }
                });
            } else {
                level = level || 1;
                var exp = 0;
                if (level > 1) {
                    var skillUpgradeNeedExpConfig = configData.getConfig("skillUpgradeNeedExp");//技能升级需要的经验配置
                    var skillStar = skillC[dropId]["star"];//要升级的技能的星级
                    var skillNeedExpList = skillUpgradeNeedExpConfig[skillStar]["needExp"];//当前技能的每级需要的经验表
                    exp = skillNeedExpList[level - 1] - 0;
                }
                async.timesSeries(dropCount, function (n, cb) {
                    skill.addSkill(userUid, dropId, exp, level, function (err, res) {
                        if (err || res == null) {
                            cb(err, null);
                        } else {
                            resone.push(res);
                            cb(null, res);
                        }
                    });
                }, function (err, ress) {
                    callBack(err, resone);
                });
            }
            break;
        case "12"://装备
        case "13"://装备
        case "14"://装备
            async.timesSeries(dropCount, function (n, cb) {
                equipment.addEquipment(userUid, dropId, level, function (err, res) {
                    if (err || res == null) {
                        cb(err);
                    } else {
                        resone.push(res);
                        cb(null);
                    }
                });
            }, function (err, ress) {
                callBack(err, resone);
            });
            break;
        case "15"://item
            item.updateItem(userUid, dropId, dropCount, function (err, res) {
                if (err || res == null) {
                    callBack(err, null);
                } else {
                    callBack(null, res);
                }
            });
            break;
        case "17"://卡片
            var cardList = [];
            for (var i = 0; i < dropCount; i++) {
                cardList.push(dropId);
            }
            card.addCardList(userUid, cardList, function (err, res) {
                if (err) {
                    callBack(err, null);
                } else {
                    callBack(null, res);
                }
            });
            break;
        default:
            if (dropId == "gold") {
                user.addUserData(userUid, "gold", dropCount, callBack);
            } else if (dropId == "ingot") {
                user.addUserData(userUid, "ingot", dropCount, callBack);
            } else if (dropId == "honor") {
                userVariable.getVariable(userUid, "honor", function (err, res) {
                    if (err)callBack(err);
                    else {
                        var val = 0;
                        if (res == null)  val = dropCount
                        else val = (res - 0) + dropCount;
                        userVariable.setVariable(userUid, "honor", val, function (err, res) {
                            if (err) callBack(err);
                            else callBack(null, {"honor": val})
                        });
                    }
                });
            } else if (dropId == "worldBossTeach") {
                async.times(dropCount, function (n, cb) {
                    teach.addWorldBossTeach(userUid, level || 1, function (err, res) {
                        rData.push(res);
                        cb(null);
                    });
                }, function (err, res) {
                    callBack(err, rData);
                });
            } else if (dropId == "teach") {
                var time = isPatch ? jutil.now() - 86400 : jutil.now();
                async.times(dropCount, function (n, cb) {
                    teach.addTeach(userUid, level || 1, time, function (err, res) {
                        rData.push(res);
                        cb(null);
                    });
                }, function (err, res) {
                    callBack(err, rData);
                });
            } else {
                callBack(null, null);
            }
            break;
    }
}

exports.getConfig = getConfig;
exports.battle = battle;
exports.getUserData = getUserData;
exports.freshFight = freshFight;
exports.setUserData = setUserData;
exports.getRankList = getRankList;
exports.getFightTop = getFightTop;
exports.getFightList = getFightList;
exports.addPoint = addPoint;
exports.getBattleTimes = getBattleTimes;
exports.setBattleTimes = setBattleTimes;
exports.getFreshTimes = getFreshTimes;
exports.setFreshTimes = setFreshTimes;
exports.getBattleResultList = getBattleResultList;
exports.setBattleResultList = setBattleResultList;
exports.freshFightList = freshFightList;
exports.getAllList = getAllList;
exports.dailyFresh = dailyFresh;
exports.weeklyFresh = weeklyFresh;
exports.weeklyReward = weeklyReward;
exports.addDropItem = addDropItem;