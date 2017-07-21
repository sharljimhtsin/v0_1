/**
 * Created by xiazhengxin on 2015/1/20 14:33.
 *
 * 天下第一武道会 数据模型层
 *
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
var hero = require("../model/hero");
var formation = require("../model/formation");
var login = require("../model/login");
var crypto = require("crypto");
var item = require("../model/item");
var battleModel = require("../model/battle");
var title = require("../model/titleModel");
var leagueDragon = require("../model/leagueDragon");
var upStar = require("../model/upStar");
var noble = require("../model/noble");

function startBattle(userUid) {
    var isAll;
    var key;
    var stageReward;
    var userList = [];
    async.series([function (cb) {
        getConfig(userUid, function (err, res) {
            if (err || jutil.now() < res[0] - 0 + 86400) {
                cb(err);
            } else {
                isAll = parseInt(res[2]["isAll"]) || 0;
                key = res[2]["key"] || 1;
                stageReward = res[2]["stageReward"];
                cb(null);
            }
        });
    }, function (cb) {
        getAll(userUid, isAll, key, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res != null)
                    userList = Object.keys(res);
                cb(null);
            }
        });
    }, function (cb) {
        console.log("start battle");
        var rk = isAll ? (isAll == 2 ? "country" : "difficulty") : "domain";
        redis[rk](userUid).s("globalContest:battleExit:" + key).setnx(jutil.now(), function (err, res) {
            //redis[isAll ? "difficulty" : "domain"](userUid).s("globalContest:battleExit:" + key).expire(86400*2);
            if (err || res == 0) { //奖励已经发放
                cb("isSended");
            } else {
                prepareBattleQueue(isAll, key, stageReward, userList, cb);
            }
        });
    }], function (err, res) {
        console.log(err);
    });
}

function prepareBattleQueue(isAll, key, stageReward, userList, callbackFn) {
    var limit = 2000;
    var loseList = [];
    async.whilst(function () {
        loseList = [];
        return userList.length > 1;
    }, function (wlCb) {
        var length = userList.length >= limit ? limit : userList.length;
        var half = parseInt(length / 2);
        var n = 0;
        while (Math.pow(2, n) < length) {
            n++;
        }
        var stage = Math.pow(2, n - 1);
        var times = half >= 100 ? half : length - stage;
        userList.sort(function () {
            return 0.5 - Math.random();
        });
        console.log("userlength", length);
        console.log("half", half);
        console.log("stage", stage);
        console.log("battleTimes", times);
        var q = async.queue(function (task, qCb) {
            var he = task.he;
            var she = task.she;
            if (he && she) {
                doBattle(he, she, times, isAll, key, stageReward, function (err, res) {
                    if (err) {
                        loseList.push(res == he ? task.hisPos : task.herPos);
                        qCb(null);
                    } else {
                        if (res["isWin"]) {
                            loseList.push(task.herPos);
                        } else {
                            loseList.push(task.hisPos);
                        }
                        qCb(null);
                    }
                });
            } else {
                qCb(null);
            }
        }, times);
        for (var j = 0; j < times; j++) {
            var he = userList[j];
            var she = userList[times + j];
            q.push({"he": he, "she": she, "hisPos": j, "herPos": times + j}, function (err, res) {
                //pushed
            });
        }
        q.drain = function () {
            loseList.sort(function (x, y) {
                return y - x;
            });
            for (var k in loseList) {
                userList.splice(loseList[k], 1);
            }
            console.log(userList.length);
            console.log(loseList.length);
            wlCb();
        }
    }, function (err, res) {
        console.log(userList, loseList, "end");
        callbackFn(err, res);
    });
}

function doBattle(he, her, stage, isAll, key, stageReward, cb) {
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
            hisUserData["momentum"] = point;
            callBack(null, null);
        });
    }, function (callBack) {//获取乙方的气势
        title.getTitlesPoint(herUserUid, function (point) {
            herUserData["momentum"] = point;
            callBack(null, null);
        });
    }, function (callback) {//获取甲方的挑战队列
        battleModel.getBattleNeedDataForGlobalContest(hisUserUid, function (err, res) {
            if (err || res == null) {
                errMan = hisUserUid;
                callback("PVP DATA WRONG", null);
            } else {
                hisListData = res;
                callback();
            }
        })
    }, function (callback) {
        leagueDragon.getDragon(hisUserUid, hisUserData["leagueUid"], function (err, res) {
            if (err) {
                callback(err);
            } else {
                hisListData["dragonData"] = res;
                callback();
            }
        });
    }, function (callback) {
        upStar.getStarData(hisUserUid, function (err, res) {
            hisListData["starData"] = res;
            callback(err);
        });
    }, function (callback) {
        noble.getAddition(hisUserUid, function (err, res) {
            hisListData["nobleList"] = res;
            callback(err);
        });
    }, function (callback) {
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
    }, function (callback) {//获取乙方挑战队列
        battleModel.getBattleNeedDataForGlobalContest(herUserUid, function (err, res) {
            if (err) {
                errMan = herUserUid;
                callback("PVP DATA WRONG", null);
            } else {
                herListData = res;
                callback();
            }
        });
    }, function (callback) {
        leagueDragon.getDragon(herUserUid, herUserData["leagueUid"], function (err, res) {
            if (err) {
                callback(err);
            } else {
                herListData["dragonData"] = res;
                callback();
            }
        });
    }, function (callback) {
        upStar.getStarData(herUserUid, function (err, res) {
            herListData["starData"] = res;
            callback(err);
        });
    }, function (callback) {
        noble.getAddition(herUserUid, function (err, res) {
            herListData["nobleList"] = res;
            callback(err);
        });
    }, function (callback) {
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
                addBattleRecord(winner, isAll, key, loser, timeStamp, stage, reward);
                // 存储战斗回合记录
                addBattleRoundData(winner, isAll, key, loser, timeStamp, battleReturnData);
                break;
            }
            isMeFirst = !isMeFirst;
        }
        callback(null, null);
    }], function (err, res) {
        if (err) {
            cb(err, errMan);
        } else {
            cb(null, {"isWin": isWin});
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
    activityConfig.getConfig(userUid, "globalContest", function (err, res) {
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
            activityData.getActivityData(userUid, activityData.GLOBALCONTEST, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    if (res["dataTime"] == sTime) {
                        retrunData["data"] = res["data"] - 0;
                        retrunData["dataTime"] = res["dataTime"] - 0;
                        retrunData["status"] = res["status"] - 0;
                        retrunData["statusTime"] = res["statusTime"] - 0;
                    }
                    cb(null);
                }
            })
        }, function (cb) {
            var rk = isAll ? (isAll == 2 ? "country" : "difficulty") : "domain";
            redis[rk](userUid).h("globalContest:join:" + key).getJSON(userUid, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    if (res != null) {
                        retrunData["freeRefresh"] = res["freeRefresh"] - 0;
                        retrunData["win"] = res["win"] - 0;
                        retrunData["lose"] = res["lose"] - 0;
                    }
                    cb(null);
                }
            });
        }
    ], function (err, res) {
        callbackFn(err, retrunData)
    })
}

function joinActivity(userUid, isAll, key, sTime, callbackFn) {
    activityData.updateActivityData(userUid, activityData.GLOBALCONTEST, {
        "data": 0,
        "dataTime": sTime,
        "status": 1,
        "statusTime": jutil.now()
    }, callbackFn);
    var rk = isAll ? (isAll == 2 ? "country" : "difficulty") : "domain";
    redis[rk](userUid).h("globalContest:join:" + key).setJSON(userUid, {
        "win": 0,
        "lose": 0,
        "freeRefresh": 0
    });
}


function hadJoined(userUid, isAll, key, callbackFn) {
    getUserData(userUid, function (err, res) {
        if (err) {
            callbackFn(err);
        } else {
            callbackFn(res["status"]);
        }
    })
}

function getTop(userUid, isAll, key, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "country" : "difficulty") : "domain";
    redis[rk](userUid).z("globalContest:topList:" + key).revrange(0, 0, "WITHSCORES", function (err, res) {
        if (res != null && res.length > 0)
            callbackFn(err, res[0]);
        else
            callbackFn(err, null);
    });
}

function getAll(userUid, isAll, key, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "country" : "difficulty") : "domain";
    redis[rk](userUid).h("globalContest:join:" + key).getObj(callbackFn);
}

function getBattleList(userUid, isAll, key, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "country" : "difficulty") : "domain";
    redis[rk](userUid).h("globalContest:userBattle:" + userUid + ":" + key).getObj(callbackFn);
}

function getAllBattleList(userUid, isAll, key, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "country" : "difficulty") : "domain";
    redis[rk](userUid).h("globalContest:allBattle:" + key).getObj(callbackFn);
}

function getBattle(userUid, isAll, key, id, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "country" : "difficulty") : "domain";
    redis[rk](userUid).h("globalContest:allBattle:" + key).get(id, callbackFn);
}

function modifyScore(userUid, score, callbackFn) {
    getUserData(userUid, function (err, res) {
        activityData.updateActivityData(userUid, activityData.GLOBALCONTEST, {"data": res["data"] + score}, callbackFn);
    })
}

function addWinRecord(userUid, isAll, key, score) {
    var rk = isAll ? (isAll == 2 ? "country" : "difficulty") : "domain";
    redis[rk](userUid).h("globalContest:join:" + key).getJSON(userUid, function (err, res) {
        if (err || res == null) {
            cb("dbError");
        } else {
            var win = res["win"] - 0 + 1;
            res["win"] = win;
            redis[rk](userUid).h("globalContest:join:" + key).setJSON(userUid, res);
            refreshUserRank(userUid, score, isAll, key);
        }
    });
}

function refreshUserRank(userUid, point, isAll, key) {
    var rk = isAll ? (isAll == 2 ? "country" : "difficulty") : "domain";
    redis[rk](userUid).z("globalContest:topList:" + key).incrby(point, userUid);
}

function getUserRank(userUid, isAll, key, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "country" : "difficulty") : "domain";
    redis[rk](userUid).z("globalContest:topList:" + key).revrank(userUid, callbackFn);
}

function getTop10(userUid, isAll, key, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "country" : "difficulty") : "domain";
    redis[rk](userUid).z("globalContest:topList:" + key).revrangeRev(0, 9, callbackFn);
}

function addLoseRecord(userUid, isAll, key) {
    var rk = isAll ? (isAll == 2 ? "country" : "difficulty") : "domain";
    redis[rk](userUid).h("globalContest:join:" + key).getJSON(userUid, function (err, res) {
        if (err || res == null) {
            cb("dbError");
        } else {
            var lose = res["lose"] - 0 + 1;
            res["lose"] = lose;
            redis[rk](userUid).h("globalContest:join:" + key).setJSON(userUid, res);
            refreshUserRank(userUid, 1, isAll, key);
        }
    });
}

function addBattleRecord(winner, isAll, key, loser, timeStamp, stage, score) {
    var logId = crypto.createHash('md5').update(winner + loser + timeStamp, "utf8").digest('hex');
    var data = {
        "winner": winner,
        "loser": loser,
        "time": Math.floor(timeStamp / 1000),
        "logId": logId,
        "stage": stage,
        "score": score
    };
    var rk = isAll ? (isAll == 2 ? "country" : "difficulty") : "domain";
    redis[rk](winner).h("globalContest:userBattle:" + winner + ":" + key).setJSON(logId, data);
    redis[rk](winner).h("globalContest:allBattle:" + key).setJSON(logId, data);
    redis[rk](loser).h("globalContest:userBattle:" + loser + ":" + key).setJSON(logId, data);
}

function addBattleRoundData(userUid, isAll, key, loser, timeStamp, roundData) {
    var logId = crypto.createHash('md5').update(userUid + loser + timeStamp, "utf8").digest('hex');
    var rk = isAll ? (isAll == 2 ? "country" : "difficulty") : "domain";
    redis[rk](userUid).h("globalContest:battleLog:" + key).setJSON(logId, roundData);
}

function getBattleRoundData(userUid, isAll, key, logId, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "country" : "difficulty") : "domain";
    redis[rk](userUid).h("globalContest:battleLog:" + key).getJSON(logId, callbackFn);
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
exports.getUserRank = getUserRank;
exports.getTop10 = getTop10;
exports.getAllBattleList = getAllBattleList;
exports.modifyScore = modifyScore;
exports.startBattle = startBattle;