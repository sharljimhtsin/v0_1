/**
 * Created by xiazhengxin on 2015/3/16 13:40.
 *
 * 极地大乱斗 数据模型层
 */

var async = require("async");
var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var bitUtil = require("../alien/db/bitUtil");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var user = require("../model/user");
var crypto = require("crypto");
var battleModel = require("../model/battle");
var title = require("../model/titleModel");
var hero = require("../model/hero");
var modelUtil = require("../model/modelUtil");
var mail = require("../model/mail");
var mongoStats = require("../model/mongoStats");

function startBattle(userUid) {
    var isAll;
    var key;
    var stageReward;
    var rankReward;
    var sTime;
    var eTime;
    var finalRewardStr;
    var rankRewardStr;
    var fightFor = 0;
    var userList = [];
    async.series([function (cb) {
        getConfig(userUid, function (err, res) {
            if (err || jutil.now() < res[0] - 0 + 86400) {
                cb(err);
            } else {
                isAll = parseInt(res[2]["isAll"]) || 0;
                key = res[2]["key"] || 1;
                stageReward = res[2]["stageReward"];
                rankReward = res[2]["rankReward"];
                sTime = res[0];
                eTime = res[1];
                cb(null);
            }
        });
    }, function (cb) {
        var mailConfig = configManager.createConfig(userUid).getConfig("mail");
        finalRewardStr = mailConfig["finalRewardStr"];
        rankRewardStr = mailConfig["rankRewardStr"];
        cb();
    }, function (cb) {
        getAll(userUid, isAll, key, function (err, res) {
            if (err) {
                cb(err);
            } else {
                userList = res;
                cb(null);
            }
        });
    }, function (cb) {
        var error = null;
        var now = jutil.now();
        if (now > eTime || now > sTime + (60 * 60 * 24 * 5)) {
            error = "finished";
        } else if (now > sTime + (60 * 60 * 24 * 4)) {
            fightFor = 0;
        } else if (now > sTime + (60 * 60 * 24 * 3)) {
            fightFor = 1;
        } else if (now > sTime + (60 * 60 * 24 * 2)) {
            fightFor = 8;
        } else if (now > sTime + (60 * 60 * 24 * 1)) {
            fightFor = 16;
        }
        cb(error);
    }, function (cb) {
        var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
        redis[rk](userUid).s("mixContest:battleExit:" + key + ":" + fightFor).setnx(jutil.now(), function (err, res) {
            if (err || res == 0) {
                cb("haveDone");
            } else {
                if (fightFor > 0) {
                    var battleUser = [];
                    for (var id in userList) {
                        var user = JSON.parse(userList[id]);
                        if (user["lose"] == 0) {
                            battleUser.push(id);
                        }
                    }
                    prepareBattle(isAll, key, stageReward, battleUser, fightFor, cb);
                } else {
                    cb();//领奖去
                }
            }
        });
    }, function (cb) {
        if (fightFor == 0) {//进行到决赛，且没有出错
            // 发放排名奖励
            async.eachSeries(Object.keys(rankReward), function (rank, esCb) {
                var rankList = rank.split("-");
                getRankList(userUid, isAll, key, rankList[0] - 1, rankList[1] - 1, function (err, res) {
                    if (err) {
                        console.error(err);
                        esCb(null);
                    } else {
                        var rewardList = rankReward[rank];
                        async.eachSeries(res, function (_userUid, essCb) {
                            mail.addMail(_userUid, -1, rankRewardStr, JSON.stringify(rewardList), 2015, essCb);
                        }, esCb);
                    }
                });
            }, cb);
        } else {
            cb(null);
        }
    }, function (cb) {
        if (fightFor == 0) {
            async.eachSeries(Object.keys(userList), function (_userUid, esCb) {
                getFormation(_userUid, isAll, key, function (err, res) {
                    var reward;
                    for (var i in res) {
                        if (res[i]["reward"] == "1") {
                            reward = {"id": res[i]["heroId"], "count": 30};
                            break;
                        }
                    }
                    if (reward) {
                        mail.addMail(_userUid, -1, finalRewardStr, JSON.stringify([reward]), 2016, esCb);
                        mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.mixContest2, reward["count"]);
                    } else {
                        esCb(null);
                    }
                });
            }, cb);
        } else {
            cb(null);
        }
    }], function (err, res) {
        console.log(err ? err : "it works");
    });
}

function prepareBattle(isAll, key, stageReward, userList, fightFor, callbackFn) {
    var winner;
    async.whilst(function () {
        return userList.length > fightFor;
    }, function (wlCb) {
        var n = 0;
        var length = userList.length;
        while (Math.pow(2, n) < length) {
            n++;
        }
        var stage = Math.pow(2, n - 1);
        console.log("stage", stage);
        var battleTimes = length - stage;
        userList.sort(function () {
            return 0.5 - Math.random();
        });
        var loseList = [];
        console.log("battleTimes", battleTimes);
        async.timesSeries(battleTimes, function (i, nextCb) {
            var he = userList[i];
            var her = userList[length - i - 1];
            console.log(he, her);
            if (he && her) {
                doBattle(he, her, stage, fightFor, isAll, key, stageReward, function (err, res) {
                    if (err) {
                        loseList.push(res == he ? i : length - i - 1);
                        console.log(err, he, her);
                        nextCb(null);
                    } else {
                        console.log(res);
                        if (res["isWin"]) {
                            winner = he;
                            loseList.push(length - i - 1);
                        } else {
                            loseList.push(i);
                        }
                        nextCb(null);
                    }
                });
            } else {
                nextCb(null);
            }
        }, function (err, res) {
            loseList.sort(function (x, y) {
                return y - x;
            });
            for (var i in loseList) {
                userList.splice(loseList[i], 1);
            }
            wlCb(err);
        });
    }, function (err, res) {
        callbackFn(err);
    });
}

function doBattle(he, her, currentStage, stage, isAll, key, stageReward, cb) {
    var hisUserUid = he;
    var hisUserData;
    var hisListData;
    var hisBattleData;
    var hisDefaultBattleData;
    var herUserUid = her;
    var herUserData;
    var herListData;
    var herBattleData;
    var herDefaultBattleData;
    var battleReturnData = {};
    var isWin = false;
    var errMan = 0;
    var configData = configManager.createConfig(hisUserUid);
    async.series([function (callBack) {
        user.getUser(hisUserUid, function (err, res) {
            if (err || res == null) {
                errMan = hisUserUid;
                callBack("noThisUser", null);
            } else {
                hisUserData = res;
                callBack(null, null);
            }
        });
    }, function (callBack) {
        user.getUser(herUserUid, function (err, res) {
            if (err || res == null) {
                errMan = herUserUid;
                callBack("noThisUser", null);
            } else {
                herUserData = res;
                callBack(null, null);
            }
        });
    }, function (callBack) {//获取甲方的气势
        title.getTitlesPoint(hisUserUid, function (point) {
            hisUserData["momentum"] = -1;
            callBack(null, null);
        });
    }, function (callBack) {//获取乙方的气势
        title.getTitlesPoint(herUserUid, function (point) {
            herUserData["momentum"] = -2;
            callBack(null, null);
        });
    }, function (callback) {//获取甲方的挑战队列
        getBattleNeedData(hisUserUid, isAll, key, function (err, res) {
            if (err || res == null) {
                errMan = hisUserUid;
                callback("PVP DATA WRONG", null);
            } else {
                hisListData = res;
                battleModel.getUserTeamDataByUserId(hisUserUid, hisUserData, hisListData, function (err, targetData, defaultData) {
                    if (err) {
                        errMan = hisUserUid;
                        callback("pvpTeamDataWrong", null);
                    } else {
                        hisBattleData = targetData;
                        hisDefaultBattleData = defaultData;
                        callback(null, null);
                    }
                });
            }
        });
    }, function (callback) {//获取乙方挑战队列
        getBattleNeedData(herUserUid, isAll, key, function (err, res) {
            if (err) {
                errMan = herUserUid;
                callback("PVP DATA WRONG", null);
            } else {
                herListData = res;
                battleModel.getUserTeamDataByUserId(herUserUid, herUserData, herListData, function (err, targetData, defaultData) {
                    if (err) {
                        errMan = herUserUid;
                        callback("PVP DATA WRONG", null);
                    } else {
                        herBattleData = targetData;
                        herDefaultBattleData = defaultData;
                        callback(null, null);
                    }
                });
            }
        });
    }, function (callback) {//开始战斗
        var hisTeamSkillArr;   //甲方作用于乙方的技能
        var herTeamSkillArr;  //乙方作用于甲方的技能
        hisTeamSkillArr = battleModel.returnDoOtherTeamSkill(configData, hisDefaultBattleData);
        herTeamSkillArr = battleModel.returnDoOtherTeamSkill(configData, herDefaultBattleData);
        battleModel.doSkillToAllHero(configData, hisTeamSkillArr, hisBattleData, hisDefaultBattleData);
        battleModel.doSkillToAllHero(configData, herTeamSkillArr, herBattleData, herDefaultBattleData);
        battleReturnData["ownTeam"] = battleModel.getTeamReturnData(hisDefaultBattleData, hisBattleData, hisUserData);
        battleReturnData["enemyTeam"] = battleModel.getTeamReturnData(herDefaultBattleData, herBattleData, herUserData);
        battleReturnData["ownTeam"]["name"] = hisUserData["userName"];
        battleReturnData["enemyTeam"]["name"] = herUserData["userName"];
        battleReturnData["roundData"] = [];
        battleReturnData["ownTeam"]["momentum"] = hisUserData["momentum"];
        battleReturnData["enemyTeam"]["momentum"] = herUserData["momentum"];
        var isMeFirst = herUserData["momentum"] > hisUserData["momentum"] ? false : true;
        var defaultOwnTeam = jutil.copyObject(hisBattleData);
        var defaultEnemyTeam = jutil.copyObject(herBattleData);
        for (var i = 1; i <= 3; i++) {
            var teamAcode = battleModel.returnNewTeam(hisBattleData, defaultOwnTeam);
            hisBattleData = teamAcode[0];
            defaultOwnTeam = teamAcode[1];
            var teamBcode = battleModel.returnNewTeam(herBattleData, defaultEnemyTeam);
            herBattleData = teamBcode[0];
            defaultEnemyTeam = teamBcode[1];
            var round = battleModel.twoTeamBattle(configData, hisBattleData, herBattleData, isMeFirst, i, defaultOwnTeam, defaultEnemyTeam);
            battleModel.addDeadInBackData(hisBattleData, battleReturnData["ownTeam"]["team"], i);
            battleReturnData["roundData"].push(round["roundData"]);
            if (round["complete"]) {
                var timeStamp = jutil.nowMillisecond();
                var reward = getScoreRewardByStage(stage, stageReward);
                battleReturnData["isWin"] = round["win"];
                battleReturnData["reward"] = reward;
                battleReturnData["he"] = he;
                battleReturnData["her"] = her;
                var winner;
                var loser;
                if (round["win"]) {
                    isWin = true;
                    winner = he;
                    loser = her;
                } else {
                    winner = her;
                    loser = he;
                }
                addWinRecord(winner, isAll, key, reward);
                addLoseRecord(loser, isAll, key);
                modifyScore(winner, reward, function (err, res) {
                });
                modifyScore(loser, 1, function (err, res) {
                });
                addBattleRecord(winner, isAll, key, loser, timeStamp, currentStage, reward);
                // 存储战斗回合记录
                addBattleRoundData(winner, isAll, key, loser, timeStamp, battleReturnData);
                break;
            }
            isMeFirst = !isMeFirst;
        }
        callback(null, battleReturnData);
    }], function (err, res) {
        if (err) {
            cb(err, errMan);
        } else {
            cb(null, {"isWin": isWin});
        }
    });
}

function getBattleNeedData(userUid, isAll, key, outCallback) {
    var returnData = {};
    async.parallel([
        function (callBack) { //取得我方武将列表
            getHero(userUid, isAll, key, function (err, res) {
                if (err || res == null) {
                    callBack("battleWrong", null);
                } else if (res.length == 0) {
                    callBack("battleWrong", null);
                } else {
                    returnData["heroList"] = res;
                    callBack(null);
                }
            });
        },
        function (callBack) { //获取队伍列表
            getFormation(userUid, isAll, key, function (err, res) {
                if (err || res == null) {
                    callBack("battleWrong");
                } else {
                    returnData["formationList"] = res;
                    callBack(null, null);
                }
            });
        },
        function (callBack) {  //获取装备队列
            getEquipment(userUid, isAll, key, function (err, res) {
                if (err || res == null) {
                    callBack("battleWrong", null);
                } else {
                    returnData["equipList"] = res;
                    callBack(null, null);
                }
            });
        },
        function (callBack) { //获取我方技能队列
            getSkill(userUid, isAll, key, function (err, res) {
                if (err || res == null) {
                    callBack("battleWrong", null);
                } else {
                    returnData["skillList"] = res;
                    callBack(null, null);
                }
            });
        },
        function (callBack) {
            var gravityList = {};
            returnData["gravityList"] = gravityList;
            callBack(null, null);
        }
    ], function (err, res) {
        if (err) {
            outCallback(err, null);
        } else {
            outCallback(null, returnData);
        }
    });
}

function getScoreRewardByStage(stage, stageReward) {
    if (stageReward.hasOwnProperty(stage)) {
        return stageReward[stage];
    } else {
        return stageReward[0];
    }
}

function getConfig(userUid, callbackFn) {
    activityConfig.getConfig(userUid, "mixContest", function (err, res) {
        if (err) {
            callbackFn(err);
        } else {
            if (res[0]) {
                var isOpen = null;
                var sTime = res[4] - 0;
                var eTime = res[5] - 0;
                var configData = jutil.deepCopy(res[2]);
                var key = configData["key"] || "1";
                var round = configData["round"] || "0";
                round = round - 0;
                var preTime = configData["preTime"] || "0";
                preTime = preTime - 0;
                var i = 0;
                var nowTime = jutil.now();
                while (round > 0 && sTime + round * 86400 < nowTime) {
                    sTime += round * 86400;
                    i++;
                }
                if (round > 0) {
                    eTime = sTime + round * 86400 - preTime;
                }
                key = key + "" + i;
                configData["key"] = key;
                if (nowTime < sTime || nowTime > eTime) {
                    isOpen = "notOpen";
                }
                callbackFn(isOpen, [sTime, eTime, configData]);
            } else {
                callbackFn("notOpen");
            }
        }
    });
}

function getUserData(userUid, callbackFn) {
    var retrunData = {"data": 0, "dataTime": 0, "status": 0, "statusTime": 0, "freeRefresh": 0, "win": 0, "lose": 0};
    var sTime = 0;
    var isAll;
    var key;
    async.series([
        function (cb) {
            getConfig(userUid, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    sTime = res[0];
                    isAll = parseInt(res[2]["isAll"]) || 0;
                    key = res[2]["key"] || 1;
                    cb(null);
                }
            })
        },
        function (cb) {
            activityData.getActivityData(userUid, activityData.MIXCONTEST, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    if (res && res["data"]) {
                        retrunData["data"] = res["data"] - 0;
                    }
                    if (res["dataTime"] == sTime) {
                        retrunData["dataTime"] = res["dataTime"] - 0;
                        retrunData["status"] = res["status"] - 0;
                        retrunData["statusTime"] = res["statusTime"] - 0;
                    }
                    cb(null);
                }
            })
        }, function (cb) {
            var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
            redis[rk](userUid).h("mixContest:join:" + key).getJSON(userUid, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    if (res != null) {
                        retrunData["win"] = res["win"] - 0;
                        retrunData["lose"] = res["lose"] - 0;
                    }
                    cb(null);
                }
            });
        }, function (cb) {
            getFreeRefresh(userUid, isAll, key, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    if (res != null) {
                        retrunData["freeRefresh"] = res - 0;
                    }
                    cb(null);
                }
            });
        }
    ], function (err, res) {
        callbackFn(err, retrunData);
    })
}

function joinActivity(userUid, isAll, key, sTime, previousData, callbackFn) {
    activityData.updateActivityData(userUid, activityData.MIXCONTEST, {
        "data": previousData,
        "dataTime": sTime,
        "status": 1,
        "statusTime": jutil.now()
    }, callbackFn);
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    redis[rk](userUid).h("mixContest:join:" + key).setJSON(userUid, {
        "win": 0,
        "lose": 0,
        "freeRefresh": 0
    });
}

function addHero(userUid, isAll, key, heroId, exp, level, breakThrough, heroConfig, callbackFn) {
    var heroObj = heroConfig[heroId];
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    redis.getNewId(userUid, function (err, res) {
        if (err) {
            callbackFn(err, null);
        } else {
            var heroUid = res - 0;
            var newHeroData = {};
            newHeroData["userUid"] = userUid;
            newHeroData["heroUid"] = heroUid;
            newHeroData["heroId"] = heroId;
            newHeroData["exp"] = heroObj["baseExp"] - 0 + exp;
            newHeroData["level"] = level;
            newHeroData["hp"] = heroObj["hp"];
            newHeroData["attack"] = heroObj["attack"];
            newHeroData["defence"] = heroObj["defence"];
            newHeroData["spirit"] = heroObj["spirit"];
            newHeroData["skillLevel"] = 9;
            newHeroData["break"] = breakThrough;
            newHeroData = hero.heroDefault(newHeroData);
            redis[rk](userUid).h("mixContest:hero:" + userUid + ":" + key).setJSON(heroUid, newHeroData, function (err, res) {
                if (err) {
                    callbackFn(err);
                } else {
                    callbackFn(null, heroUid);
                }
            });
        }
    });
}

function getHero(userUid, isAll, key, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    redis[rk](userUid).h("mixContest:hero:" + userUid + ":" + key).getAllJSON(callbackFn);
}

function purgeHero(userUid, isAll, key, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    redis[rk](userUid).h("mixContest:hero:" + userUid + ":" + key).del(callbackFn);
}

function addSkill(userUid, isAll, key, skillId, exp, level, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    redis.getNewId(userUid, function (err, res) {
        if (err) {
            callbackFn(err, null);
        } else {
            var skillUid = res - 0;
            var newData = {};
            newData["userUid"] = userUid;
            newData["skillUid"] = skillUid;
            newData["skillId"] = skillId;
            newData["skillExp"] = exp;
            newData["skillLevel"] = level;
            redis[rk](userUid).h("mixContest:skill:" + userUid + ":" + key).setJSON(skillUid, newData, function (err, res) {
                if (err) {
                    callbackFn(err);
                } else {
                    callbackFn(null, skillUid);
                }
            });
        }
    });
}

function getSkill(userUid, isAll, key, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    redis[rk](userUid).h("mixContest:skill:" + userUid + ":" + key).getAllJSON(callbackFn);
}

function purgeSkill(userUid, isAll, key, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    redis[rk](userUid).h("mixContest:skill:" + userUid + ":" + key).del(callbackFn);
}

function addEquipment(userUid, isAll, key, equipmentId, level, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    redis.getNewId(userUid, function (err, res) {
        if (err) {
            callbackFn(err, null);
        } else {
            var equipmentUid = res - 0;
            var newData = {};
            newData["userUid"] = userUid;
            newData["equipmentUid"] = equipmentUid;
            newData["equipmentId"] = equipmentId;
            newData["level"] = level || 1;
            newData["refining"] = 0;
            newData["refiningLevel"] = 0;
            newData["hole1"] = "lock";
            newData["hole2"] = "lock";
            newData["hole3"] = "lock";
            newData["hole4"] = "lock";
            redis[rk](userUid).h("mixContest:equipment:" + userUid + ":" + key).setJSON(equipmentUid, newData, function (err, res) {
                if (err) {
                    callbackFn(err);
                } else {
                    callbackFn(null, equipmentUid);
                }
            });
        }
    });
}

function getEquipment(userUid, isAll, key, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    redis[rk](userUid).h("mixContest:equipment:" + userUid + ":" + key).getAllJSON(callbackFn);
}

function purgeEquipment(userUid, isAll, key, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    redis[rk](userUid).h("mixContest:equipment:" + userUid + ":" + key).del(callbackFn);
}

function purgeFormationRelated(userUid, isAll, key, callbackFn) {
    async.series([function (cb) {
        purgeHero(userUid, isAll, key, cb);
    }, function (cb) {
        purgeSkill(userUid, isAll, key, cb);
    }, function (cb) {
        purgeEquipment(userUid, isAll, key, cb);
    }], function (err, res) {
        callbackFn(err);
    });
}

function prepareSkill(heroId, heroConfig, skillConfig, yuanConfig, callbackFn) {
    var selected = [];
    async.whilst(function () {
        return selected.length < 2;
    }, function (wlCb) {
        var yuan = heroConfig[heroId]["yuan"];
        async.series([function (queueCb) {
            async.eachSeries(yuan, function (item, eaCb) {
                if (selected.length == 2) {
                    eaCb();
                } else {
                    var yuanList = yuanConfig[item]["relationIds"];
                    for (var yuanObj in yuanList) {
                        yuanObj = yuanList[yuanObj];
                        if (skillConfig.hasOwnProperty(yuanObj)) {
                            selected.push(yuanObj);
                            if (selected.length == 2) {
                                break;
                            }
                        } else {
                            continue;
                        }
                    }
                    eaCb();
                }
            }, function (err, res) {
                queueCb(err);
            });
        }, function (queueCb) {
            if (selected.length == 2) {
                queueCb();
            } else {
                // pick first one
                for (var id in skillConfig) {
                    var skill = skillConfig[id];
                    if (skill["star"] == 4) {
                        if (selected[0] && selected[0] == id) {
                            continue;
                        } else {
                            selected.push(id);
                            if (selected.length == 2) {
                                break;
                            }
                        }
                    } else {
                        continue;
                    }
                }
                queueCb();
            }
        }], function (err, res) {
            wlCb(err);
        });
    }, function (err, res) {
        if (err) {
            callbackFn(err);
        } else {
            callbackFn(null, selected);
        }
    });
}

function prepareEquip(heroId, heroConfig, equipConfig, yuanConfig, callbackFn) {
    var selected = [];
    var types = [];
    async.whilst(function () {
        return selected.length < 3;
    }, function (wlCb) {
        var yuan = heroConfig[heroId]["yuan"];
        async.series([function (queueCb) {
            async.eachSeries(yuan, function (item, eaCb) {
                if (selected.length == 3) {
                    eaCb();
                } else {
                    var yuanList = yuanConfig[item]["relationIds"];
                    for (var yuanObj in yuanList) {
                        yuanObj = yuanList[yuanObj];
                        if (equipConfig.hasOwnProperty(yuanObj) && types.indexOf(equipConfig[yuanObj]["type"]) < 0) {
                            selected.push(yuanObj);
                            types.push(equipConfig[yuanObj]["type"]);
                            if (selected.length == 3) {
                                break;
                            }
                        } else {
                            continue;
                        }
                    }
                    eaCb();
                }
            }, function (err, res) {
                queueCb(err);
            });
        }, function (queueCb) {
            if (selected.length == 3) {
                queueCb();
            } else {
                // pick first one
                for (var id in equipConfig) {
                    var equip = equipConfig[id];
                    if (equip["star"] == 4 && types.indexOf(equip["type"]) < 0) {
                        if (selected[0] && selected[0] == id) {
                            continue;
                        } else if (selected[1] && selected[1] == id) {
                            continue;
                        } else {
                            selected.push(id);
                            types.push(equip["type"]);
                            if (selected.length == 3) {
                                break;
                            }
                        }
                    } else {
                        continue;
                    }
                }
                queueCb();
            }
        }], function (err, res) {
            wlCb(err);
        });
    }, function (err, res) {
        if (err) {
            callbackFn(err);
        } else {
            // 按武器，防具，视屏排序
            var sorted = [];
            for (var tmp in selected) {
                tmp = selected[tmp];
                var equip = equipConfig[tmp];
                switch (equip["type"]) {
                    case 12:
                        sorted[0] = tmp;
                        break;
                    case 13:
                        sorted[1] = tmp;
                        break;
                    case 14:
                        sorted[2] = tmp;
                        break;
                    default :
                        break;
                }
            }
            callbackFn(null, sorted);
        }
    });
}

function isThisHeroExist(heroObj, formationList) {
    for (var formation in formationList) {
        var obj = formationList[formation];
        if (obj["status"] == "lock" && heroObj["id"] == obj["heroId"]) {
            return true;
        }
    }
    return false;
}

function saveFormation(userUid, isAll, key, formationData, formationList, isUpdate, callbackFn) {
    var newData = {};
    async.series([function (outCb) {
        if (!isUpdate) {
            purgeFormationRelated(userUid, isAll, key, outCb);
        } else {
            outCb();
        }
    }, function (outCb) {
        async.times(8, function (n, next) {
            var index = n + 1;
            var i = n;
            if (isUpdate) {
                newData[index] = formationList[index];
                next();
            } else {
                var heroObj;
                var heroUid;
                var skillUidList = [];
                var equipUidList = [];
                var heroConfig;
                var skillConfig;
                var equipConfig;
                var yuanConfig;
                var skillIdList;
                var equipIdList;
                async.series([function (cb) {
                    if (formationList && formationList.hasOwnProperty(index) && formationList[index]["status"] == "lock") {
                        heroObj = formationList[index];
                    } else {
                        do {
                            // pick & remove first one
                            heroObj = formationData.shift();
                        } while (isThisHeroExist(heroObj, formationList));
                    }
                    heroConfig = configManager.createConfig(userUid).getConfig("hero");
                    skillConfig = configManager.createConfig(userUid).getConfig("skill");
                    equipConfig = configManager.createConfig(userUid).getConfig("equip");
                    yuanConfig = configManager.createConfig(userUid).getConfig("yuan");
                    cb();
                }, function (cb) {
                    prepareSkill(heroObj["id"], heroConfig, skillConfig, yuanConfig, function (err, res) {
                        if (err) {
                            cb(err);
                        } else {
                            skillIdList = res;
                            cb();
                        }
                    });
                }, function (cb) {
                    prepareEquip(heroObj["id"], heroConfig, equipConfig, yuanConfig, function (err, res) {
                        if (err) {
                            cb(err);
                        } else {
                            equipIdList = res;
                            cb();
                        }
                    });
                }, function (cb) {
                    addHero(userUid, isAll, key, heroObj["id"], 1, heroObj["level"], heroObj["breakThrough"], heroConfig, function (err, res) {
                        if (err) {
                            cb(err);
                        } else {
                            heroUid = res;
                            cb();
                        }
                    });
                }, function (cb) {
                    async.eachSeries(skillIdList, function (item, skillCb) {
                        addSkill(userUid, isAll, key, item, 0, 9, function (err, res) {
                            if (err) {
                                skillCb(err);
                            } else {
                                skillUidList.push(res);
                                skillCb();
                            }
                        });
                    }, function (err, res) {
                        cb(err);
                    });
                }, function (cb) {
                    async.eachSeries(equipIdList, function (item, equipCb) {
                        addEquipment(userUid, isAll, key, item, 200, function (err, res) {
                            if (err) {
                                equipCb(err);
                            } else {
                                equipUidList.push(res);
                                equipCb();
                            }
                        });
                    }, function (err, res) {
                        cb(err);
                    });
                }, function (cb) {
                    var defaultReward = 1;
                    if (index == 1) {
                        for (var tmp in formationList) {
                            var i = tmp;
                            tmp = formationList[tmp];
                            if (tmp["reward"] == "1" && tmp["status"] == "lock" && i != index) {
                                defaultReward = 0;
                                break;
                            }
                        }
                    } else {
                        defaultReward = 0;
                    }
                    newData[index] = {
                        "formationUid": index,
                        "userUid": userUid,
                        "heroId": heroObj["id"],
                        "heroUid": heroUid,
                        "skill2": skillUidList[0],
                        "skill3": skillUidList[1],
                        "equip1": equipUidList[0],
                        "equip2": equipUidList[1],
                        "equip3": equipUidList[2],
                        "card1": 0,
                        "card2": 0,
                        "card3": 0,
                        "card4": 0,
                        "card5": 0,
                        "card6": 0,
                        "status": heroObj.hasOwnProperty("status") ? heroObj["status"] : "unlock",
                        "reward": index == 1 ? defaultReward : heroObj["reward"],
                        "id": heroObj["id"],
                        "level": heroObj["level"],
                        "breakThrough": heroObj["breakThrough"]
                    };
                    cb();
                }], function (err, res) {
                    next(err);
                });
            }
        }, function (err, res) {
            if (err) {
                outCb(err);
            } else {
                var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
                redis[rk](userUid).h("mixContest:formation:" + userUid + ":" + key).setAllJSON(newData, outCb);
            }
        });
    }], function (err, res) {
        callbackFn(err);
    });
}

function getFormation(userUid, isAll, key, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    redis[rk](userUid).h("mixContest:formation:" + userUid + ":" + key).getAllJSON(callbackFn);
}

function hadJoined(userUid, callbackFn) {
    getUserData(userUid, function (err, res) {
        if (err) {
            callbackFn(err);
        } else {
            callbackFn(res["status"]);
        }
    })
}

function getTop(userUid, isAll, key, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    redis[rk](userUid).z("mixContest:topList:" + key).revrange(0, 0, "WITHSCORES", function (err, res) {
        if (res != null && res.length > 0)
            callbackFn(err, res[0]);
        else
            callbackFn(err, null);
    });
}

function getAll(userUid, isAll, key, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    redis[rk](userUid).h("mixContest:join:" + key).getObj(callbackFn);
}

function getBattleList(userUid, isAll, key, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    redis[rk](userUid).h("mixContest:userBattle:" + userUid + ":" + key).getObj(callbackFn);
}

function getAllBattleList(userUid, isAll, key, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    redis[rk](userUid).h("mixContest:allBattle:" + key).getObj(callbackFn);
}

function getBattle(userUid, isAll, key, id, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    redis[rk](userUid).h("mixContest:allBattle:" + key).get(id, callbackFn);
}

function modifyScore(userUid, score, callbackFn) {
    getUserData(userUid, function (err, res) {
        activityData.updateActivityData(userUid, activityData.MIXCONTEST, {"data": res["data"] + score}, callbackFn);
    })
}

function getFreeRefresh(userUid, isAll, key, cb) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    redis[rk](userUid).s("mixContest:freeRefresh:" + key + ":" + userUid).get(cb);
}

function recordFreeRefresh(userUid, isAll, key, cb) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    redis[rk](userUid).s("mixContest:freeRefresh:" + key + ":" + userUid).incr(cb);
}

function checkFreeRefreshUsed(userUid, isAll, key, cb) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    redis[rk](userUid).s("mixContest:freeRefresh:" + key + ":" + userUid).setnx(0, cb);
}

function addWinRecord(userUid, isAll, key, score) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    redis[rk](userUid).h("mixContest:join:" + key).getJSON(userUid, function (err, res) {
        if (err || res == null) {
            cb("dbError");
        } else {
            var win = res["win"] - 0 + 1;
            res["win"] = win;
            redis[rk](userUid).h("mixContest:join:" + key).setJSON(userUid, res);
            refreshUserRank(userUid, score, isAll, key);
        }
    });
}

function refreshUserRank(userUid, point, isAll, key) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    redis[rk](userUid).z("mixContest:topList:" + key).incrby(point, userUid);
}

function getTop10(userUid, isAll, key, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    redis[rk](userUid).z("mixContest:topList:" + key).revrangeRev(0, 9, callbackFn);
}

function getRankList(userUid, isAll, key, from, to, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    redis[rk](userUid).z("mixContest:topList:" + key).revrangeRev(from, to, callbackFn);
}

function addLoseRecord(userUid, isAll, key) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    redis[rk](userUid).h("mixContest:join:" + key).getJSON(userUid, function (err, res) {
        if (err || res == null) {
            cb("dbError");
        } else {
            var lose = res["lose"] - 0 + 1;
            res["lose"] = lose;
            redis[rk](userUid).h("mixContest:join:" + key).setJSON(userUid, res);
            refreshUserRank(userUid, 1, isAll, key);
        }
    });
}

function addBattleRecord(winner, isAll, key, loser, timeStamp, stage, score) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    var logId = crypto.createHash('md5').update(winner + loser + timeStamp, "utf8").digest('hex');
    var data = {
        "winner": winner,
        "loser": loser,
        "time": Math.floor(timeStamp / 1000),
        "logId": logId,
        "stage": stage,
        "score": score
    };
    redis[rk](winner).h("mixContest:userBattle:" + winner + ":" + key).setJSON(logId, data);
    redis[rk](winner).h("mixContest:allBattle:" + key).setJSON(logId, data);
    redis[rk](loser).h("mixContest:userBattle:" + loser + ":" + key).setJSON(logId, data);
}

function addBattleRoundData(userUid, isAll, key, loser, timeStamp, roundData) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    var logId = crypto.createHash('md5').update(userUid + loser + timeStamp, "utf8").digest('hex');
    redis[rk](userUid).h("mixContest:battleLog:" + key).setJSON(logId, roundData);
}

function getBattleRoundData(userUid, isAll, key, logId, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
    redis[rk](userUid).h("mixContest:battleLog:" + key).getJSON(logId, callbackFn);
}

function getServerNameByUserUid(userUid) {
    var mCode = bitUtil.parseUserUid(userUid);
    var serverConfig = require("../../config/" + mCode[0] + "_server.json");
    var mServerList = serverConfig["serverList"];
    return jutil.toBase64(mServerList[mCode[1]]["name"]);
}

exports.getConfig = getConfig;
exports.getUserData = getUserData;
exports.joinActivity = joinActivity;
exports.hadJoined = hadJoined;
exports.getTop = getTop;
exports.getAll = getAll;
exports.addWinRecord = addWinRecord;
exports.addLoseRecord = addLoseRecord;
exports.addBattleRecord = addBattleRecord;
exports.getBattleList = getBattleList;
exports.addBattleRoundData = addBattleRoundData;
exports.getBattleRoundData = getBattleRoundData;
exports.getBattle = getBattle;
exports.refreshUserRank = refreshUserRank;
exports.getTop10 = getTop10;
exports.getAllBattleList = getAllBattleList;
exports.modifyScore = modifyScore;
exports.startBattle = startBattle;
exports.saveFormation = saveFormation;
exports.getFormation = getFormation;
exports.recordFreeRefresh = recordFreeRefresh;
exports.getHero = getHero;
exports.checkFreeRefreshUsed = checkFreeRefreshUsed;
exports.getFreeRefresh = getFreeRefresh;
exports.getBattleNeedData = getBattleNeedData;
exports.getServerNameByUserUid = getServerNameByUserUid;
exports.getRankList = getRankList;