/**
 * Created with JetBrains WebStorm.
 * User: za
 * Date: 14-10-28
 * Time: 下午4:36
 * To change this template use File | Settings | File Templates.
 */
var redis = require("../alien/db/redis");
var jutil = require("../utils/jutil");
var async = require("async");
var configManager = require("../config/configManager");
var bitUtil = require("../alien/db/bitUtil");
var league = require("../model/league");
var user = require("../model/user");
var battleModel = require("../model/battle");
var title = require("../model/titleModel");
var activityConfig = require("../model/activityConfig");
var leagueDragon = require("../model/leagueDragon");
var activityData = require("../model/activityData");

//需要记录和执行 1.我方战斗数据 2.对方战斗数据 3.资源库双方的数据 4.buff加成 5.排行数据  6.积分商城 7.清除数据
var TAG = "leagueTeam";

//获取配置
function getConfig(userUid, callbackFn) {//7天活动
    activityConfig.getConfig(userUid, TAG, function (err, res) {
        if (err || res == null) {
            callbackFn("CannotgetConfig");
        } else {
            if (res[0]) {
                var sTime = res[4];
                var eTime = res[5];
                var currentConfig = res[2];
                callbackFn(null, [sTime, eTime, currentConfig]);
            } else {
                callbackFn("notOpen");
            }
        }
    });
}
//获取用户状态
function getUserData(userUid, sTime, callbackFn) {
    var returnData = {"data": 0, "dataTime": sTime, "status": 0, "statusTime": 0, "arg": ""};
    async.series([function (cb) {
        activityData.getActivityData(userUid, activityData.LEAGUETEAM, function (err, res) {
            if (res != null && res["dataTime"] == sTime) {
                returnData["data"] = res["data"] - 0;
                returnData["status"] = res["status"] - 0;
                returnData["dataTime"] = sTime - 0;
                returnData["statusTime"] = res["statusTime"] - 0;
                cb(err);
            } else {
                activityData.updateActivityData(userUid, activityData.LEAGUETEAM, returnData, cb);
            }
        });
    }], function (err, res) {
        callbackFn(err, returnData);
    });
}
//设置用户当前数据
function setUserData(userUid, data, callbackFn) {
    activityData.updateActivityData(userUid, activityData.LEAGUETEAM, data, callbackFn);
}

// 會長報名
function leaderJoin(userUid, leagueUid, key, callbackFn) {
    var defaultData = {"contribution": 0, "resource": 0, "freezingTime": 0, "buff": {"id": 0, "TTL": 0}};
    redis.loginFromUserUid(userUid).h(getRedisKey(TAG, "Join", "", key)).setJSON(leagueUid, defaultData, callbackFn);
}

function checkLeaderJoin(userUid, leagueUid, key, callbackFn) {
    redis.loginFromUserUid(userUid).h(getRedisKey(TAG, "Join", "", key)).getJSON(leagueUid, callbackFn);
}

function setTeamContribution(userUid, leagueUid, point, key, callbackFn) {
    var nowData;
    async.series([function (cb) {
        checkLeaderJoin(userUid, leagueUid, key, function (err, res) {
            nowData = res;
            cb(err);
        });
    }, function (cb) {
        if (nowData && nowData.hasOwnProperty("contribution") && nowData.hasOwnProperty("resource")) {
            cb();
        } else {
            cb("dataError");
        }
    }, function (cb) {
        nowData["contribution"] = point;
        redis.loginFromUserUid(userUid).h(getRedisKey(TAG, "Join", "", key)).setJSON(leagueUid, nowData, cb);
    }], callbackFn);
}

function getTeamContribution(userUid, leagueUid, key, callbackFn) {
    checkLeaderJoin(userUid, leagueUid, key, function (err, res) {
        callbackFn(err, res ? res["contribution"] : null);
    });
}

function setTeamResource(userUid, leagueUid, point, key, callbackFn) {
    var nowData;
    var eTime;
    async.series([function (cb) {
        checkLeaderJoin(userUid, leagueUid, key, function (err, res) {
            nowData = res;
            cb(err);
        });
    }, function (cb) {
        if (nowData && nowData.hasOwnProperty("contribution") && nowData.hasOwnProperty("resource")) {
            cb();
        } else {
            cb("dataError");
        }
    }, function (cb) {
        nowData["resource"] = point;
        redis.loginFromUserUid(userUid).h(getRedisKey(TAG, "Join", "", key)).setJSON(leagueUid, nowData, cb);
    }, function (cb) {
        getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res != null) {
                    eTime = res[1];
                    cb();
                } else {
                    cb("configError");
                }
            }
        });
    }, function (cb) {
        addToRank(userUid, leagueUid, point, eTime, key, cb);
    }], callbackFn);
}

function getTeamResource(userUid, leagueUid, key, callbackFn) {
    checkLeaderJoin(userUid, leagueUid, key, function (err, res) {
        callbackFn(err, res ? res["resource"] : null);
    });
}

function setTeamFreezing(userUid, leagueUid, key, callbackFn) {
    var nowData;
    async.series([function (cb) {
        checkLeaderJoin(userUid, leagueUid, key, function (err, res) {
            nowData = res;
            cb(err);
        });
    }, function (cb) {
        if (nowData && nowData.hasOwnProperty("freezingTime")) {
            cb();
        } else {
            cb("dataError");
        }
    }, function (cb) {
        nowData["freezingTime"] = jutil.now() + (60 * 10);
        redis.loginFromUserUid(userUid).h(getRedisKey(TAG, "Join", "", key)).setJSON(leagueUid, nowData, cb);
    }], callbackFn);
}

function getTeamFreezing(userUid, leagueUid, key, callbackFn) {
    checkLeaderJoin(userUid, leagueUid, key, function (err, res) {
        callbackFn(err, res ? res["freezingTime"] : null);
    });
}

function setTeamBuff(userUid, leagueUid, bufferId, key, callbackFn) {
    var nowData;
    async.series([function (cb) {
        checkLeaderJoin(userUid, leagueUid, key, function (err, res) {
            nowData = res;
            cb(err);
        });
    }, function (cb) {
        if (nowData && nowData.hasOwnProperty("buff")) {
            cb();
        } else {
            cb("dataError");
        }
    }, function (cb) {
        var buffObj = {"id": bufferId, "TTL": jutil.now() + 3600};
        nowData["buff"] = buffObj;
        redis.loginFromUserUid(userUid).h(getRedisKey(TAG, "Join", "", key)).setJSON(leagueUid, nowData, cb);
    }], callbackFn);
}

function getTeamBuff(userUid, leagueUid, key, callbackFn) {
    checkLeaderJoin(userUid, leagueUid, key, function (err, res) {
        callbackFn(err, res ? res["buff"] : null);
    });
}

function getLeaderJoined(userUid, key, callbackFn) {
    redis.loginFromUserUid(userUid).h(getRedisKey(TAG, "Join", "", key)).getAllJSON(callbackFn);
}

//成員報名
function memberJoin(userUid, leagueUid, key, callbackFn) {
    var defaultData = {"score": 0, "fighting": 0, "target": 0};
    redis.loginFromUserUid(userUid).h(getRedisKey(TAG, "Enroll", leagueUid, key)).setJSON(userUid, defaultData, callbackFn);
}

function checkMemberJoin(userUid, leagueUid, key, callbackFn) {
    redis.loginFromUserUid(userUid).h(getRedisKey(TAG, "Enroll", leagueUid, key)).getJSON(userUid, callbackFn);
}

function modifyScore(userUid, leagueUid, score, key, callbackFn) {
    var nowData;
    async.series([function (cb) {
        checkMemberJoin(userUid, leagueUid, key, function (err, res) {
            nowData = res;
            cb(err);
        });
    }, function (cb) {
        if (nowData && nowData.hasOwnProperty("score") && nowData.hasOwnProperty("fighting")) {
            cb();
        } else {
            cb("dataError");
        }
    }, function (cb) {
        nowData["score"] = score;
        redis.loginFromUserUid(userUid).h(getRedisKey(TAG, "Enroll", leagueUid, key)).setJSON(userUid, nowData, cb);
    }], callbackFn);
}

function getScore(userUid, leagueUid, key, callbackFn) {
    checkMemberJoin(userUid, leagueUid, key, function (err, res) {
        callbackFn(err, res ? res["score"] : null);
    });
}

function setFightingManor(userUid, leagueUid, fighting, key, callbackFn) {
    var nowData;
    async.series([function (cb) {
        checkMemberJoin(userUid, leagueUid, key, function (err, res) {
            nowData = res;
            cb(err);
        });
    }, function (cb) {
        if (nowData && nowData.hasOwnProperty("score") && nowData.hasOwnProperty("fighting")) {
            cb();
        } else {
            cb("dataError");
        }
    }, function (cb) {
        nowData["fighting"] = fighting;
        redis.loginFromUserUid(userUid).h(getRedisKey(TAG, "Enroll", leagueUid, key)).setJSON(userUid, nowData, cb);
    }], callbackFn);
}

function getFightingManor(userUid, leagueUid, key, callbackFn) {
    checkMemberJoin(userUid, leagueUid, key, function (err, res) {
        callbackFn(err, res ? res["fighting"] : null);
    });
}

function setTargetManor(userUid, leagueUid, target, key, callbackFn) {
    var nowData;
    async.series([function (cb) {
        checkMemberJoin(userUid, leagueUid, key, function (err, res) {
            nowData = res;
            cb(err);
        });
    }, function (cb) {
        if (nowData && nowData.hasOwnProperty("score") && nowData.hasOwnProperty("target")) {
            cb();
        } else {
            cb("dataError");
        }
    }, function (cb) {
        nowData["target"] = target;
        redis.loginFromUserUid(userUid).h(getRedisKey(TAG, "Enroll", leagueUid, key)).setJSON(userUid, nowData, cb);
    }], callbackFn);
}

function getTargetManor(userUid, leagueUid, key, callbackFn) {
    checkMemberJoin(userUid, leagueUid, key, function (err, res) {
        callbackFn(err, res ? res["target"] : null);
    });
}

function getMemberJoined(userUid, leagueUid, key, callbackFn) {
    redis.loginFromUserUid(userUid).h(getRedisKey(TAG, "Enroll", leagueUid, key)).getAllJSON(callbackFn);
}

function setTeamActivations(userUid, leagueUid, typeData, key, callbackFn) {
    redis.loginFromUserUid(userUid).h(getRedisKey(TAG, "Tower", leagueUid, key)).setAllJSON(typeData, callbackFn);
}

function setTeamActivation(userUid, leagueUid, type, typeData, key, callbackFn) {
    redis.loginFromUserUid(userUid).h(getRedisKey(TAG, "Tower", leagueUid, key)).setJSON(type, typeData, callbackFn);
}

function getTeamActivatedAll(userUid, leagueUid, key, callbackFn) {
    redis.loginFromUserUid(userUid).h(getRedisKey(TAG, "Tower", leagueUid, key)).getAllJSON(callbackFn);
}

function getTeamActivated(userUid, leagueUid, type, key, callbackFn) {
    redis.loginFromUserUid(userUid).h(getRedisKey(TAG, "Tower", leagueUid, key)).getJSON(type, callbackFn);
}

function refreshTowerBonus(userUid, leagueUid, key, callbackFn) {
    var tower;
    var resourceNow;
    var needRefresh = false;
    async.series([function (cb) {
        getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res != null) {
                    var sTime = res[0];
                    if (sTime + 86400 * 5.8 < jutil.now()) {
                        cb("skip");// reach deedLine
                    } else {
                        cb();
                    }
                } else {
                    cb("configError");
                }
            }
        });
    }, function (cb) {
        getTeamActivated(userUid, leagueUid, 0, key, function (err, res) {
            tower = res;
            cb(err);
        });
    }, function (cb) {
        cb(tower ? null : "NULL");
    }, function (cb) {
        getTeamResource(userUid, leagueUid, key, function (err, res) {
            resourceNow = res;
            cb(err);
        });
    }, function (cb) {
        var lastBonusTime = tower["lastBonusTime"];
        var multiplex = (jutil.now() - lastBonusTime) / 600;
        if (multiplex > 1) {
            needRefresh = true;
            var resourceAdd = multiplex * tower["resource"];
            setTeamResource(userUid, leagueUid, parseInt(resourceNow) + parseInt(resourceAdd), key, cb);
        } else {
            cb(); // skip due to less than 1
        }
    }, function (cb) {
        if (needRefresh) {
            tower["lastBonusTime"] = jutil.now();
            setTeamActivation(userUid, leagueUid, 0, tower, key, cb);
        } else {
            cb(); // no need update
        }
    }], function (err, res) {
        console.log("refresh Tower Bonus", err, res);
        callbackFn();
    });
}

function battle(userUid, leagueUid, enemyLeagueUid, userList, enemyList, isRobot, index, key, callbackFn) {
    /****
     * 需求：1.根据类型获取对应战斗的奖励或加成（1.资源战--奖励 2.buff攻击战--acttack++ 3.buff防御战--defence++）
     *       2.每场战斗结束，保存当前胜方阵位上所有活着的伙伴的战斗属性
     *       3.联盟vs联盟，玩家5v5战斗，直到一方的所有玩家都挂掉，结束战斗
     */
    var configData = configManager.createConfig(userUid);
    var skillConfig = configData.getConfig("skill");
    var resourcesCraft = configData.getConfig("resourcesCraft");
    var userData = {};
    var returnData = {};
    var enemyUserData = {};
    var roundReturnData = [];
    var isMeFirst = true;
    var enemyBattleData;
    var enemyListData;
    var enemyDefaultData;
    var ownBattleData;
    var ownListData;
    var ownDefaultBattleData;
    var ownLoserList = [];
    var enemyLoserList = [];
    var ownCurrentMan = 0;
    var enemyCurrentMan = 0;

    async.eachSeries(userList, function (ownUserObj, cb) {
        var ownUserUid = ownUserObj["userUid"];
        async.series([
            function (callback) {
                user.getUser(ownUserUid, function (err, res) {
                    if (err) {
                        callback(err);
                    } else {
                        if (res == null) {
                            callback("noThisUser");
                        } else {
                            userData = res;
                            callback();
                        }
                    }
                });
            },
            function (callback) {//获取我方的气势
                title.getTitlesPoint(ownUserUid, function (point) {
                    userData["momentum"] = point;
                    callback();
                });
            },
            function (callback) {//获取己方的挑战队列
                battleModel.getBattleNeedData(ownUserUid, function (err, res) {
                    if (err || res == null) {
                        callback("PVP DATA WRONG");
                    } else {
                        ownListData = res;
                        callback();
                    }
                })
            },
            function (callback) {
                getTeamActivatedAll(userUid, leagueUid, key, function (err, res) {
                    if (err) {
                        callback(err);
                    } else {
                        ownListData["towerData"] = res;
                        callback();
                    }
                });
            },
            function (callback) {
                getTeamBuff(userUid, leagueUid, key, function (err, res) {
                    if (err) {
                        callback(err);
                    } else if (res && res["id"] != "0" && res["TTL"] > jutil.now()) {
                        //var buffObj = {"id": bufferId, "TTL": jutil.now() + 3600};
                        getBuffer(userUid, res["id"], key, function (err, res) {
                            ownListData["bufferData"] = res;
                            callback();
                        });
                    } else {
                        callback(err);
                    }
                });
            },
            function (callback) {
                leagueDragon.getDragon(ownUserUid, userData["leagueUid"], function (err, res) {
                    if (err) {
                        callback(err);
                    } else {
                        ownListData["dragonData"] = res;
                        callback();
                    }
                });
            },
            function (callback) {
                battleModel.getUserTeamDataByUserId(ownUserUid, userData, ownListData, function (err, targetData, defaultData) {
                    if (err) {
                        callback("pvpTeamDataWrong");
                    } else {
                        ownBattleData = targetData;
                        ownDefaultBattleData = defaultData;
                        callback();
                    }
                });
            },
            function (callback) {
                async.eachSeries(enemyList, function (enemyUserObj, fightCb) {
                    var enemyUserUid = (typeof(enemyUserObj) == "object" ? enemyUserObj["userUid"] : enemyUserObj);
                    async.series([function (roundCb) {
                        if (enemyLoserList.indexOf(enemyUserUid) > 0) {
                            roundCb("SKIP");
                        } else {
                            roundCb();
                        }
                    }, function (roundCb) {
                        if (enemyUserUid == enemyCurrentMan) {
                            roundCb();
                        } else {
                            if (isRobot == 1) { //是机器人
                                var starId = 300000 + parseInt(index);
                                enemyUserData["userName"] = jutil.toBase64(resourcesCraft["stars"][starId]["monsterName"]);
                                enemyUserData["lv"] = resourcesCraft["stars"][starId]["monsterLv"];
                                enemyUserData["momentum"] = 0;
                                enemyUserData["leagueUid"] = 0;
                                var formations = {};
                                for (var i = 1; i <= 8; i++) {
                                    var oneData = jutil.deepCopy(resourcesCraft["monster"]);
                                    oneData["name"] = jutil.toBase64(resourcesCraft["stars"][starId]["monsterName"]);
                                    oneData["hero"] = resourcesCraft["stars"][starId]["monster"];
                                    formations[i] = oneData;
                                }
                                enemyBattleData = configData.getLeagueNpc(formations);
                                enemyDefaultData = configData.getLeagueNpc(formations);
                                roundCb();
                            } else {
                                async.series([function (retrieveCb) {
                                    if (enemyUserUid == enemyCurrentMan) {
                                        retrieveCb();
                                    } else {
                                        user.getUser(enemyUserUid, function (err, res) {
                                            if (err || res == null) {
                                                retrieveCb("noThisUser");
                                            } else {
                                                enemyUserData = res;
                                                retrieveCb();
                                            }
                                        });
                                    }
                                }, function (retrieveCb) {
                                    if (enemyUserUid == enemyCurrentMan) {
                                        retrieveCb();
                                    } else {
                                        title.getTitlesPoint(enemyUserUid, function (point) {
                                            enemyUserData["momentum"] = point;
                                            retrieveCb();
                                        });
                                    }
                                }, function (retrieveCb) {
                                    battleModel.getBattleNeedData(enemyUserUid, function (err, battleData) {
                                        if (err) {
                                            retrieveCb("PVP DATA WRONG");
                                        } else {
                                            enemyListData = battleData;
                                            retrieveCb();
                                        }
                                    });
                                }, function (retrieveCb) {
                                    getTeamActivatedAll(enemyUserUid, enemyUserData["leagueUid"], key, function (err, res) {
                                        if (err) {
                                            retrieveCb(err);
                                        } else {
                                            enemyListData["towerData"] = res;
                                            retrieveCb();
                                        }
                                    });
                                }, function (retrieveCb) {
                                    getTeamBuff(enemyUserUid, enemyUserData["leagueUid"], key, function (err, res) {
                                        if (err) {
                                            retrieveCb(err);
                                        } else if (res && res["id"] != "0" && res["TTL"] > jutil.now()) {
                                            //var buffObj = {"id": bufferId, "TTL": jutil.now() + 3600};
                                            getBuffer(enemyUserUid, res["id"], key, function (err, res) {
                                                enemyListData["bufferData"] = res;
                                                retrieveCb();
                                            });
                                        } else {
                                            retrieveCb(err);
                                        }
                                    });
                                }, function (retrieveCb) {
                                    leagueDragon.getDragon(enemyUserUid, enemyUserData["leagueUid"], function (err, res) {
                                        if (err) {
                                            retrieveCb(err);
                                        } else {
                                            enemyListData["dragonData"] = res;
                                            retrieveCb();
                                        }
                                    });
                                }, function (retrieveCb) {
                                    battleModel.getUserTeamDataByUserId(enemyUserUid, enemyUserData, enemyListData, function (err, targetData, defaultData) {
                                        if (err) {
                                            retrieveCb("PVP DATA WRONG");
                                        } else {
                                            enemyBattleData = targetData;
                                            enemyDefaultData = defaultData;
                                            retrieveCb();
                                        }
                                    });
                                }], roundCb);
                            }
                        }
                    }, function (roundCb) {
                        var enemyTeamSkillArr;  //敌方作用于己方的技能
                        var ownTeamSkillArr;   //己方作用于敌方的技能
                        if (isRobot == 1) {//跟机器打
                            for (var key in enemyBattleData) {
                                var enemyItem = enemyBattleData[key];
                                var defaultItem = enemyDefaultData[key];
                                if (enemyItem["skill"][0]) {
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
                            }
                        } else {
                            for (var key in enemyBattleData) {
                                var battleItem = enemyBattleData[key];
                                battleModel.sortOn(battleItem["skill"], "skillTime");
                            }
                        }
                        for (var key in ownBattleData) {
                            var battleItem = ownBattleData[key];
                            battleModel.sortOn(battleItem["skill"], "skillTime");
                        }
                        enemyTeamSkillArr = battleModel.returnDoOtherTeamSkill(configData, enemyDefaultData);
                        ownTeamSkillArr = battleModel.returnDoOtherTeamSkill(configData, ownDefaultBattleData);
                        battleModel.doSkillToAllHero(configData, ownTeamSkillArr, ownBattleData, ownDefaultBattleData);
                        battleModel.doSkillToAllHero(configData, enemyTeamSkillArr, enemyBattleData, enemyDefaultData);
                        var battleReturnData = {};
                        battleReturnData["enemyTeam"] = battleModel.getTeamReturnData(enemyDefaultData, enemyBattleData, {"userName": "???"});
                        battleReturnData["ownTeam"] = battleModel.getTeamReturnData(ownDefaultBattleData, ownBattleData, {"userName": userData});
                        battleReturnData["enemyTeam"]["name"] = enemyUserData["userName"];
                        battleReturnData["ownTeam"]["name"] = userData["userName"];
                        battleReturnData["roundData"] = [];
                        battleReturnData["ownTeam"]["momentum"] = userData["momentum"];
                        battleReturnData["enemyTeam"]["momentum"] = enemyUserData["momentum"];
                        isMeFirst = enemyUserData["momentum"] > userData["momentum"] ? false : true;
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
                                if (battleReturnData["isWin"]) {
                                    ownCurrentMan = ownUserUid;
                                    enemyCurrentMan = 0;
                                    enemyLoserList.push(enemyUserUid);
                                } else {
                                    enemyCurrentMan = enemyUserUid;
                                    ownCurrentMan = 0;
                                    ownLoserList.push(ownUserUid);
                                }
                                break;
                            }
                            isMeFirst = isMeFirst == true ? false : true;
                        }
                        roundReturnData.push(battleReturnData);
                        if (battleReturnData["isWin"]) {
                            roundCb();
                        } else {
                            roundCb("LOSE");
                        }
                    }], function (err, res) {
                        console.log("A ROUND OF MATCH END! " + ownCurrentMan + "|" + enemyCurrentMan);
                        fightCb("SKIP" == err ? null : err);
                    });
                }, function (err, res) {
                    if (err) {
                        console.log("OWN TEAM LOSE,NEED CHANGE PLAYER");
                    } else {
                        console.log("ALL ROUND OF MATCH END!!!");
                    }
                    callback(err);
                });
            }
        ], function (err, res) {
            cb("LOSE" == err ? null : err);
        });
    }, function (err, res) {
        if (err) {
            callbackFn(err);
        } else {
            returnData["roundReturnData"] = roundReturnData;
            returnData["ownLoserList"] = ownLoserList;
            returnData["enemyLoserList"] = enemyLoserList;
            callbackFn(err, returnData);
        }
    });
}

function bufferBattle(userUid, leagueUid, index, key, callbackFn) {
    var configData = configManager.createConfig(userUid);
    var skillConfig = configData.getConfig("skill");
    var resourcesCraft = configData.getConfig("resourcesCraft");
    var userData = {};
    var enemyUserData = {};
    var isMeFirst = true;
    var enemyBattleData;
    var enemyDefaultData;
    var ownBattleData;
    var ownListData;
    var ownDefaultBattleData;
    var returnData = {};
    async.series([
        function (callback) {
            user.getUser(userUid, function (err, res) {
                if (err) {
                    callback(err);
                } else {
                    if (res == null) {
                        callback("noThisUser");
                    } else {
                        userData = res;
                        callback();
                    }
                }
            });
        },
        function (callback) {//获取我方的气势
            title.getTitlesPoint(userUid, function (point) {
                userData["momentum"] = point;
                callback();
            });
        },
        function (callback) {//获取己方的挑战队列
            battleModel.getBattleNeedData(userUid, function (err, res) {
                if (err || res == null) {
                    callback("PVP DATA WRONG");
                } else {
                    ownListData = res;
                    callback();
                }
            });
        },
        function (callback) {
            getTeamActivatedAll(userUid, leagueUid, key, function (err, res) {
                if (err) {
                    callback(err);
                } else {
                    ownListData["towerData"] = res;
                    callback();
                }
            });
        }, function (callback) {
            getTeamBuff(userUid, leagueUid, key, function (err, res) {
                if (err) {
                    callback(err);
                } else if (res && res["id"] != "0" && res["TTL"] > jutil.now()) {
                    //var buffObj = {"id": bufferId, "TTL": jutil.now() + 3600};
                    getBuffer(userUid, res["id"], key, function (err, res) {
                        ownListData["bufferData"] = res;
                        callback();
                    });
                } else {
                    callback(err);
                }
            });
        }, function (callback) {
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
                    callback("pvpTeamDataWrong");
                } else {
                    ownBattleData = targetData;
                    ownDefaultBattleData = defaultData;
                    callback();
                }
            });
        },
        function (callback) {
            var starId = 300000 + parseInt(index);
            enemyUserData["userName"] = jutil.toBase64(resourcesCraft["buff"]["monster"]["name"]);
            enemyUserData["lv"] = resourcesCraft["stars"][starId]["monsterLv"];
            enemyUserData["momentum"] = 0;
            enemyUserData["leagueUid"] = 0;
            var formations = {};
            for (var i = 1; i <= 8; i++) {
                var oneData = jutil.deepCopy(resourcesCraft["monster"]);
                oneData["name"] = jutil.toBase64(resourcesCraft["buff"]["monster"]["name"]);
                oneData["hero"] = resourcesCraft["buff"]["monster"]["formation"][i - 1];
                formations[i] = oneData;
            }
            enemyBattleData = configData.getLeagueNpc(formations);
            enemyDefaultData = configData.getLeagueNpc(formations);
            callback();
        },
        function (callback) {
            var enemyTeamSkillArr;  //敌方作用于己方的技能
            var ownTeamSkillArr;   //己方作用于敌方的技能
            for (var key in enemyBattleData) {
                var enemyItem = enemyBattleData[key];
                var defaultItem = enemyDefaultData[key];
                if (enemyItem["skill"][0]) {
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
            }
            for (var key in ownBattleData) {
                var battleItem = ownBattleData[key];
                battleModel.sortOn(battleItem["skill"], "skillTime");
            }
            enemyTeamSkillArr = battleModel.returnDoOtherTeamSkill(configData, enemyDefaultData);
            ownTeamSkillArr = battleModel.returnDoOtherTeamSkill(configData, ownDefaultBattleData);
            battleModel.doSkillToAllHero(configData, ownTeamSkillArr, ownBattleData, ownDefaultBattleData);
            battleModel.doSkillToAllHero(configData, enemyTeamSkillArr, enemyBattleData, enemyDefaultData);
            var battleReturnData = {};
            battleReturnData["enemyTeam"] = battleModel.getTeamReturnData(enemyDefaultData, enemyBattleData, {"userName": "???"});
            battleReturnData["ownTeam"] = battleModel.getTeamReturnData(ownDefaultBattleData, ownBattleData, {"userName": userData});
            battleReturnData["enemyTeam"]["name"] = enemyUserData["userName"];
            battleReturnData["ownTeam"]["name"] = userData["userName"];
            battleReturnData["roundData"] = [];
            battleReturnData["ownTeam"]["momentum"] = userData["momentum"];
            battleReturnData["enemyTeam"]["momentum"] = enemyUserData["momentum"];
            isMeFirst = enemyUserData["momentum"] > userData["momentum"] ? false : true;
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
                    returnData["battleResult"] = battleReturnData;
                    callback();
                    break;
                }
                isMeFirst = isMeFirst == true ? false : true;
            }
        }
    ], function (err, res) {
        callbackFn(err, returnData);
    });
}

function getBuffers(userUid, key, callbackFn) {//获取所有buffer数据
    var configData = configManager.createConfig(userUid);
    var resourcesCraft = configData.getConfig("resourcesCraft");
    redis.loginFromUserUid(userUid).h(getRedisKey(TAG, "Buffer", "", key)).getAllJSON(function (err, res) {
        var bufferData = {};
        var currentConfig;
        var len;
        var content;
        var seconds;
        if (res == null) {
            async.series([function (cb) {
                getConfig(userUid, function (err, res) {
                    if (err) {
                        cb(err);
                    } else {
                        if (res != null) {
                            currentConfig = res[2];
                            len = currentConfig["bufferLimit"];
                            content = currentConfig["bufferList"];
                            seconds = currentConfig["bufferExpire"];
                            cb();
                        } else {
                            cb("configError");
                        }
                    }
                });
            }, function (cb) {
                var bufferConfig = jutil.deepCopy(content);
                for (var x = 1; x <= len; x++) {
                    var bufferList = bufferConfig[x];
                    // 随机顺序
                    bufferList.sort(function () {
                        return 0.5 - Math.random();
                    });
                    var bufferId = x;
                    var starId = 300000 + parseInt(bufferId);
                    var robotList = resourcesCraft["buff"]["monster"]["formation"];
                    bufferData[x] = {
                        "bufferId": bufferId,
                        "bufferType": "",
                        "bufferAdd": {},
                        "robotName": resourcesCraft["buff"]["monster"]["name"],
                        "robotLevel": resourcesCraft["stars"][starId]["monsterLv"],
                        "robotList": robotList,
                        "leagueUid": "",
                        "leagueName": "",
                        "leagueIcon": "",
                        "winTime": 0,
                        "owner": "",
                        "roundData": {},
                        "isLock": 0
                    };
                    var compareRate = 0;
                    var randomRate = Math.random();
                    once:for (var i in bufferList) {
                        var h = bufferList[i];
                        compareRate += (h["prob"] - 0);
                        if (randomRate <= compareRate) {
                            bufferData[x]["bufferType"] = h["type"];
                            bufferData[x]["bufferAdd"] = h["add"];
                            break once;
                        }
                    }
                }
                cb();
            }, function (cb) {
                setBuffers(userUid, bufferData, key, cb);
            }, function (cb) {
                setBufferExpire(userUid, seconds, key, cb);
            }], function (err, res) {
                callbackFn(err, bufferData);
            })
        } else {
            callbackFn(null, res);
        }
    });
}

function setBufferExpire(userUid, seconds, key, callbackFn) {
    redis.loginFromUserUid(userUid).h(getRedisKey(TAG, "Buffer", "", key)).expire(seconds, callbackFn);
}

function getBuffer(userUid, index, key, callbackFn) {//获取buffer数据
    redis.loginFromUserUid(userUid).h(getRedisKey(TAG, "Buffer", "", key)).getJSON(index, function (err, res) {
        callbackFn(err, res);
    });
}

function setBuffers(userUid, bufferData, key, callbackFn) {//设置所有领地数据
    redis.loginFromUserUid(userUid).h(getRedisKey(TAG, "Buffer", "", key)).setAllJSON(bufferData, callbackFn);
}

function setBuffer(userUid, index, bufferData, key, callbackFn) {//设置领地数据
    redis.loginFromUserUid(userUid).h(getRedisKey(TAG, "Buffer", "", key)).setJSON(index, bufferData, callbackFn);
}

function isBufferLock(userUid, index, key, callbackFn) {
    var isLock = true;
    getBuffer(userUid, index, key, function (err, res) {
        if (res && res.hasOwnProperty("isLock")) {
            isLock = res["isLock"] == 0 ? false : true;
        } else {
            isLock = true;
        }
        callbackFn(err, isLock);
    });
}

function lockBuffer(userUid, index, key, callbackFn) {
    var buffer;
    var canLock = false;
    async.series([function (lockCb) {
        getBuffer(userUid, index, key, function (err, res) {
            buffer = res;
            lockCb(err);
        });
    }, function (lockCb) {
        if (buffer && buffer.hasOwnProperty("isLock")) {
            canLock = buffer["isLock"] == 0 ? true : false;
        } else {
            canLock = false;
        }
        if (canLock) {
            buffer["isLock"] = 1;
            setBuffer(userUid, index, buffer, key, lockCb);
        } else {
            lockCb();
        }
    }], callbackFn);
}

function unlockBuffer(userUid, index, key, callbackFn) {
    var buffer;
    var canUnlock = false;
    async.series([function (unlockCb) {
        getBuffer(userUid, index, key, function (err, res) {
            buffer = res;
            unlockCb(err);
        });
    }, function (unlockCb) {
        if (buffer && buffer.hasOwnProperty("isLock")) {
            canUnlock = buffer["isLock"] == 1 ? true : false;
        } else {
            canUnlock = false;
        }
        if (canUnlock) {
            buffer["isLock"] = 0;
            setBuffer(userUid, index, buffer, key, unlockCb);
        } else {
            unlockCb();
        }
    }], callbackFn);
}

function changeBufferOwner(userUid, leagueUid, roundData, index, key, callbackFn) {
    var buffer;
    var leagueData;
    async.series([function (changeCb) {
        getBuffer(userUid, index, key, function (err, res) {
            buffer = res;
            changeCb(err);
        });
    }, function (changeCb) {
        league.getLeague(userUid, leagueUid, function (err, res) {
            leagueData = res;
            changeCb(err);
        });
    }, function (changeCb) {
        if (buffer) {
            buffer["leagueUid"] = leagueUid;
            buffer["leagueName"] = leagueData["leagueName"];
            buffer["leagueIcon"] = leagueData["type"];
            buffer["winTime"] = jutil.now();
            buffer["owner"] = userUid;
            buffer["roundData"] = roundData;
            setBuffer(userUid, index, buffer, key, changeCb);
        } else {
            changeCb("dataError");
        }
    }, function (changeCb) {
        setTeamBuff(userUid, leagueUid, index, key, changeCb);
    }], callbackFn);
}

function getManors(userUid, len, key, callbackFn) {//获取所有领地数据
    var configData = configManager.createConfig(userUid);
    var resourcesCraft = configData.getConfig("resourcesCraft");
    redis.loginFromUserUid(userUid).h(getRedisKey(TAG, "Manor", "", key)).getAllJSON(function (err, res) {
        var manorData = {};
        if (res == null) {
            for (var x = 1; x <= len; x++) {
                var starId = 300000 + x;
                var robotList = [];
                for (var i = 0; i < 3; i++) {
                    robotList.push(resourcesCraft["stars"][starId]["monster"]);
                }
                manorData[x] = {
                    "starId": starId,
                    "starName": resourcesCraft["stars"][starId]["name"],
                    "isRobot": 1,
                    "robotName": resourcesCraft["stars"][starId]["monsterName"],
                    "robotLevel": resourcesCraft["stars"][starId]["monsterLv"],
                    "robotList": robotList,
                    "leagueUid": "",
                    "leagueName": "",
                    "leagueIcon": "",
                    "winTime": 0,
                    "freezingTime": 0,
                    "lastBonusTime": 0,
                    "owner": [],
                    "substitute": {},
                    "roundData": {},
                    "isLock": 0
                };
            }
            setManors(userUid, manorData, key, function (err, res) {
                callbackFn(err, manorData);
            });
        } else {
            callbackFn(null, res);
        }
    });
}

function getManor(userUid, index, key, callbackFn) {//获取领地数据
    var configData = configManager.createConfig(userUid);
    var resourcesCraft = configData.getConfig("resourcesCraft");
    redis.loginFromUserUid(userUid).h(getRedisKey(TAG, "Manor", "", key)).getJSON(index, function (err, res) {
        var starId = 300000 + parseInt(index);
        var robotList = [];
        for (var i = 0; i < 3; i++) {
            robotList.push(resourcesCraft["stars"][starId]["monster"]);
        }
        var manorData = {
            "starId": starId,
            "starName": resourcesCraft["stars"][starId]["name"],
            "isRobot": 1,
            "robotName": resourcesCraft["stars"][starId]["monsterName"],
            "robotLevel": resourcesCraft["stars"][starId]["monsterLv"],
            "robotList": robotList,
            "leagueUid": "",
            "leagueName": "",
            "leagueIcon": "",
            "winTime": 0,
            "freezingTime": 0,
            "lastBonusTime": 0,
            "owner": [],
            "substitute": {},
            "roundData": {},
            "isLock": 0
        };
        if (res == null) {
            setManor(userUid, index, manorData, key, function (err, res) {
                callbackFn(err, manorData);
            });
        } else {
            callbackFn(null, res);
        }
    });
}

function setManors(userUid, manorData, key, callbackFn) {//设置所有领地数据
    redis.loginFromUserUid(userUid).h(getRedisKey(TAG, "Manor", "", key)).setAllJSON(manorData, callbackFn);
}

function setManor(userUid, index, manorData, key, callbackFn) {//设置领地数据
    redis.loginFromUserUid(userUid).h(getRedisKey(TAG, "Manor", "", key)).setJSON(index, manorData, callbackFn);
}

function isManorLock(userUid, index, key, callbackFn) {
    var isLock = true;
    getManor(userUid, index, key, function (err, res) {
        if (res && res.hasOwnProperty("isLock")) {
            isLock = res["isLock"] == 0 ? false : true;
        } else {
            isLock = true;
        }
        callbackFn(err, isLock);
    });
}

function lockManor(userUid, index, key, callbackFn) {
    var manor;
    var canLock = false;
    async.series([function (lockCb) {
        getManor(userUid, index, key, function (err, res) {
            manor = res;
            lockCb(err);
        });
    }, function (lockCb) {
        if (manor && manor.hasOwnProperty("isLock")) {
            canLock = manor["isLock"] == 0 ? true : false;
        } else {
            canLock = false;
        }
        if (canLock) {
            manor["isLock"] = 1;
            setManor(userUid, index, manor, key, lockCb);
        } else {
            lockCb();
        }
    }], callbackFn);
}

function unlockManor(userUid, index, key, callbackFn) {
    var manor;
    var canUnlock = false;
    async.series([function (unlockCb) {
        getManor(userUid, index, key, function (err, res) {
            manor = res;
            unlockCb(err);
        });
    }, function (unlockCb) {
        if (manor && manor.hasOwnProperty("isLock")) {
            canUnlock = manor["isLock"] == 1 ? true : false;
        } else {
            canUnlock = false;
        }
        if (canUnlock) {
            manor["isLock"] = 0;
            setManor(userUid, index, manor, key, unlockCb);
        } else {
            unlockCb();
        }
    }], callbackFn);
}

function changeManorOwner(userUid, leagueUid, roundData, index, key, callbackFn) {
    var manor;
    var leagueData;
    var loserList;
    var winnerList;
    var loserLeagueUid;
    async.series([function (cb) {
        getManor(userUid, index, key, function (err, res) {
            manor = res;
            cb(err);
        });
    }, function (cb) {
        league.getLeague(userUid, leagueUid, function (err, res) {
            leagueData = res;
            cb(err);
        });
    }, function (cb) {
        winnerList = jutil.deepCopy(manor["substitute"][leagueUid]);
        loserList = jutil.deepCopy(manor["owner"]);
        loserLeagueUid = manor["leagueUid"];
        manor["roundData"] = roundData;
        if (manor["isRobot"] == 1) {
            loserList = [];// no need update
            manor["isRobot"] = 0;
            manor["leagueUid"] = leagueUid;
            manor["leagueName"] = leagueData["leagueName"];
            manor["leagueIcon"] = leagueData["type"];
            manor["winTime"] = jutil.now();
            manor["freezingTime"] = jutil.now() + (60 * 60 * 1);
            manor["lastBonusTime"] = jutil.now();
            manor["owner"] = jutil.deepCopy(manor["substitute"][leagueUid]);
            delete manor["substitute"][leagueUid];
            setManor(userUid, index, manor, key, cb);
        } else {
            async.series([function (replaceCb) {
                refreshManorBonus(userUid, index, key, replaceCb);
            }, function (replaceCb) {
                manor["leagueUid"] = leagueUid;
                manor["leagueName"] = leagueData["leagueName"];
                manor["leagueIcon"] = leagueData["type"];
                manor["winTime"] = jutil.now();
                manor["freezingTime"] = jutil.now() + (60 * 60 * 1);
                manor["lastBonusTime"] = jutil.now();
                manor["owner"] = jutil.deepCopy(manor["substitute"][leagueUid]);
                delete manor["substitute"][leagueUid];
                setManor(userUid, index, manor, key, replaceCb);
            }], cb);
        }
    }, function (cb) {
        setTeamFreezing(userUid, leagueUid, key, cb);
    }, function (cb) {
        async.eachSeries(winnerList, function (winner, winCb) {
            setFightingManor(winner["userUid"], leagueUid, index, key, winCb);
        }, cb);
    }, function (cb) {
        async.eachSeries(loserList, function (loser, loseCb) {
            setFightingManor(loser["userUid"], loserLeagueUid, 0, key, loseCb);
        }, cb);
    }, function (cb) {
        async.eachSeries(loserList, function (loser, loseCb) {
            setTargetManor(loser["userUid"], loserLeagueUid, 0, key, loseCb);
        }, cb);
    }], callbackFn);
}

function quitManorWhileLose(userUid, leagueUid, index, key, callbackFn) {
    var manor;
    var loserList;
    async.series([function (cb) {
        getManor(userUid, index, key, function (err, res) {
            manor = res;
            cb(err);
        });
    }, function (cb) {
        var team = jutil.deepCopy(manor["substitute"]);
        loserList = jutil.deepCopy(team[leagueUid]);
        delete team[leagueUid];
        manor["substitute"] = team;
        setManor(userUid, index, manor, key, cb);
    }, function (cb) {
        async.eachSeries(loserList, function (loser, loseCb) {
            setTargetManor(loser["userUid"], leagueUid, 0, key, loseCb);
        }, cb);
    }], callbackFn);
}

function refreshManorBonusAll(userUid, len, key, callbackFn) {
    async.times(len, function (n, next) {
        refreshManorBonus(userUid, n + 1, key, next);
    }, callbackFn);
}

function refreshManorBonus(userUid, index, key, callbackFn) {
    var manor;
    var scoreAdd = 0;
    var resourceNow = 0;
    var resourceAdd = 0;
    var configData = configManager.createConfig(userUid);
    var resourcesCraft = configData.getConfig("resourcesCraft");
    var currentConfig;
    async.series([function (cb) {
        getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res != null) {
                    var sTime = res[0];
                    if (sTime + 86400 * 5.8 < jutil.now()) {
                        cb("skip");// reach deedLine
                    } else {
                        currentConfig = res[2];
                        cb();
                    }
                } else {
                    cb("configError");
                }
            }
        });
    }, function (cb) {
        getManor(userUid, index, key, function (err, res) {
            manor = res;
            cb(err);
        });
    }, function (cb) {
        if (manor && manor["isRobot"] == 0) {
            var lastBonusTime = manor["lastBonusTime"];
            var multiplex = (jutil.now() - lastBonusTime) / 600;
            if (multiplex > 1) {
                resourceAdd = multiplex * resourcesCraft["starProduce"];
                scoreAdd = multiplex * currentConfig["manorScore"];
                cb();
            } else {
                cb("skip"); // skip due to less than 1
            }
        } else {
            cb("dataError")
        }
    }, function (cb) {
        manor["lastBonusTime"] = jutil.now();
        setManor(userUid, index, manor, key, cb);
    }, function (cb) {
        getTeamResource(userUid, manor["leagueUid"], key, function (err, res) {
            resourceNow = res;
            cb(err);
        });
    }, function (cb) {
        setTeamResource(userUid, manor["leagueUid"], parseInt(resourceNow) + parseInt(resourceAdd), key, cb);
    }, function (cb) {
        async.eachSeries(manor["owner"], function (user, uCb) {
            var scoreNow = 0;
            async.series([function (addCb) {
                getScore(user["userUid"], manor["leagueUid"], key, function (err, res) {
                    scoreNow = res;
                    addCb(err);
                });
            }, function (addCb) {
                modifyScore(user["userUid"], manor["leagueUid"], parseInt(scoreNow) + parseInt(scoreAdd), key, addCb);
            }], uCb);
        }, cb);
    }], function (err, res) {
        console.log("refresh Manor Bonus", err, res);
        callbackFn();
    });
}

function addContribution(userUid, point, callbackFn) {
    var nowContribution = 0;
    var sTime = 0;
    var key;
    var leagueUid;
    async.series([function (cb) {
        getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res != null) {
                    sTime = res[0];
                    key = res[2]["key"];
                    cb();
                } else {
                    cb("configError");
                }
            }
        });
    }, function (cb) {
        user.getUser(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res == null || res["leagueUid"] == 0) {
                    cb("noLeague");
                } else {
                    leagueUid = res["leagueUid"];
                    cb();
                }
            }
        });
    }, function (cb) {
        if (jutil.now() >= sTime + 86400 * 2.5) {
            async.series([function (innerCb) {
                getTeamContribution(userUid, leagueUid, key, function (err, res) {
                    nowContribution = parseInt(res);
                    innerCb(err);
                });
            }, function (innerCb) {
                nowContribution += point;
                setTeamContribution(userUid, leagueUid, nowContribution, key, innerCb);
            }], cb);
        } else {
            cb("timeOut");
        }
    }], function (err, res) {
        callbackFn(err, nowContribution);
    });
}

function expendContribution(userUid, point, callbackFn) {
    var nowContribution = 0;
    var sTime = 0;
    var key;
    var leagueUid;
    async.series([function (cb) {
        getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res != null) {
                    sTime = res[0];
                    key = res[2]["key"];
                    cb();
                } else {
                    cb("configError");
                }
            }
        });
    }, function (cb) {
        user.getUser(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res == null || res["leagueUid"] == 0) {
                    cb("noLeague");
                } else {
                    leagueUid = res["leagueUid"];
                    cb();
                }
            }
        });
    }, function (cb) {//获取联盟数据
        league.getLeague(userUid, leagueUid, function (err, res) {
            if (err) {
                cb(err);
            } else if (res && res["founderUserUid"] == userUid) {
                cb();
            } else {
                cb("notLeader");
            }
        });
    }, function (cb) {
        if (jutil.now() >= sTime + 86400 * 2) {
            async.series([function (innerCb) {
                getTeamContribution(userUid, leagueUid, key, function (err, res) {
                    nowContribution = parseInt(res);
                    innerCb(err);
                });
            }, function (innerCb) {
                if (nowContribution >= point) {
                    innerCb();
                } else {
                    innerCb("devotionNotEnough");
                }
            }, function (innerCb) {
                nowContribution -= point;
                setTeamContribution(userUid, leagueUid, nowContribution, key, innerCb);
            }], cb);
        } else {
            cb("timeOut");
        }
    }], function (err, res) {
        callbackFn(err, nowContribution);
    });
}

function addToRank(userUid, leagueUid, point, eTime, key, callbackFn) {
    var time = eTime - jutil.now();
    var number = bitUtil.leftShift(point, 24) + time;
    redis.loginFromUserUid(userUid).z(getRedisKey(TAG, "Rank", "", key)).add(number, leagueUid, callbackFn);//战队积分
}
//名次
function getRank(userUid, leagueUid, key, callbackFn) {
    var top = 0;
    redis.loginFromUserUid(userUid).z(getRedisKey(TAG, "Rank", "", key)).revrank(leagueUid, function (err, res) {
        if (err) {
            callbackFn(err, null);
        } else if (res == null) {
            top = 0;
            callbackFn(err, top);
        } else {
            top = res - 0 + 1;
            callbackFn(err, top);
        }
    });
}
//排行榜
function getRankList(userUid, currentConfig, key, callbackFn) {
    var rankList = [];
    redis.loginFromUserUid(userUid).z(getRedisKey(TAG, "Rank", "", key)).revrange(0, 9, "WITHSCORES", function (err, res) {
        if (res && res.length > 0) {
            var c = 0;
            var leagueUid;
            var leagueName;
            var leagueType;
            var leagueScore;
            var reward;
            async.eachSeries(res, function (item, rankCb) {
                c++;
                if (c % 2 == 0) {
                    var top = c / 2;
                    var number = bitUtil.rightShift(item - 0, 24);
                    leagueScore = number;
                    async.series([function (selectCb) {
                        league.getLeague(userUid, leagueUid, function (err, res) {
                            leagueName = res["leagueName"];
                            leagueType = res["type"];
                            selectCb(err);
                        });
                    }, function (selectCb) {
                        selectCb();
                    }, function (selectCb) {
                        // 獎勵配置格式參考累計充值 BY:運營
                        for (var i in currentConfig["rankRewardList"]) {
                            if (top == currentConfig["rankRewardList"][i]["top"]) {
                                reward = currentConfig["rankRewardList"][i]["reward"];
                                break;
                            }
                        }
                        selectCb();
                    }], function (err, res) {
                        rankList.push(jutil.deepCopy({
                            "top": top,
                            "leagueUid": leagueUid,
                            "name": leagueName,
                            "resource": leagueScore,
                            "type": leagueType,
                            "reward": reward
                        }));
                        rankCb(err);
                    });
                } else {
                    leagueUid = item;
                    rankCb();
                }
            }, function (err, res) {
                callbackFn(err, rankList);
            });
        } else {
            callbackFn(err, rankList);
        }
    });
}

function getRedisKey(name, subName, lastName, key) {
    return jutil.formatString("{0}:{1}:{2}:{3}", [name, subName, lastName, key]);
}

exports.getConfig = getConfig;
exports.battle = battle;
exports.bufferBattle = bufferBattle;
exports.getBuffers = getBuffers;
exports.setBuffers = setBuffers;
exports.getBuffer = getBuffer;
exports.setBuffer = setBuffer;
exports.setBufferExpire = setBufferExpire;
exports.isBufferLock = isBufferLock;
exports.lockBuffer = lockBuffer;
exports.unlockBuffer = unlockBuffer;
exports.changeBufferOwner = changeBufferOwner;
exports.getTeamBuff = getTeamBuff;
exports.setTeamBuff = setTeamBuff;
exports.getManors = getManors;
exports.setManors = setManors;
exports.getManor = getManor;
exports.setManor = setManor;
exports.isManorLock = isManorLock;
exports.lockManor = lockManor;
exports.unlockManor = unlockManor;
exports.changeManorOwner = changeManorOwner;
exports.quitManorWhileLose = quitManorWhileLose;
exports.refreshManorBonus = refreshManorBonus;
exports.refreshManorBonusAll = refreshManorBonusAll;
exports.getUserData = getUserData;
exports.setUserData = setUserData;
exports.addToRank = addToRank;
exports.getRank = getRank;
exports.getRankList = getRankList;
exports.leaderJoin = leaderJoin;
exports.checkLeaderJoin = checkLeaderJoin;
exports.getLeaderJoined = getLeaderJoined;
exports.memberJoin = memberJoin;
exports.checkMemberJoin = checkMemberJoin;
exports.getMemberJoined = getMemberJoined;
exports.setTeamActivation = setTeamActivation;
exports.setTeamActivations = setTeamActivations;
exports.getTeamActivated = getTeamActivated;
exports.getTeamActivatedAll = getTeamActivatedAll;
exports.refreshTowerBonus = refreshTowerBonus;
exports.setTeamContribution = setTeamContribution;
exports.getTeamContribution = getTeamContribution;
exports.addContribution = addContribution;
exports.expendContribution = expendContribution;
exports.getTeamResource = getTeamResource;
exports.setTeamResource = setTeamResource;
exports.getTeamFreezing = getTeamFreezing;
exports.setTeamFreezing = setTeamFreezing;
exports.modifyScore = modifyScore;
exports.getScore = getScore;
exports.setFightingManor = setFightingManor;
exports.getFightingManor = getFightingManor;
exports.setTargetManor = setTargetManor;
exports.getTargetManor = getTargetManor;