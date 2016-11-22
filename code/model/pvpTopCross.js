/**
 * Created by xiayanxin on 2016/9/19.
 *
 * 跨服激戰模型類
 */

var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var user = require("../model/user");
var formation = require("../model/formation");
var hero = require("../model/hero");
var equipment = require("../model/equipment");
var skill = require("../model/skill");
var card = require("../model/card");
var configManager = require("../config/configManager");
var async = require("async");
var userVariable = require("../model/userVariable");
var jutil = require("../utils/jutil");
var fuse = require("../model/fuse");
var specialTeam = require("../model/specialTeam");
var leagueDragon = require("../model/leagueDragon");
var catalystData = require("../model/catalystData");
var upStar = require("../model/upStar");
var activityConfig = require("../model/activityConfig");
var activityData = require("../model/activityData");
var bitUtil = require("../alien/db/bitUtil");
var fs = require("fs");
var TAG = "pvpTopCross";

function getConfig(userUid, callbackFn) {
    activityConfig.getConfig(userUid, TAG, function (err, res) {
        if (err) {
            callbackFn(err);
        } else {
            if (res[0]) {
                var isOpen = null;
                var sTime = res[4] - 0;
                var eTime = res[5] - 0;
                var configData = jutil.deepCopy(res[2]);
                var nowTime = jutil.now();
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

/**
 * @param userUid 用户ID
 * @param robot 是否机器人
 */
function addNewUser(userUid, robot, isAll, callbackFn) {
    var serverSql = "SELECT MAX(top) AS top FROM pvptop";
    var rk = isAll ? (isAll == 2 ? "loginDB" : "crossDB") : "game";//210
    mysql[rk](userUid).query(serverSql, function (err, res) {
        if (err || res == null) {
            callbackFn(err, null);
        } else {
            var newTop = 1;
            if (res[0]["top"] != null) {
                newTop = res[0]["top"] - 0 + 1;
            }
            var insertSql = "INSERT INTO pvptop SET ?";
            var insertData = {"top": newTop, "userUid": userUid, "robot": robot};
            mysql[rk](userUid).query(insertSql, insertData, function (err, res) {
                callbackFn(err, insertData);
            });
        }
    });
}


/**
 * 取排名在某个位置的用户信息
 * @param top
 * @param callback
 */
function getTopUser(userUid, top, isAll, callback) {
    var sql = "SELECT * FROM pvptop WHERE top=" + mysql.escape(top);
    var rk = isAll ? (isAll == 2 ? "loginDB" : "crossDB") : "game";//210
    mysql[rk](userUid).query(sql, function (err, res) {
        if (err) {
            callback(err, null);
        } else {
            if (res == null || res.length == 0) {
                callback(null, null);
            } else {
                callback(null, res[0]);
            }
        }
    });
}

/**
 * 取一个玩家的当前排名
 * @param userUid
 * @param callbackFn
 */
function getUserTop(userUid, isAll, callbackFn) {
    var sql = "SELECT * FROM pvptop WHERE userUid=" + mysql.escape(userUid) + " AND robot=0";
    var rk = isAll ? (isAll == 2 ? "loginDB" : "crossDB") : "game";//210
    mysql[rk](userUid).query(sql, function (err, res) {
        if (err) {
            callbackFn(err, null);
        } else {
            if (res == null || res.length == 0) {
                callbackFn(null, null);
            } else {
                callbackFn(null, res[0]);
            }
        }
    });
}


/**
 * 取出列表中的所有玩家信息
 * @param topList
 * @param callbackFn
 */
function getUserTopList(userUid, topList, isAll, callbackFn) {
    var sql = "SELECT * FROM pvptop WHERE top IN(?)";
    var rk = isAll ? (isAll == 2 ? "loginDB" : "crossDB") : "game";//210
    if (topList.length == 0) {
        callbackFn(null, null);
    } else {
        mysql[rk](userUid).query(sql, [topList], function (err, res) {
            if (err) {
                callbackFn(err, null);
            } else {
                if (res == null || res.length == 0) {
                    callbackFn(null, null);
                } else {
                    callbackFn(null, res);
                }
            }
        });
    }
}

/**
 * 取玩家的显示信息，(用于PVP排行的显示，信息不全) 残章部分也使用
 * @param userUid
 * @param callbackFn
 */
function getPvpUserInfo(userUid, callbackFn) {
    user.getUser(userUid, function (err, res) {
        if (err || res == null) {
            callbackFn(err);
        } else {
            var leagueUid = res["leagueUid"];
            var userLevel = res["lv"];
            var userName = res["userName"];
            leagueDragon.getDragon(userUid, leagueUid, function (err, res) {
                if (err) {
                    callbackFn(err);
                } else {
                    var dragonData = res;
                    formation.getUserFormation(userUid, function (err, res) {
                        if (err) {
                            callbackFn(err);
                        } else {
                            var mFormation = res;
                            hero.getHero(userUid, function (err, res) {
                                if (err) {
                                    callbackFn(err);
                                } else {
                                    var heroIdList = [];
                                    for (var key in mFormation) {
                                        var mHeroUid = mFormation[key]["heroUid"];
                                        var mHeroId = (res[mHeroUid] != null) ? res[mHeroUid]["heroId"] : null;
                                        heroIdList.push(mHeroId);
                                    }
                                    var mData = {};
                                    mData["userName"] = userName;
                                    mData["userLevel"] = userLevel;
                                    mData["userUid"] = userUid;
                                    mData["heroIdList"] = heroIdList;
                                    mData["dragonData"] = dragonData;
                                    callbackFn(null, mData);
                                }
                            });
                        }
                    });
                }
            });
        }
    });
}
function refreshCurrentPoint(userUid, top, callbackFn) {
    var pointInfo = {};
    var configData = configManager.createConfig(userUid);
    var sTime;
    async.series([
        function (callback) { //获取总积分
            getUserData(userUid, function (err, res) {
                pointInfo = res["arg"];
                sTime = res["dataTime"];
                callback(err);
            });
        },
        function (callback) {
            var deadLine = sTime + 60 * 60 * 24 * 2;
            var now;
            if (jutil.now() > deadLine) {
                now = deadLine;
            } else {
                now = jutil.now();
            }
            var pastTime = now - parseInt(pointInfo["time"]);
            var pvpRankConfig = configData.getConfig("pvpRankCross");
            var rankRewardPoint = pvpRankConfig["rankRewardPoint"];
            var rankItem;
            for (var key in rankRewardPoint) {
                var item = rankRewardPoint[key];
                if (top >= item["highestRank"] && top <= item["lowestRank"]) {
                    rankItem = item;
                    break;
                }
            }
            var pastTimeByRewardTime = Math.floor(pastTime / pvpRankConfig["pointRewardTime"]);
            var pureValue = (pointInfo["value"] - 0) + pastTimeByRewardTime * rankItem["reward"] - 0;
            pointInfo["value"] = pureValue;
            pointInfo["time"] = now;
            callback();
        },
        function (callback) {
            var newData = {"arg": JSON.stringify(pointInfo)};
            setUserData(userUid, newData, callback);
        }
    ], function (err, res) {
        callbackFn(err, res);
    })
}
/**
 * 调换两个玩家的排名
 * @param aTop A 玩家排名
 * @param bTop B 玩家排名
 * @param callbackFn
 */
function changeRank(userUid, aTop, bTop, isAll, key, callbackFn) {
    var aTopData;
    var bTopData;
    var rk = isAll ? (isAll == 2 ? "loginDB" : "crossDB") : "game";//210
    async.series([function (cb) {
        getTopUser(userUid, aTop, isAll, function (err, res) {
            aTopData = res;
            cb(err, res);
        });
    }, function (cb) {
        getTopUser(userUid, bTop, isAll, function (err, res) {
            bTopData = res;
            cb(err, res);
        });
    }, function (cb) {
        var aNewTopData = {"userUid": bTopData["userUid"], "robot": bTopData["robot"]};
        var aSql = "UPDATE pvptop SET ? WHERE top=" + aTopData["top"];
        mysql[rk](userUid).query(aSql, aNewTopData, cb);
    }, function (cb) {
        var bNewTopData = {"userUid": aTopData["userUid"], "robot": aTopData["robot"]};
        var bSql = "UPDATE pvptop SET ? WHERE top=" + bTopData["top"];
        mysql[rk](userUid).query(bSql, bNewTopData, cb);
    }], function (err, res) {
        if (!err) {
            if (aTop > bTop) {
                addPvpResult(aTopData["userUid"], bTopData["userUid"], key);
            } else {
                addPvpResult(bTopData["userUid"], aTopData["userUid"], key);
            }
        }
        callbackFn(err, res);
    });
}


/**
 * 写入一成功挑战记录
 * @param challengerUserUid 挑战者uid
 * @param byUserUid 被挑战者uid
 */
function addPvpResult(challengerUserUid, byUserUid, key) {
    var redisKey = getRedisKey(TAG, key, byUserUid, "byChallengerCross");
    if (byUserUid > 10000 && challengerUserUid > 10000) { //如果打的是机器人就不处理
        redis.user(byUserUid).l(redisKey).leftPush(challengerUserUid, function (err, res) {
            redis.user(byUserUid).l(redisKey).trim(0, 9);
            redis.user(byUserUid).l(redisKey).expire(2592000);
        });
    }
}

function getRedisKey(name, key, userUid, subName) {
    return jutil.formatString("{0}:{1}:{2}:{3}", [name, key, userUid, subName]);
}

function resetMysqlTable(country, city, isAll, callback) {
    var rk = isAll ? (isAll == 2 ? "loginDB" : "crossDB") : "game";//210
    var fakeUserUid = bitUtil.createUserUid(country, city, 1);
    var targetFile = "../../config/" + "rank.sql";
    var sql = fs.readFileSync(targetFile, "utf-8");
    mysql[rk](fakeUserUid).query(sql, function (err, res) {
        if (err) {
            callback(err, null);
        } else {
            if (res == null || res.length == 0) {
                callback(null, null);
            } else {
                callback(null, res[0]);
            }
        }
    });
}

/**
 * 取可反击的列表
 * @param userUid
 * @param callbackFn LRANGE
 */
function getCounterList(userUid, key, callbackFn) {
    var redisKey = getRedisKey(TAG, key, userUid, "byChallengerCross");
    redis.user(userUid).l(redisKey).range(0, 9, function (err, res) {
        callbackFn(err, res);
    });
}

function getUserData(userUid, callBack) {
    var sTime;
    var eTime;
    var isAll;
    var key;
    var returnData = {
        "data": 0,
        "dataTime": 0,
        "status": 0,
        "statusTime": 0,
        "arg": {"value": 0, "time": jutil.now(), "challenge": {"value": 10, "time": jutil.now()}}
    };
    async.series([function (cb) {
        getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                sTime = res[0];
                eTime = res[1];
                isAll = parseInt(res[2]["isAll"]) || 0;
                key = res[2]["key"] || "1";
                cb(null);
            }
        });
    }, function (cb) {
        activityData.getActivityData(userUid, activityData.PVPTOPCROSS, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res["dataTime"] == sTime) {
                    returnData["data"] = parseInt(res["data"]);
                    returnData["dataTime"] = parseInt(res["dataTime"]);
                    returnData["status"] = parseInt(res["status"]);
                    returnData["statusTime"] = parseInt(res["statusTime"]);
                    try {
                        var json = JSON.parse(res["arg"]);
                    } catch (e) {
                        json = {"value": 0, "time": jutil.now(), "challenge": {"value": 10, "time": jutil.now()}};
                    } finally {
                        returnData["arg"] = json;
                    }
                    cb();
                } else {
                    returnData["dataTime"] = sTime;
                    returnData["statusTime"] = eTime;
                    var tmpObj = returnData["arg"];
                    returnData["arg"] = JSON.stringify(tmpObj);
                    activityData.updateActivityData(userUid, activityData.PVPTOPCROSS, returnData, function (err, res) {
                        returnData["arg"] = tmpObj;
                        cb(err);
                    });
                }
            }
        });
    }], function (err, res) {
        callBack(err, returnData);
    });
}

function setUserData(userUid, data, callBack, noRefreshRank) {
    var sTime;
    var eTime;
    var isAll;
    var key;
    async.series([function (cb) {
        getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                sTime = res[0];
                eTime = res[1];
                isAll = parseInt(res[2]["isAll"]) || 0;
                key = res[2]["key"] || "1";
                cb(null);
            }
        });
    }, function (cb) {
        data["dataTime"] = sTime;
        data["statusTime"] = eTime;
        activityData.updateActivityData(userUid, activityData.PVPTOPCROSS, data, cb);
    }, function (cb) {
        // 是否需要刷新排行榜
        if (data.hasOwnProperty("arg") && noRefreshRank == undefined) {
            var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";
            var time = eTime - jutil.now();
            var tmpObj = JSON.parse(data["arg"]);
            if (tmpObj["value"] >= 2000) {
                var number = bitUtil.leftShift(tmpObj["value"], 24) + time;
                redis[rk](userUid).z(TAG + ":topList:" + key).add(number, userUid, cb);
            } else {
                cb();
            }
        } else {
            cb();
        }
    }], function (err, res) {
        callBack(err);
    });
}

function getChallengeTimes(userUid, callBack) {
    var data;
    var challenge;
    var needUpdate = false;
    var sTime;
    async.series([function (cb) {
        getUserData(userUid, function (err, res) {
            data = res;
            sTime = data["dataTime"];
            cb(err);
        });
    }, function (cb) {
        challenge = data["arg"]["challenge"];
        if (jutil.compTimeDay(challenge["time"], jutil.now()) || jutil.now() > sTime + 60 * 60 * 24 * 2) {
            needUpdate = false;
        } else {
            challenge["value"] += 10;
            challenge["time"] = jutil.now();
            needUpdate = true;
        }
        cb();
    }, function (cb) {
        if (needUpdate) {
            data["arg"]["challenge"] = challenge;
            var newData = {"arg": JSON.stringify(data["arg"])};
            setUserData(userUid, newData, cb, true);
        } else {
            cb();
        }
    }], function (err, res) {
        callBack(err, challenge);
    });
}

function setChallengeTimes(userUid, challenge, callBack) {
    var data;
    var sTime;
    async.series([function (cb) {
        getUserData(userUid, function (err, res) {
            data = res;
            sTime = data["dataTime"];
            cb(err);
        });
    }, function (cb) {
        if (jutil.compTimeDay(challenge["time"], jutil.now()) || jutil.now() > sTime + 60 * 60 * 24 * 2) {
            //
        } else {
            challenge["value"] += 10;
            challenge["time"] = jutil.now();
        }
        cb();
    }, function (cb) {
        data["arg"]["challenge"] = challenge;
        var newData = {"arg": JSON.stringify(data["arg"])};
        setUserData(userUid, newData, cb, true);
    }], function (err, res) {
        callBack(err, res);
    });
}

function getRewardStatus(userUid, callbackFn) {
    getUserData(userUid, function (err, res) {
        callbackFn(err, res["status"]);
    });
}

function setRewardStatus(userUid, callbackFn) {
    var newData = {"status": 1};
    setUserData(userUid, newData, callbackFn, true);
}

function getCurrentPoint(userUid, isAll, callBack) {
    var userUid = userUid;
    var pointInfo = {};   //积分信息
    var currentUserTop;
    var configData = configManager.createConfig(userUid);
    var sTime;
    async.series([
        function (callback) { ///取用户当前排名
            getUserTop(userUid, isAll, function (err, res) {
                if (err || res == null) {
                    callback();
                } else {
                    currentUserTop = res;
                    callback();
                }
            });
        },
        function (callback) { //获取总积分
            getUserData(userUid, function (err, res) {
                pointInfo = res["arg"];
                sTime = res["dataTime"];
                callback(err);
            });
        },
        function (callback) {
            var deadLine = sTime + 60 * 60 * 24 * 2;
            var now;
            if (jutil.now() > deadLine) {
                now = deadLine;
            } else {
                now = jutil.now();
            }
            var pastTime = now - parseInt(pointInfo["time"]);
            var pvpRankConfig = configData.getConfig("pvpRankCross");
            var rankRewardPoint = pvpRankConfig["rankRewardPoint"];
            var rankItem;
            for (var key in rankRewardPoint) {
                var item = rankRewardPoint[key];
                if (currentUserTop["top"] >= item["highestRank"] && currentUserTop["top"] <= item["lowestRank"]) {
                    rankItem = item;
                    break;
                }
            }
            var pastTimeByRewardTime = Math.floor(pastTime / pvpRankConfig["pointRewardTime"]);
            var pureValue = (pointInfo["value"] - 0) + pastTimeByRewardTime * rankItem["reward"];
            pointInfo["value"] = pureValue;
            pointInfo["time"] = (pointInfo["time"] - 0) + pastTimeByRewardTime * pvpRankConfig["pointRewardTime"];
            callback();
        },
        function (callback) {
            var newData = {"arg": JSON.stringify(pointInfo)};
            setUserData(userUid, newData, callback);
        }
    ], function (err) {
        callBack(err, pointInfo);
    });
}

function getUserListDetailed(userUid, userTopList, callbackFn) {
    var topInfoList = [];
    async.forEach(userTopList, function (item, forCb) {
        var topUserUid = item["userUid"];
        var configData = configManager.createConfig(userUid);
        var isRobot = item["robot"];
        if (isRobot == 1) {
            var pvpRankFakeDataConfig = configData.getConfig("pvpRankFakeData");
            var pvpRankFakeDataConfigItem = pvpRankFakeDataConfig[topUserUid];
            var userInfo = {};
            userInfo["top"] = item["top"];
            userInfo["robot"] = item["robot"];
            userInfo["userName"] = jutil.toBase64(pvpRankFakeDataConfigItem["playerName"]);
            userInfo["userLevel"] = pvpRankFakeDataConfigItem["playerLevel"];
            userInfo["userUid"] = topUserUid;
            userInfo["heroIdList"] = pvpRankFakeDataConfigItem["heros"];
            topInfoList.push(userInfo);
            forCb(null);
        } else {
            getPvpUserInfo(topUserUid, function (err, res) {
                if (err) {
                    forCb("dbError");
                } else {
                    var userInfo = res;
                    userInfo["top"] = item["top"];
                    userInfo["robot"] = item["robot"];
                    topInfoList.push(userInfo);
                    forCb(null);
                }
            });
        }
    }, function (err) {
        callbackFn(err, topInfoList);
    });
}
/**
 * 获取当前可以领奖的任务
 * @param userUid
 */
function getTopTaskReward(userUid, callBack) {
    userVariable.getVariable(userUid, "pvpTaskRewardCross", callBack);
}
/**
 * 获取当前用户历史最高
 * @param userUid
 */
function getHighest(userUid, callBack) {
    userVariable.getVariable(userUid, "pvpHighestCross", callBack);
}

/**
 * 返回PVP的阵容信息
 * @param userUid   玩家uid
 * @param callbackFn
 */
function getPvpTopFormation(userUid, callbackFn) {
    var userInfo = null;
    var formationInfo = null;
    var heroInfo = null;
    var equipInfo = null;
    var skillInfo = null;
    var cardInfo = null;
    var integrationInfo = null;
    var specialTeamInfo = null;
    var leagueUid = 0;
    var dragonData = null;
    var equipPicked = null;
    var columnPicked = null;
    var starData = null;
    async.series([
        function (cb) {
            user.getUser(userUid, function (err, res) {
                if (err || res == null) {
                    cb("dbError");
                } else {
                    leagueUid = res["leagueUid"];
                    userInfo = {"userName": res["userName"], "level": res["lv"]};
                    cb(null);
                }
            });
        },
        function (cb) {
            leagueDragon.getDragon(userUid, leagueUid, function (err, res) {
                dragonData = res;
                cb(err);
            });
        },
        function (cb) {
            upStar.getStarData(userUid, function (err, res) {
                starData = res;
                cb(err);
            });
        },
        function (cb) {
            formation.getUserFormation(userUid, function (err, res) {
                formationInfo = res;
                cb(err);
            });
        },
        function (cb) {
            specialTeam.get(userUid, function (err, res) {
                specialTeamInfo = res;
                cb(err);
            });
        },
        function (cb) {
            hero.getHero(userUid, function (err, res) {
                if (err) {
                    cb("dbError");
                } else {
                    var heroes = res;
                    heroInfo = {};
                    for (var key in formationInfo) {//加入在阵位上的伙伴
                        var heroUid = formationInfo[key]["heroUid"];
                        if (heroUid != null && heroes[heroUid] != null) {
                            heroInfo[heroUid] = heroes[heroUid];
                        }
                    }
                    for (var key in specialTeamInfo) {//加入在特战队上的伙伴
                        var heroUid = specialTeamInfo[key]["heroUid"];
                        if (heroUid != null && heroes[heroUid] != null) {
                            heroInfo[heroUid] = heroes[heroUid];
                        }
                    }
                    cb(null);
                }
            });
        },
        function (cb) {
            catalystData.getPickedColumns(userUid, function (err, res) {
                equipPicked = res ? res : {};
                cb(err);
            });
        },
        function (cb) {
            equipment.getEquipment(userUid, function (err, res) {
                if (err) {
                    cb("dbError");
                } else {
                    var equips = res;
                    //组织洗练属性
                    for (var uid in equips) {
                        if (equipPicked.hasOwnProperty(uid)) {
                            columnPicked = equipPicked[uid];
                            var propertyUpgraded = {};
                            for (var k in columnPicked) {
                                k = columnPicked[k];
                                propertyUpgraded[k] = equips[uid][k];
                            }
                            equips[uid]["equipAddValue"] = propertyUpgraded;
                        } else {
                            equips[uid]["equipAddValue"] = {};
                        }
                    }
                    equipInfo = {};
                    for (var key in formationInfo) {
                        for (var i = 1; i <= 3; i++) {
                            var equipUid = formationInfo[key]["equip" + i];
                            if (equipUid != null && equipUid != 0 && equips[equipUid] != null) {
                                equipInfo[equipUid] = equips[equipUid];
                            }
                        }
                    }
                    cb(null);
                }
            });
        },
        function (cb) {
            skill.getSkill(userUid, function (err, res) {
                if (err) {
                    cb("dbError");
                } else {
                    var skills = res;
                    skillInfo = {};
                    for (var key in formationInfo) {
                        for (var i = 1; i <= 3; i++) {
                            var skillUid = formationInfo[key]["skill" + i];
                            if (skillUid != null && skills[skillUid] != null) {
                                skillInfo[skillUid] = skills[skillUid];
                            }
                        }
                    }
                    cb(null);
                }
            });
        },
        function (cb) {
            card.getCardList(userUid, function (err, res) {
                if (err) {
                    cb("dbError");
                } else {
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
                    cb(null);
                }
            });
        },
        function (cb) {
            fuse.getFuse(userUid, function (err, res) {
                integrationInfo = res;
                cb(err);
            });
        }
    ], function (err) {
        var PvpTopFormation = {
            "userInfo": userInfo,
            "formation": formationInfo,
            "hero": heroInfo,
            "equip": equipInfo,
            "skill": skillInfo,
            "card": cardInfo,
            "integrationData": integrationInfo,
            "dragonData": dragonData,
            "starData": starData,
            "specialTeam": specialTeamInfo
        };
        callbackFn(err, PvpTopFormation);
    });
}

/**
 * 返回排名前的玩家
 * @param callbackFn
 */
function getTop10(userUid, isAll, callbackFn) {
    var sql = "SELECT * FROM pvptop WHERE top<=10";
    var rk = isAll ? (isAll == 2 ? "loginDB" : "crossDB") : "game";//210
    mysql[rk](userUid).query(sql, function (err, res) {
        if (err) {
            callbackFn(err);
        } else {
            var resList = res;
            getUserListDetailed(userUid, resList, function (err, res) {
                callbackFn(err, res);
            });
        }
    });
}

function getTopLimit(country, city, limit, isAll, callbackFn) {
    var sql = "SELECT * FROM pvptop WHERE top<=" + limit + " ORDER BY top";
    var rk = isAll ? (isAll == 2 ? "loginDB" : "crossDB") : "game";//210
    mysql[rk](null, country, city).query(sql, function (err, res) {
        callbackFn(err, res);
    });
}

function getRankList(userUid, isAll, key, currentConfig, top, callbackFn) {
    var rankList = [];
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";
    redis[rk](userUid).z(TAG + ":topList:" + key).revrange(0, top, "WITHSCORES", function (err, res) {
        if (res && res.length > 0) {
            var c = 0;
            var userUid;
            var userScore;
            var userName;
            var heroId;
            var reward;
            async.eachSeries(res, function (item, rankCb) {
                c++;
                if (c % 2 == 0) {
                    var top = c / 2;
                    var number = bitUtil.rightShift(item - 0, 24);
                    userScore = number;
                    async.series([function (selectCb) {
                        user.getUserDataFiled(userUid, "userName", function (err, res) {
                            userName = res;
                            selectCb(err);
                        });
                    }, function (selectCb) {
                        formation.getUserHeroId(userUid, function (err, res) {
                            heroId = res;
                            selectCb(err);
                        });
                    }, function (selectCb) {
                        //獎勵配置格式參考累計充值 BY:運營
                        for (var i in currentConfig["rankRewardList"]) {
                            if (top == currentConfig["rankRewardList"][i]["top"]) {
                                reward = currentConfig["rankRewardList"][i]["reward"];
                                break;
                            }
                        }
                        selectCb();
                    }], function (err, res) {
                        rankList.push(jutil.deepCopy({
                            "userUid": userUid,
                            "userName": userName,
                            "number": userScore,
                            "heroId": heroId,
                            "top": top,
                            "reward": reward
                        }));
                        rankCb(err);
                    });
                } else {
                    userUid = item;
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

function getRankListWithoutScore(userUid, isAll, key, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";
    redis[rk](userUid).z(TAG + ":topList:" + key).revrangeRev(0, 1000, callbackFn);
}

function getRank(userUid, isAll, key, callbackFn) {
    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";
    redis[rk](userUid).z(TAG + ":topList:" + key).revrank(userUid, callbackFn);
}

function lock(userUid, top, isAll, callback) {
    var data = {"lockTime": jutil.now() + 5};
    var sql = "UPDATE pvptop SET ? WHERE top=" + top;
    var rk = isAll ? (isAll == 2 ? "loginDB" : "crossDB") : "game";//210
    mysql[rk](userUid).query(sql, data, callback);
}

function unLock(userUid, top, isAll, callback) {
    var data = {"lockTime": 0};
    var sql = "UPDATE pvptop SET ? WHERE top=" + top;
    var rk = isAll ? (isAll == 2 ? "loginDB" : "crossDB") : "game";//210
    mysql[rk](userUid).query(sql, data, callback);
}

exports.addNewUser = addNewUser;
exports.getTopUser = getTopUser;
exports.getUserTop = getUserTop;
exports.getUserTopList = getUserTopList;
exports.getPvpUserInfo = getPvpUserInfo;
exports.getCounterList = getCounterList;
exports.getTop10 = getTop10;
exports.changeRank = changeRank;
exports.getCurrentPoint = getCurrentPoint;
exports.getHighest = getHighest;
exports.getTopTaskReward = getTopTaskReward;
exports.getPvpTopFormation = getPvpTopFormation;
exports.refreshCurrentPoint = refreshCurrentPoint;
exports.getTopLimit = getTopLimit;
exports.lock = lock;
exports.unLock = unLock;
exports.getConfig = getConfig;
exports.getUserData = getUserData;
exports.setUserData = setUserData;
exports.getRankList = getRankList;
exports.getRank = getRank;
exports.setChallengeTimes = setChallengeTimes;
exports.getChallengeTimes = getChallengeTimes;
exports.getRewardStatus = getRewardStatus;
exports.setRewardStatus = setRewardStatus;
exports.resetMysqlTable = resetMysqlTable;
exports.getRankListWithoutScore = getRankListWithoutScore;