/**
 * 排行榜数据处理层
 * User: liyuluan
 * Date: 13-11-11
 * Time: 下午4:12
 */

var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var user = require("../model/user");
var formation = require("../model/formation");
var hero = require("../model/hero");
var equipment = require("../model/equipment");
var skill = require("../model/skill");
var card = require("../model/card");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var async = require("async");
var userVariable = require("../model/userVariable");
var item = require("../model/item");
var jutil = require("../utils/jutil");
var fuse = require("../model/fuse");
var specialTeam = require("../model/specialTeam");
var title = require("../model/titleModel");
var leagueDragon = require("../model/leagueDragon");
var catalystData = require("../model/catalystData");
var upStar = require("../model/upStar");
var upStarEquip = require("../model/upStarEquip");
var upStarEquipRefine = require("../model/upStarEquipRefine");

/**
 * @param userUid 用户ID
 * @param robot 是否机器人
 */
function addNewUser(userUid, robot, callbackFn) {
    var serverSql = "SELECT MAX(top) AS top FROM pvptop";
    mysql.game(userUid).query(serverSql, function (err, res) {
        if (err || res == null) callbackFn(err, null);
        else {
            var newTop = 1;
            if (res[0]["top"] != null) newTop = res[0]["top"] - 0 + 1;
            var insertSql = "INSERT INTO pvptop SET ?";
            var insertData = {"top": newTop, "userUid": userUid, "robot": robot};
            mysql.game(userUid).query(insertSql, insertData, function (err, res) {
                if (err) callbackFn(err, null);
                else {
                    callbackFn(null, insertData);
                }
            });
        }
    });
}


/**
 * 取排名在某个位置的用户信息
 * @param top
 * @param callback
 */
function getTopUser(userUid, top, callback) {
    var sql = "SELECT * FROM pvptop WHERE top=" + mysql.escape(top);
    mysql.game(userUid).query(sql, function (err, res) {
        if (err) callback(err, null);
        else {
            if (res == null || res.length == 0) callback(null, null);
            else {
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
function getUserTop(userUid, callbackFn) {
    var sql = "SELECT * FROM pvptop WHERE userUid=" + mysql.escape(userUid) + " AND robot=0";
    mysql.game(userUid).query(sql, function (err, res) {
        if (err) callbackFn(err, null);
        else {
            if (res == null || res.length == 0) callbackFn(null, null);
            else {
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
function getUserTopList(userUid, topList, callbackFn) {
    var sql = "SELECT * FROM pvptop WHERE top IN(?)";
    if (topList.length == 0) {
        callbackFn(null, null);
    } else {
//        sql = mysql.getDB().format(sql,[topList]);
        mysql.game(userUid).query(sql, [topList], function (err, res) {
            if (err) callbackFn(err, null);
            else {
                if (res == null || res.length == 0) callbackFn(null, null);
                else {
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
//    redis.game(userUid).getObj("pvpUser:" + userUid,
    var configData = configManager.createConfig(userUid);
    redis.user(userUid).s("pvpUser").getObj(function (err, res) {
        if (err) {
            console.error(userUid, err.stack);
            callbackFn(err, null);
        } else if (res != null) {
            callbackFn(null, res);
        } else {
            user.getUser(userUid, function (err, res) {
                if (err || res == null) {
                    if (err) console.error(userUid, err.stack);
                    callbackFn(err, null);
                } else {
                    var leagueUid = res["leagueUid"];
                    //var userExp = res["exp"] - 0;
                    var userLevel = res["lv"];
                    var userName = res["userName"];
                    leagueDragon.getDragon(userUid, leagueUid, function(err, res){
                        if (err) {
                            console.error(userUid, err.stack);
                            callbackFn(err, null);
                        } else {
                            var dragonData = res;
                            formation.getUserFormation(userUid, function (err, res) {
                                if (err) {
                                    console.error(userUid, err.stack);
                                    callbackFn(err, null);
                                } else {
                                    var mFormation = res;
                                    hero.getHero(userUid, function (err, res) {
                                        if (err) {
                                            console.error(userUid, err.stack);
                                            callbackFn(err, null);
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
//                                    redis.game(userUid).setObj("pvpUser:" + userUid,
                                            redis.user(userUid).s("pvpUser").setObj(mData, function (err, res) {
                                                if (err) console(mData, err.stack);

                                                redis.user(userUid).s("pvpUser").expire(604800);//7天有效期
                                                callbackFn(null, mData);
                                            }); //pvpUser: 会在formation 中编队信息变更时被清除
                                        }//if
                                    });//hero.getHero
                                }//if
                            });//formation.getUserFormation
                        }
                    });
                }//if
            });//user.getUser
        }
    });
}
function refreshCurrentPoint(userUid , top , callbackFn) {
    var pointInfo = {};
    var configData = configManager.createConfig(userUid);
    async.series([
        function(callback){ //获取总积分
            userVariable.getVariableTime(userUid,"redeemPoint",function(err,res){
                if(err){
                    callback(err);
                }else{
                    if(res == null){
                        pointInfo["value"] = 0;
                        pointInfo["time"] = jutil.now();
                    }else{
                        pointInfo = res;
                    }
                    callback(null);
                }
            });
        },
        function(callback){
            var pvpRankConfig = configData.getConfig("pvpRank");
            var rankRewardPoint = pvpRankConfig["rankRewardPoint"];
            var rankItem;
            for(var key in rankRewardPoint){
                var item = rankRewardPoint[key];
                if(top >= item["highestRank"] && top <= item["lowestRank"]){
                    rankItem = item;
                    break;
                }
            }
            var pastTime = jutil.now() - (pointInfo["time"] - 0);
            var pastTimeByRewardTime = Math.floor(pastTime / pvpRankConfig["pointRewardTime"]);
            var pureValue = (pointInfo["value"] - 0) + pastTimeByRewardTime * rankItem["reward"] - 0;
            pointInfo["value"] = pureValue;
            pointInfo["time"] = jutil.now();
            callback(null);
        },
        function(callback){
            userVariable.setVariableTime(userUid,"redeemPoint",pointInfo["value"],pointInfo["time"],function(err,res){
                if(err){
                    callback(err);
                }else{
                    callback(null);
                }
            });
        }
    ],function(err , res) {
        if(err) {
            callbackFn(err,null);
        } else {
            callbackFn(null,res)
        }
    })
}
/**
 * 调换两个玩家的排名
 * @param aTop A 玩家排名
 * @param bTop B 玩家排名
 * @param callbackFn
 */
function changeRank(userUid, aTop, bTop, callbackFn) {
    getTopUser(userUid, aTop, function (err, res) {
        if (err || res == null) callbackFn(err, null);
        else {
            var aTopData = res;
            getTopUser(userUid, bTop, function (err, res) {
                if (err || res == null) callbackFn(err, null);
                else {
                    var bTopData = res;

                    // ADD BY LXB
                    title.pvpRankChange(userUid, bTop, function(){
                        if (bTopData["robot"] === 0) {
                            title.pvpRankChange(bTopData["userUid"], aTop, function(){
                                __innerFunc();
                            });
                        } else {
                            __innerFunc();
                        }
                    });

                    // END

                    var __innerFunc = function(){

                        if (aTop > 50 || bTop > 50) {
                            toTop50(userUid);
                        }

                        var aNewTopData = {"userUid": bTopData["userUid"], "robot": bTopData["robot"]};
                        var bNewTopData = {"userUid": aTopData["userUid"], "robot": aTopData["robot"]};
                        var aSql = "UPDATE pvptop SET ? WHERE top=" + aTopData["top"];
                        var bSql = "UPDATE pvptop SET ? WHERE top=" + bTopData["top"];
                        mysql.game(userUid).query(aSql, aNewTopData, function (err, res) {
                            if (err) callbackFn(err, null);
                            else {
                                mysql.game(userUid).query(bSql, bNewTopData, function (err, res) {
                                    if (err) callbackFn(err, null);
                                    else {
                                        if (aTop > bTop) {
                                            addPvpResult(aTopData["userUid"], bTopData["userUid"]);
                                        } else {
                                            addPvpResult(bTopData["userUid"], aTopData["userUid"]);
                                        }
                                        if (aTop <= 10 || bTop <= 10) {
                                            redis.domain(userUid).s("top10").del();
//                                        redis.game(0).del("top10");
                                        }
                                        callbackFn(null, 1);
                                    }
                                });
                            }
                        });

                    };
                }
            });
        }
    });
}


/**
 * 写入一成功挑战记录
 * @param challengerUserUid 挑战者uid
 * @param byUserUid 被挑战者uid
 */
function addPvpResult(challengerUserUid, byUserUid) {
    if (byUserUid > 10000 && challengerUserUid > 10000) { //如果打的是机器人就不处理
        redis.user(byUserUid).l("bychallenger").leftPush(challengerUserUid, function(err, res){
            redis.user(byUserUid).l("bychallenger").trim(0, 9);
            redis.user(byUserUid).l("bychallenger").expire(2592000);
        });
    }
//    redis.game(0).getClient().lpush("bychallenger:" + byUserUid,challengerUserUid);
//    redis.game(0).getClient().ltrim("bychallenger:" + byUserUid,0,9);
}

/**
 * 取可反击的列表
 * @param userUid
 * @param callbackFn LRANGE
 */
function getCounterList(userUid, callbackFn) {
//    redis.game(0).getClient().lrange("bychallenger:" + userUid,0,9,
    redis.user(userUid).l("bychallenger").range(0, 9, function (err, res) {
        callbackFn(err, res);
    });
}

/**
 * 返回排名前的玩家
 * @param callbackFn
 */
function getTop10(userUid, callbackFn) {
//    redis.game(0).getObj("top10",
    redis.domain(userUid).s("top10").getObj(function (err, res) {
        if (err) callbackFn(err, null);
        else {
            if (res == null) {
                var sql = "SELECT * FROM pvptop WHERE top<=10";
                mysql.game(userUid).query(sql, function (err, res) {
                    if (err) callbackFn(err);
                    else {
                        var resList = res;
                        getUserListDetailed(userUid, resList, function (err, res) {
                            if (err) callbackFn(err);
                            else {
                                var mResult = res;
                                redis.domain(userUid).s("top10").setObj(res, function (err, res) {
                                    callbackFn(null, mResult);
                                });
                            }
                        });
                    }
                });
            } else {
                callbackFn(null, res);
            }
        }
    });
}
function getCurrentPoint(userUid, callBack) {
    var needWriteToDb = false;
    var userUid = userUid;
    var pointInfo = {};   //积分信息
    var currentUserTop;
    var configData = configManager.createConfig(userUid);

    async.series([
        function (callback) { ///取用户当前排名
            getUserTop(userUid, function (err, res) {
                if (err || res == null) {
                    callback(null);
                } else {
                    currentUserTop = res;
                    callback(null);
                }
            })
        },
        function (callback) { //获取总积分
            userVariable.getVariableTime(userUid, "redeemPoint", function (err, res) {
                if (err) {
                    callback(err);
                } else {
                    if (res == null) {
                        pointInfo["value"] = 0;
                        pointInfo["time"] = jutil.now();
                        needWriteToDb = true;
                    } else {
                        pointInfo = res;
                    }
                    callback(null);
                }
            });
        },
        function (callback) {
            var pvpRankConfig = configData.getConfig("pvpRank");
            var rankRewardPoint = pvpRankConfig["rankRewardPoint"];
            var rankItem;
            for (var key in rankRewardPoint) {
                var item = rankRewardPoint[key];
                if (currentUserTop["top"] >= item["highestRank"] && currentUserTop["top"] <= item["lowestRank"]) {
                    rankItem = item;
                    break;
                }
            }
            var pastTime = jutil.now() - (pointInfo["time"] - 0);
            var pastTimeByRewardTime = Math.floor(pastTime / pvpRankConfig["pointRewardTime"]);
            var pureValue = (pointInfo["value"] - 0) + pastTimeByRewardTime * rankItem["reward"];
            pointInfo["value"] = pureValue;
            pointInfo["time"] = (pointInfo["time"] - 0) + pastTimeByRewardTime * pvpRankConfig["pointRewardTime"];
            if (needWriteToDb) {
                userVariable.setVariableTime(userUid, "redeemPoint", pointInfo["value"], pointInfo["time"], function (err, res) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null);
                    }
                });
            } else {
                callback(null);
            }
        }
    ], function (err) {
        if (err) {
            callBack(err, null);
        } else {
            callBack(null, pointInfo);
        }
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
                if (err) forCb("dbError");
                else {
                    var userInfo = res;
                    userInfo["top"] = item["top"];
                    userInfo["robot"] = item["robot"];
                    topInfoList.push(userInfo);
                    forCb(null);
                }
            });
        }
    }, function (err) {
        if (err) callbackFn(err);
        else {
            callbackFn(null, topInfoList);
        }
    });
}
/**
 * 获取当前可以领奖的任务
 * @param userUid
 */
function getTopTaskReward(userUid, callBack) {
    userVariable.getVariable(userUid, "pvpTaskReward", function (err, res) {
        callBack(err, res);
    });
}
/**
 * 获取当前用户历史最高
 * @param userUid
 */
function getHighest(userUid, callBack) {
    userVariable.getVariable(userUid, "pvpHighest", function (err, res) {
        callBack(err, res);
    });
}

/**
 * 返回PVP的阵容信息
 * {
 *      "formation":{1:"formationUid":xx, "heroUid":xx,"skill2":xx,"skill3":xx...},
 *      "hero":{xxx:"heroUid":xxx},                 //只包含上阵的hero
 *      "equipment":{xxx:"equipmentUid":xxx},
 *      "skill":{"xxx":"skillUid":xxx},
 *      "card":{"xxx":"cardUid":xxx}
 * }
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
    var starEquipData = null;
    var starEquipRefineData = null;
    async.series([

        function (cb) {
            user.getUser(userUid, function (err, res) {
                if (err || res == null) cb("dbError");
                else {
                    leagueUid = res["leagueUid"];
                    userInfo = {"userName": res["userName"],"level": res["lv"]};
                    cb(null);
                }
            });
        },
        function (cb) {
            leagueDragon.getDragon(userUid, leagueUid, function (err, res) {
                if (err || res == null) cb("dbError");
                else {
                    dragonData = res;
                    cb(null);
                }
            });
        },
        function (cb) {
            upStar.getStarData(userUid, function (err, res) {
                starData = res;
                cb(err);
            });
        },
        function (cb) {
            upStarEquip.getAddition(userUid, function (err, res) {
                starEquipData = res;
                cb(err);
            });
        },
        function (cb) {
            upStarEquipRefine.getAddition(userUid, function (err, res) {
                starEquipRefineData = res;
                cb(err);
            });
        },
        function (cb) {
            formation.getUserFormation(userUid, function (err, res) {
                if (err || res == null) cb("dbError");
                else {
                    formationInfo = res;
                    cb(null);
                }
            });
        },
        function (cb) {
            specialTeam.get(userUid, function(err,res){
                if(err) cb("dbError");
                else{
                    specialTeamInfo = res;
                    cb(null);
                }
            });
        },
        function (cb) {
            hero.getHero(userUid, function (err, res) {
                if (err) cb("dbError");
                else {
                    var heros = res;
                    heroInfo = {};
                    for (var key in formationInfo) {//加入在阵位上的伙伴
                        var heroUid = formationInfo[key]["heroUid"];
                        if (heroUid != null && heros[heroUid] != null) {
                            heroInfo[heroUid] = heros[heroUid];
                        }
                    }
                    for (var key in specialTeamInfo) {//加入在特战队上的伙伴
                        var heroUid = specialTeamInfo[key]["heroUid"];
                        if (heroUid != null && heros[heroUid] != null) {
                            heroInfo[heroUid] = heros[heroUid];
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
                if (err) cb("dbError");
                else {
                    var equips = res;
                    for (var uid in equips) {
                        //组织洗练属性
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
                        //装备升星加成
                        if (starEquipData.hasOwnProperty(uid)) {
                            equips[uid]["equipStarAddValue"] = starEquipData[uid];
                        } else {
                            equips[uid]["equipStarAddValue"] = {};
                        }
                        //装备精炼加成
                        if (starEquipRefineData.hasOwnProperty(uid)) {
                            equips[uid]["equipStarRefineAddValue"] = starEquipRefineData[uid];
                        } else {
                            equips[uid]["equipStarRefineAddValue"] = {"attack": 0, "defence": 0, "hp": 0, "level": 1};
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
                if (err) cb("dbError");
                else {
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
                    cb(null);
                }
            });
        },
        function (cb) {
            fuse.getFuse(userUid, function (err, res) {
                if (err) cb("dbError");
                else {
                    integrationInfo = res;
                    cb(null);
                }
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


//缓存7天排名前五十
function toTop50(userUid) {
    var mDay = jutil.day();
    redis.domain(userUid).s("pvptop50:" + mDay).exists(function (err, res) {
        if (err) return;
        else {
            if (res == 0) {
                var sql = "SELECT * FROM pvptop WHERE top<=50";
                mysql.game(userUid).query(sql, function (err, res) {
                    if (err) return;
                    else {
                        redis.domain(userUid).s("pvptop50:" + mDay).setObj(res);
                        redis.domain(userUid).s("pvptop50:" + mDay).expire(604800);//缓存7天
                    }
                });
            }
        }
    });
}

//仅用于：设置缓存排行前1000名数据，每天缓存一次
function toTopLimit(country,city,limit,callbackFn) {
    var nowDate = new Date(jutil.nowMillisecond());
    var kDate = nowDate.getFullYear()+""+(nowDate.getMonth()+1)+""+nowDate.getDate()+":"+limit;

    redis.domain(country, city).s("pvptopLimit:" + kDate).exists(function (err, res) {
        if (err) callbackFn(err, null);
        else {
            if (res == 0) {
                var sql = "SELECT * FROM pvptop WHERE top<="+limit+" ORDER BY top";
                mysql.game(null, country, city).query(sql, function (err, res) {
                    if (err) callbackFn(err, null);
                    else {
                        redis.domain(country, city).s("pvptopLimit:" + kDate).setObj(res);
                        redis.domain(country, city).s("pvptopLimit:" + kDate).expire(2592000);//缓存30天
                        callbackFn(null, null);
                    }
                });
            }else{
                callbackFn(null, null);
            }
        }
    });
}
//仅用于：取排行前1000名的数据
function getTopLimit(country,city,limit,callbackFn) {
    var nowDate = new Date(jutil.now() * 1000);
    var kDate = nowDate.getFullYear()+""+(nowDate.getMonth()+1)+""+nowDate.getDate()+":"+limit;
    redis.domain(country, city).s("pvptopLimit:" + kDate).getObj(function (err, res) {
        if (err) callbackFn(err, null);
        else {
            callbackFn(null, res);
        }
    });
}

function lock(userUid, top){
    var data = {"lockTime":jutil.now()+5};
    var sql = "UPDATE pvptop SET ? WHERE top=" + top;
    mysql.game(userUid).query(sql, data, function(){});
}

function unLock(userUid, top){
    var data = {"lockTime":0};
    var sql = "UPDATE pvptop SET ? WHERE top=" + top;
    mysql.game(userUid).query(sql, data, function(){});
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

exports.toTopLimit = toTopLimit;
exports.getTopLimit = getTopLimit;
exports.lock = lock;
exports.unLock = unLock;