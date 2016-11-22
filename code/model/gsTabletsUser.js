/**
 * 神位争夺(跨服战)
 * User: peter.wang
 * Date: 14-11-19
 * Time: 下午3:56
 */
var async = require("async");
var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var bitUtil = require("../alien/db/bitUtil");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var activityConfigModel = require("../model/activityConfig");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");
var user = require("../model/user");
var mail = require("../model/mail");
var pvptop = require("../model/pvptop");
var hero = require("../model/hero");
var formation = require("../model/formation");
var specialTeam = require("../model/specialTeam");
var gsData = require("../model/gsData");
var leagueDragon = require("../model/leagueDragon");


// 检测用户所属区是否已开服7天
function checkUserServerStatus(userUid, callbackFn) {
    gsData.getUserServerInfo(userUid, function (err, res) {
        if (err) callbackFn(err);
        else {
            if ((jutil.now() - res["openTime"]) / 86400 >= 7) {
                callbackFn(null, 1);
            } else {
                callbackFn(null, 0);
            }
        }
    });
}

// 取一个玩家的排名
function getUserTop(userUid, issueId, callbackFn){
    var userTabletsInfo = {};
    var userTop = 0;
    async.series([
        function(cb) {
            getTabletsUser(userUid, issueId, function(err,res){
                if (err) cb(err);
                else {
                    if (res == null) cb("postError");
                    else {
                        userTabletsInfo = [res];
                        cb(null);
                    }
                }
            });
        },
        function(cb) {
            redis.countryForDynamic(userUid).z(_getGSRedisKey(issueId, "gsTabletsUser:topList")).revrank(userUid, function (err, res) {
                if (err) cb(err)
                else if (res == null) {
                    userTop = 0;
                    cb(null);
                } else {
                    userTop = res - 0 + 1;
                    cb(null);
                }
            });
        },
        function(cb) {
            userTabletsInfo[0]["top"] = userTop;
            if(userTop==0)_initRedisTabletsUserData(userUid, issueId,function(err,res){});// 没有找到用户排名，重新初始化
            cb(null);
        },
        function(cb) {
            _getTabletsUserBattleData(userTabletsInfo, issueId, function (err, res) {
                if (err) cb(err);
                else {
                    userTabletsInfo = res[0];
                    cb(null);
                }
            });
        }
    ], function(err, res) {
        callbackFn(err,userTabletsInfo);
    });
}
// 获取指定期Top10玩家数据(排行榜)
function getTopList10(userUid, issueId, callbackFn) {
    redis.countryForDynamic(userUid).z(_getGSRedisKey(issueId, "gsTabletsUser:topList")).revrangeRev(0, 9, function (err, res) {
        if(err) callbackFn(err)
        else if (res == null){
            _initRedisTabletsUserData(userUid, issueId,function(err,res){});
            callbackFn(null, []);
        } else {
            var top = 1;
            var resList = [];
            async.forEachSeries(res, function (recUserUid, callback) {
                getTabletsUser(recUserUid, issueId, function (err, res) {
                    if(err) callback(err)
                    else {
                        res["top"] = top;
                        top++;
                        resList.push(res);
                        callback(null, null);
                    }
                })
            }, function (err, res) {
                if(err) callbackFn(err)
                else {
                    _getTabletsUserBattleData(resList, issueId, function (err, res) {
                        if (err) callbackFn(err);
                        else {
                            callbackFn(null, res);
                        }
                    });
                }
            });
        }
    });
}
// 获取上期Top5玩家数据
function getLastTop5(userUid,callbackFn) {
    gsData.getGSDataStatus2(userUid,gsData.GS_TABLETSCOMPETE,function(err,res){
        if (err) callbackFn(err);
        else {
            if (res == null || JSON.parse(res["data"]).length<5) { // 无上期数据，取配制的默认值放首页
                var configData = configManager.createConfig(userUid);
                var tabletsCompeteConfig = configData.getConfig("tabletsCompete");
                var top5 = tabletsCompeteConfig["rankNpc"];

                var topInfoList = [];
                for (var i in top5) {
                    topInfoList.push({"heroId": top5[i]});
                }

                var cbData = {};
                cbData["default"] = 1;
                cbData["top5"] = topInfoList;
                callbackFn(null, cbData);
            } else {
                var issueId = res["issueId"];
                var top5 = JSON.parse(res["data"]);

                var cbData = {};
                cbData["default"] = 0;
                gsData.getGSDataStatus1(userUid,gsData.GS_TABLETSCOMPETE,function(err,res){
                    if(err) callbackFn(err);
                    else if(res==null){                                        // 无活动，取上期保存数据
                        _getTabletsUserBattleData(top5, issueId, function (err, res) {
                            if (err) callbackFn(err);
                            else {
                                cbData["top5"] = res;
                                callbackFn(null, cbData);
                            }
                        });
                    }else{                                                  // 活动中，取活动中数据
                        var curTop5 = [];
                        var curIssueId = res;
                        async.forEachSeries(top5,function(topUser,forEachFn){
                            getTabletsUser(topUser["userUid"], curIssueId, function (err, res) {
                                if (err) {
                                    topUser["click"] = 0;
                                    topUser["point"] = 0;
                                    curTop5.push(topUser);
                                    forEachFn(err == "NULL" ? null : err);
                                } else {
                                    res["top"] = topUser["top"];
                                    curTop5.push(res);
                                    forEachFn(null);
                                }
                            });
                        },function(err,res){
                            _getTabletsUserBattleData(curTop5, issueId, function (err, res) {
                                if (err) callbackFn(err);
                                else {
                                    cbData["top5"] = res;
                                    callbackFn(null, cbData);
                                }
                            });
                        })
                    }
                });

            }
        }
    });
}
// 获取用户挑战数据
function getTabletsUser(userUid, issueId, callbackFn) {
    redis.user(userUid).h(_getGSRedisKey(issueId,"userBattleInfo")).getObj(function (err, res) {
        if (res == null) {
            var sql = "SELECT * FROM gsTabletsUser WHERE issueId="+mysql.escape(issueId)+" and userUid="+mysql.escape(userUid);
            mysql.loginDBFromUserUid(userUid).query(sql, function (err, res) {
                if (err || res == null || res.length == 0) {
                    callbackFn(err ? err : "NULL", null);
                } else {
                    var userData = res[0];
                    var userName = userData["userName"];
                    var serverName = userData["serverName"];

                    userData["userName"] = jutil.toBase64(userData["userName"]);
                    userData["serverName"] = jutil.toBase64(userData["serverName"]);
                    redis.user(userUid).h(_getGSRedisKey(issueId,"userBattleInfo")).setObj(userData, function (err, res) {
                        redis.user(userUid).h(_getGSRedisKey(issueId,"userBattleInfo")).expire(604800); //缓存90天

                        //userData["userName"] = userName;
                        //userData["serverName"] = serverName;
                        getDefaultTabletsUserRedis(userUid,issueId,userData,function(err,res){
                            callbackFn(err,res);
                        })
                    });
                }
            });
        } else {
            //res["userName"] = jutil.fromBase64(res["userName"]);
            //res["serverName"] = jutil.fromBase64(res["serverName"]);

            getDefaultTabletsUserRedis(userUid,issueId,res,function(err,res){
                callbackFn(err,res);
            })
        }
    });
}
// 初始化每日计数
function getDefaultTabletsUserRedis(userUid, issueId, userData,callbackFn){
    if (jutil.compTimeDay(userData["dailyTimeLastUpdateTime"], jutil.now()) == false) {
        var todayValObj = {};
        todayValObj["dailyTimeLastUpdateTime"] = jutil.now();//今天最后一次更新时间
        todayValObj["dailyBattleTime"] = 0;//今日挑战次数
        todayValObj["dailyWinTime"] = 0;//今日胜利次数
        todayValObj["dailyBuyTime"] = 0;//今日购买次数
        todayValObj["dailyRefreshTime"] = 0;//今日刷新次数
        todayValObj["dailyShopRefreshTime"] = 0;//今日店铺刷新次数
        updateTabletsUser(userUid, issueId,todayValObj,function(err,res){
            if(err) callbackFn(err);
            else{
                userData["dailyTimeLastUpdateTime"] = jutil.now();//今天最后一次更新时间
                userData["dailyBattleTime"] = 0;//今日挑战次数
                userData["dailyWinTime"] = 0;//今日胜利次数
                userData["dailyBuyTime"] = 0;//今日购买次数
                userData["dailyRefreshTime"] = 0;//今日刷新次数
                userData["dailyShopRefreshTime"] = 0;//今日店铺刷新次数
                callbackFn(null,userData)
            }
        })
    }else{
        callbackFn(null,userData)
    }
    return todayValObj;
}

// 添加挑战玩家
function addTabletsUser(userUid, issueId, callbackFn) {
    var serverName = '';
    var userName = '';
    //var exp = '';
    var lv = 0;
    var newAddPoint = -1;//有序集合排序值
    var configData = configManager.createConfig(userUid);
    var rankIni = configData.getConfig("tabletsCompete")["rank"]["RankIni"];
    async.series([
        function (cb) {
            getTabletsUser(userUid, issueId, function (err, res) {
                if (err) {
                    cb(err == "NULL" ? null : err);
                } else {
                    cb("exist");
                }
            })
        },
        function (cb) {
            gsData.getUserServerInfo(userUid, function (err, res) {
                if (err) cb(err)
                else {
                    serverName = res["name"];
                    cb(null);
                }
            })
        },
        function (cb) {
            user.getUser(userUid, function (err, res) {
                if (err) cb(err)
                else {
                    userName = res["userName"];
                    //exp = res["exp"];
                    lv = res["lv"];
                    cb(null);
                }
            });
        },
        function (cb) {
            redis.countryForDynamic(userUid).z(_getGSRedisKey(issueId, "gsTabletsUser:topList")).count("-inf", "+inf", function (err, res) {
                if (err) newAddPoint = 0-1;
                else newAddPoint = 0-res-1;
                cb(null);
            });
//            redis.loginFromUserUid(userUid).s(_getGSRedisKey(issueId, "gsTabletsUser:newAddPoint")).get(function (err, res) {
//                if (err || res == null) {
//                    newAddPoint = -1;
//                    cb(null);
//                }
//                else {
//                    newAddPoint = res;
//                    cb(null);
//                }
//            });
        },
        function (cb) {
            var insertSql = "INSERT INTO gsTabletsUser SET ?";
            var insertData = {
                "issueId": issueId,
                "userUid": userUid,
                "serverName": jutil.fromBase64(serverName),
                "userName": jutil.fromBase64(userName),
                "lv": lv,
                "rank": rankIni,
                "point": 0,
                "pointUpdateTime": jutil.now(),
                "dailyTimeLastUpdateTime": jutil.now()
            };
            mysql.loginDBFromUserUid(userUid).query(insertSql, insertData, function (err, res) {
                if (err) {
                    if (err["code"] == "ER_DUP_ENTRY") cb(null);
                    else cb(err);
                } else {
                    // 写入排名
                    redis.countryForDynamic(userUid).z(_getGSRedisKey(issueId, "gsTabletsUser:topList")).add(newAddPoint, userUid);
                    // 写入rank
                    redis.countryForDynamic(userUid).z(_getGSRedisKey(issueId, "gsTabletsUser:rankList")).add(rankIni, userUid);
                    cb(null);
                }
            });
        }
    ], function (err, res) {
        if (err && err != "exist") {
            callbackFn(err);
        } else {
            callbackFn(null, 1);
        }
    });
}
// 更新挑战玩家数据
function updateTabletsUser(userUid, issueId, newValueData, callbackFn){
    async.series([
        function(cb) {
            redis.user(userUid).h(_getGSRedisKey(issueId,"userBattleInfo")).exists(function(err, res) {
                if (err) cb(err);
                else {
                    if (res == 0) { //如果redis中不存在则同步一次
                        getTabletsUser(userUid, issueId, function(err, res) {
                            cb(err, res);
                        });
                    } else {
                        cb(null);
                    }
                }
            });
        },
        function(cb) {
            var mUserName = newValueData["userName"];
            if (mUserName != null) {
                newValueData["userName"] = jutil.toBase64(mUserName);
            }
            var mServerName = newValueData["serverName"];
            if (mServerName != null) {
                newValueData["mServerName"] = jutil.toBase64(mServerName);
            }
            if(newValueData["point"]!=null) {
                newValueData["pointUpdateTime"] = jutil.now();
            }
//            if (newValueData["dailyBattleTime"] != null || newValueData["dailyWinTime"] != null || newValueData["dailyBuyTime"] != null || newValueData["dailyRefreshTime"] != null || newValueData["dailyShopRefreshTime"] != null){
//                newValueData["dailyTimeLastUpdateTime"] = jutil.now();
//            }
            redis.user(userUid).h(_getGSRedisKey(issueId,"userBattleInfo")).setObj(newValueData, function(err, res) {
                if (err) {
                    cb(err, null);
                } else {
                    redis.user(userUid).h(_getGSRedisKey(issueId,"userBattleInfo")).expire(604800); //重新设置缓存，缓存90天

                    if (mUserName != null) {
                        newValueData["userName"] = mUserName;
                    }
                    if (mUserName != null) {
                        newValueData["serverName"] = mServerName;
                    }
                    var sql = "UPDATE gsTabletsUser SET ? WHERE issueId="+mysql.escape(issueId)+" and userUid="+mysql.escape(userUid);
                    mysql.loginDBFromUserUid(userUid).query(sql, newValueData, function (err, res) {
                        if(err) cb(err);
                        else {
                            if (newValueData["point"] != null) {
                                var sql = "SELECT userUid FROM gsTabletsUser WHERE issueId="+mysql.escape(issueId)+" and point="+mysql.escape(newValueData["point"])+" ORDER BY pointUpdateTime DESC";
                                mysql.loginDBFromUserUid(userUid).query(sql,function(err,res){
                                    if(err) console.log("_________________1",err);
                                    var i = 1;
                                    async.forEachSeries(res,function(row,foreachFn){
                                        redis.countryForDynamic(userUid).z(_getGSRedisKey(issueId, "gsTabletsUser:topList")).add((newValueData["point"] - 0) + (0.0001 * i - 0), row["userUid"], function (err, res) {
                                            i++;
                                            foreachFn(null);
                                        });
                                    },function(err,res){
                                        if(err)console.log("_________________4",err);
                                    })
                                });
                            }
                            if (newValueData["rank"] != null) {
                                redis.countryForDynamic(userUid).z(_getGSRedisKey(issueId, "gsTabletsUser:rankList")).add(newValueData["rank"], userUid);
                            }
                            cb(null);
                        }
                    });
                }
            });
        }
    ], function(err, res) {
        callbackFn(err, 1);
    });
}
// 更新挑战玩家阵容数据
function updateRedisTabletsUserBattleData(userUid, issueId, callbackFn){
    //var leagueUid = 0;
    async.series([//user.get
        function(callbackFn1) {
            formation.getUserHeroId(userUid,callbackFn1)
        },
        function(callbackFn1) {
            pvptop.getPvpTopFormation(userUid, callbackFn1);
        //},
        //function(callbackFn1) {
        //    user.getUser(userUid,function(err, res){
        //        leagueUid = res == null?0:res["leagueUid"];
        //        callbackFn1(err, res);
        //    });
        //},
        //function(callbackFn1) {
        //    leagueDragon.getDragon(userUid,leagueUid,callbackFn1);
        }
//        function(callbackFn1) {
//            formation.getUserFormation(userUid,callbackFn1);
//        },
//        function(callbackFn1) {
//            specialTeam.get(userUid,callbackFn1);
//        }
    ],function(err,res) {
        if(err) callbackFn(err);
        else {
            var mData = {};
            mData["heroId"] = res[0];
            mData["teamInfo"] = res[1];
            //mData["dragonData"] = res[3];

//            var resHeroId = res[0];
//            var resHero = res[1];
//            var resFormation = res[2];
//            var resSpecialTeam = res[3];
//            var mData = {};
//            mData["heroId"] = resHeroId;
//            mData["teamInfo"] = [];
//            mData["userData"] = {};
//            mData["userData"]["hero"] =  resHero;
//            mData["userData"]["formation"] =  resFormation;
//            mData["userData"]["specialTeam"] =  resSpecialTeam;
//
//            var heroIdList = [];
//            for (var key in resFormation) {
//                var mHeroUid = resFormation[key]["heroUid"];
//                var mHeroId = (resHero[mHeroUid] != null) ? resHero[mHeroUid]["heroId"] : null;
//                heroIdList.push(mHeroId);
//            }
//            mData["teamInfo"] = heroIdList;
            redis.user(userUid).s(_getGSRedisKey(issueId,"userBattleData")).setObj(mData,function(err,res){
                if(err) callbackFn(err);
                else{
                    callbackFn(null, mData);
                }
            });
        }
    });
}

// 被挑战玩家阵容
function getRedisBattleData(userUid, issueId, nowUserBattleData, callbackFn) {
    var returnData = {};
    redis.user(userUid).s(_getGSRedisKey(issueId, "userBattleData")).getObj(function (err, res) {
        if (res == null) {
            callbackFn(null, nowUserBattleData);
        } else {
//            var redisHeroList = res["userData"]["hero"];
//            var redisFormationList = res["userData"]["formation"];
            var redisHeroList = res["teamInfo"]["hero"];
            var redisFormationList = res["teamInfo"]["formation"];
            var redisEquipList = res["teamInfo"]["equip"];
            var redisSkillList = res["teamInfo"]["skill"];
            var redisDragonList = res["teamInfo"]["dragonData"];
            var redisStarData = res["teamInfo"]["starData"];

            hero.getHero(userUid, function (err, resHero) {// 验证保存阵形是否还完整
                if (err)  callbackFn(err);
                else {
                    var allHeroExist = true;
                    for (var key in redisFormationList) {
                        var mHeroUid = redisFormationList[key]["heroUid"];
                        if(resHero[mHeroUid] == null){
                            allHeroExist = false;
                            break;
                        }
                    }

                    if(allHeroExist==false){//不齐全用最新的
                        callbackFn(null, nowUserBattleData);
                    }else{
                        nowUserBattleData["heroList"] = redisHeroList;
                        nowUserBattleData["formationList"] = redisFormationList;
                        nowUserBattleData["equipList"] = redisEquipList;
                        nowUserBattleData["skillList"] = redisSkillList;
                        nowUserBattleData["dragonData"] = redisDragonList;
                        nowUserBattleData["starData"] = redisStarData;
                        callbackFn(null, nowUserBattleData);
                    }
                }
            });
        }
    });
}


// 匹配两个可挑战rank玩家
function getTwoMatchUsers(userUid,issueId, callbackFn) {
    var configData = configManager.createConfig(userUid);
    var tabletsCompeteConfig = configData.getConfig("tabletsCompete");

    var matchUsers = [];
    var userRank = 0;
    var winTime = 0;
    async.series([
        function (cb) { //取玩家Rank
            redis.countryForDynamic(userUid).z(_getGSRedisKey(issueId, "gsTabletsUser:rankList")).score(userUid, function (err, res) {
                if (err) cb(err)
                else if (res == null) {
                    getTabletsUser(userUid, issueId, function (err, res) {
                        if (err) cb(err)
                        else {
                            userRank = res["rank"] - 0;
                            cb(null);
                        }
                    });
                } else {
                    userRank = res - 0;
                    cb(null);
                }
            });
        },
        function (cb) { //取玩家连胜值
            redis.user(userUid).s(_getGSRedisKey(issueId, "gsTabletsUser:joinWinTime")).get(function (err, res) {
                if (err) cb(err)
                else {
                    winTime = res - 0;
                    cb(null);
                }
            });
        },
        function (cb) {// 匹配两个可挑战玩家
            redis.countryForDynamic(userUid).z(_getGSRedisKey(issueId, "gsTabletsUser:rankList")).count("-inf", "+inf", function (err, res) {
                if (err) cb(err)
                else {
                    if (res - 0 <= 2) {// 玩家不足，取配制npc
                        //_initRedisTabletsUserData(userUid, issueId,function(err,res){});
                        var npcConfig = tabletsCompeteConfig["npc"];
                        for(var i in npcConfig){
                            var userInfo = {};
                            userInfo["robot"] = 1;
                            userInfo["userUid"] = i-0+1;
                            userInfo["userName"] = jutil.toBase64(npcConfig[i]["userName"]);
                            userInfo["heroId"] = npcConfig[i]["formation"][0];
                            userInfo["teamLv"] = npcConfig[i]["heroLevel"];//userLevel
                            userInfo["teamInfo"] = npcConfig[i]["formation"];//heroIdList
                            matchUsers.push(userInfo);
                        }
                        cb(null);
                    } else {//玩家数多于2个,匹配玩家
                        _getRankMatchUser(userUid, issueId, userRank, res, winTime, winTime, tabletsCompeteConfig, function (err, res) {
                            if (err) cb(err)
                            else {
                                var randomTwoUsers = [];
                                var randomIndex1 = Math.floor(Math.random() * res.length);
                                var randomIndex2 = randomIndex1;
                                while (randomIndex2 == randomIndex1) {
                                    randomIndex2 = Math.floor(Math.random() * res.length);
                                }
                                randomTwoUsers.push(res[randomIndex1]);
                                randomTwoUsers.push(res[randomIndex2]);

                                async.forEach(randomTwoUsers, function (recUserUid, callback) {
                                    getTabletsUser(recUserUid, issueId, function (err, res) {
                                        res["robot"] = 0;// 非机器人
                                        matchUsers.push(res);
                                        callback(null, null);
                                    })
                                }, function (err, res) {
                                    _getTabletsUserBattleData(matchUsers, issueId, function (err, res) {
                                        if (err) cb(err);
                                        else {
                                            matchUsers = res;
                                            cb(null);
                                        }
                                    });
                                });
                            }
                        })
                    }
                }
            });
        }
    ], function (err, res) {
        callbackFn(err, matchUsers);
    });
}

// 点赞
function clickUser(userUid, battleUid, issueId, callbackFn) {
    var checkClickKey = _getGSRedisKey(issueId, "exist:clickUser");
    redis.user(userUid).s(checkClickKey).setnx(battleUid, function (err, res) {
        if (err) callbackFn(err)
        else if (res == 0) {
            redis.user(userUid).s(checkClickKey).get(function (err, res) {
                callbackFn(null, res);
            });
        } else {
            getTabletsUser(battleUid, issueId, function (err, res) {
                if (err) {//点击失败
                    redis.user(userUid).s(checkClickKey).del();
                    callbackFn(err)
                } else {
                    var newValueData = {"click": res["click"] - 0 + 1};
                    updateTabletsUser(battleUid, issueId, newValueData, function (err, res) {
                        if (err) {//点击失败
                            redis.user(userUid).s(checkClickKey).del();
                            callbackFn(err)
                        } else {
                            redis.loginFromUserUid(userUid).l(_getGSRedisKey(issueId, "clickUser:" + battleUid)).rightPush(userUid, function (err, res) {
                                if (err) {//点击失败
                                    redis.user(userUid).s(checkClickKey).del();
                                    callbackFn(err);
                                }else {
                                    callbackFn(err, 1);
                                }
                            });
                        }
                    })
                }
            })
        }
    });
}
// 领取每日奖励
function getDailyReward(userUid, callbackFn) {
    var checkDailyKey = _getGSRedisKey("", "exist:dailyReward:" + jutil.day());
    redis.user(userUid).s(checkDailyKey).setnx(1, function (err, res) {
        if (err) {
            callbackFn(err);
        } else if (res == 0) {
            callbackFn("haveTabletsReceive");// 今日已领取过
        } else {
            redis.user(userUid).l(_getGSRedisKey("", "dailyReward")).range(0, -1, function (err, res) {
                if (res.length == 0) {// 无奖励
                    redis.user(userUid).s(checkDailyKey).del();
                    callbackFn("noTabletsReceive");
                } else {
                    var resultData = [];
                    var rewardList = [];
                    try {
                        rewardList = JSON.parse(res[0])["reward"];
                    } catch (e) {
                        redis.user(userUid).s(checkDailyKey).del();
                        callbackFn("postError");
                        return;
                    }
                    var forEachRes = [];//foreach数据
                    for (var key in rewardList) {
                        forEachRes.push({"id": rewardList[key]["id"], "count": rewardList[key]["count"]})
                    }
                    async.forEach(forEachRes, function (itemDailyReward, forEachCb) {
                        stats.dropStats(itemDailyReward["id"], userUid, '127.0.0.1', null, mongoStats.TABLETSCOMPETE_DAILYREWARD, itemDailyReward["count"]);
                        modelUtil.addDropItemToDB(itemDailyReward["id"], itemDailyReward["count"], userUid, 0, 1, function (err, res) {
                            resultData.push(res);
                            forEachCb(err);
                        });
                    }, function (err, res) {
                        if (err) {//领取失败
                            redis.user(userUid).s(checkDailyKey).del();
                            callbackFn(err);
                        } else {// 领取成功
                            redis.user(userUid).l(_getGSRedisKey("", "dailyReward")).del();
                            callbackFn(null, {"reward": forEachRes, "resultData": resultData});
                        }
                    });
                }
            });
        }
    });
}

// 领取保箱奖励
function getBoxReward(userUid,winTime,callbackFn) {
    var checkBoxKey = _getGSRedisKey("", "exist:boxReward:" + winTime + ":" + jutil.day())
    redis.user(userUid).s(checkBoxKey).setnx(1, function (err, res) {
        if (err) callbackFn(err);
        else if (res == 0) callbackFn("haveTabletsReceive");// 今日已领取过
        else {
            gsData.getActivityConfig(userUid, gsData.GS_TABLETSCOMPETE, function (err, res) {
                var configArray = res;
                if (err) callbackFn(err);
                else if (configArray[0] == false) {  // 当前无此活动(活动未开始，活动已结束)
                    callbackFn("postError");
                } else if (configArray[1] == 0) { // 当前无此活动(活动未开启)
                    callbackFn("postError");
                } else {// 活动进行中...
                    var winTimeReward = configArray[2]["winTimeReward"];
                    if (winTimeReward == null) {
                        redis.user(userUid).s(checkBoxKey).del();
                        callbackFn("cfgError");
                    }else if (winTimeReward[winTime] == null) {
                        redis.user(userUid).s(checkBoxKey).del();
                        callbackFn("postError");
                    }else {
                        var resultData = [];
                        var reward = winTimeReward[winTime];
                        async.forEach(reward, function (item2, forEachCb2) {
                            stats.dropStats(item2["id"], userUid, '127.0.0.1', null, mongoStats.TABLETSCOMPETE_BOXREWARD, item2["count"]);
                            modelUtil.addDropItemToDB(item2["id"], item2["count"], userUid, 0, 1, function (err, res) {
                                resultData.push(res);
                                forEachCb2(err, null);
                            });
                        }, function (err, res) {
                            if (err) {//领取失败
                                redis.user(userUid).s(checkBoxKey).del();
                                callbackFn(err);
                            } else {
                                callbackFn(null, {"reward":reward,"resultData":resultData});
                            }
                        });
                    }
                }
            });
        }
    });
}
// 点赞奖励（登录）
function sendClickReward(userUid, callbackFn) {
    redis.user(userUid).s(_getGSRedisKey("", "clickUser:guess:reward")).getObj(function (err, res) {
        if (err) {
            console.log("sendClickReward:" + err);
            callbackFn(err);
        } else {
            if (res != null) {
                var configData = configManager.createConfig(userUid);
                var mailConfig = configData.getConfig("mail");
                var voteReward = JSON.stringify(res["voteReward"]);
                var message = mailConfig["tabletsClickReward"];
                mail.addMail(userUid, -1, message, voteReward, mongoStats.TABLETSCOMPETE_CLICKREWARD, function (err, res) {
                    if (err)  callbackFn(err);
                    else {// 发放成功，删除redis数据
                        redis.user(userUid).s(_getGSRedisKey("", "clickUser:guess:reward")).del();
                        callbackFn(null);
                    }
                });
            } else {
                callbackFn(null);
            }
            // 触发发放功能
            var mCode = bitUtil.parseUserUid(userUid);
            tabletsTaskDailyReward(mCode[0], function () {
            });
        }
    });
}
// 获取用户领取保箱情况
function userGetBoxStatus(userUid,winTimeReward,callbackFn) {
    var forEachList = [];
    for(var key in winTimeReward){
        forEachList.push(key);
    }

    var userGetBoxStatus = {};
    async.forEachSeries(forEachList,function(winTime,forEachFn){
        var checkBoxKey = _getGSRedisKey("", "exist:boxReward:" + winTime + ":" + jutil.day());
        redis.user(userUid).s(checkBoxKey).exists(function(err,res){
            if(res==1) userGetBoxStatus[winTime] = 1;
            else userGetBoxStatus[winTime] =0;
            forEachFn(null);
        })
    },function(err,res){
        callbackFn(null, userGetBoxStatus)
    })
}

// 发放_神位争夺_每日排名奖励、点赞奖励
function tabletsTaskDailyReward(country, callBackFn) {
    var nowDate = new Date(jutil.now() * 1000);
    var dayFormat = nowDate.getFullYear() + "" + (nowDate.getMonth() + 1) + "" + nowDate.getDate();
    redis.login(country).s(_getGSRedisKey("", "exist:dailyReward:" + dayFormat)).setnx(1, function (err, res) {
        if (err || res == 0) { //已经发放
            callBackFn();
        } else {
            var issueId = 0;
            var top5Data = [];//前5名玩家
            var activityBtime = 0;
            var activityEtime = 0;
            var activityArg = 0;//活动未开启
            var activityConfig = {};
            var userUid = gsData.getDefaultServerUserUid(country);

            async.series([
                function (cb) {// 取活动数据
                    gsData.getActivityConfig(userUid, gsData.GS_TABLETSCOMPETE, function (err, res) {
                        if (err) {
                            cb(err);
                        } else {
                            var configArray = res;
                            activityArg = configArray[1];
                            activityConfig = configArray[2];
                            activityBtime = configArray[4];
                            activityEtime = configArray[5];
                            cb();
                        }
                    });
                },
                function (cb) {// 从表中取出status值为1的期号
                    gsData.getGSDataStatus1(userUid, gsData.GS_TABLETSCOMPETE, function (err, res) {
                        if (err) {
                            cb(err);
                        } else {
                            if (res == null || res == 0) {
                                cb("无发放数据，issueId:" + issueId);
                            } else {
                                issueId = res;
                                cb();
                            }
                        }
                    });
                },
                function (cb) { // 次日开始结算
                    if (jutil.now() > activityBtime && jutil.compTimeDay(activityBtime, jutil.now()) == false) {
                        cb();
                    } else {
                        cb("cannotSettlement");
                    }
                },
                function (cb) {// 如果有,初始化排行
                    _initRedisTabletsUserData(userUid, issueId, function (err, res) {
                        cb(err);
                    });
                },
                function (cb) {// 如果有,以期号取排名榜结算每日奖励
                    if (activityArg == 0) { //活动未启，不结算每日奖励
                        cb();
                    } else {
                        redis.countryForDynamic(userUid).z(_getGSRedisKey(issueId, "gsTabletsUser:topList")).getAllRev(function (err, res) {
                            if (err) {
                                cb(err);
                            } else {
                                var forEachUser = [];
                                for (var key in res) {
                                    if (key - 0 <= 4) {
                                        top5Data.push({"top": key - 0 + 1, "userUid": res[key]});
                                    }
                                    forEachUser.push({"top": key - 0 + 1, "userUid": res[key]});
                                }
                                redis.loginFromUserUid(userUid).s(_getGSRedisKey(issueId, "gsTabletsUser:topList:" + dayFormat)).setObj(forEachUser);
                                redis.loginFromUserUid(userUid).s(_getGSRedisKey(issueId, "gsTabletsUser:topList:" + dayFormat)).expire(1296000);//15天
                                async.forEach(forEachUser, function (item, callback) {
                                    var recTop = item["top"] - 0;
                                    var recUserUid = item["userUid"];
                                    var recDailyReward = [];
                                    var pointRewards = activityConfig["pointRankReward"];//排名奖励
                                    for (var key in pointRewards) {
                                        var itemReward = pointRewards[key];
                                        if ((itemReward["highestRank"] - 0) <= recTop && (itemReward["lowestRank"] - 0) >= recTop) {
                                            recDailyReward = itemReward["reward"];
                                            break;
                                        }
                                    }
                                    // 玩家每日奖励,奖励存入redis（点击领取）
                                    var recRedisValue = {
                                        "issueId": issueId,
                                        "day": dayFormat,
                                        "top": recTop,
                                        "reward": recDailyReward
                                    };
                                    redis.user(recUserUid).l(_getGSRedisKey("", "dailyReward")).rightPush(JSON.stringify(recRedisValue), function (err, res) {
                                        if (jutil.now() >= activityEtime) {//活动结束后，奖励有效期为7天
                                            redis.user(recUserUid).l(_getGSRedisKey("", "dailyReward")).expire(604800);//保存7天
                                        }
                                    });
                                    callback();
                                }, function (err) {
                                    cb();
                                });
                            }
                        });
                    }
                },
                function (cb) {// 如果有,且活动结束，发点赞奖励（点赞奖励：只为用户保留7天）
                    if (jutil.now() >= activityEtime) {
                        var top5DataTmp = [];
                        var top1userUid = 0;
                        var top1Data = {};
                        var top = 1;
                        async.forEachSeries(top5Data, function (item, callback) {
                            getTabletsUser(item["userUid"], issueId, function (err, res) {
                                res["top"] = top;
                                if (res["top"] == 1) {
                                    top1userUid = res["userUid"];
                                    top1Data = res;
                                }
                                var topUser = {};
                                topUser["top"] = res["top"];
                                topUser["issueId"] = res["issueId"];
                                topUser["userUid"] = res["userUid"];
                                topUser["userName"] = res["userName"];
                                topUser["serverName"] = res["serverName"];
                                topUser["lv"] = res["lv"];
                                topUser["click"] = res["click"];
                                topUser["rank"] = res["rank"];
                                topUser["point"] = res["point"];
                                top5DataTmp.push(topUser);
                                top++;
                                callback();
                            })
                        }, function (err, res) {
                            top5Data = top5DataTmp;
                            var redisData = {};
                            redisData["top1user"] = top1Data;
                            redisData["voteReward"] = activityConfig["voteReward"];
                            // 发放点赞奖励（登录领取）
                            redis.loginFromUserUid(userUid).l(_getGSRedisKey(issueId, "clickUser:" + top1userUid)).range(0, -1, function (err, rewardClickUsers) {
                                if (err) {
                                    cb(err);
                                } else {
                                    async.forEach(rewardClickUsers, function (rewardClickUserUid, callback) {
                                        //奖励存入redis
                                        redis.user(rewardClickUserUid).s(_getGSRedisKey("", "clickUser:guess:reward")).setObj(redisData, function (err, res) {
                                            redis.user(rewardClickUserUid).s(_getGSRedisKey("", "clickUser:guess:reward")).expire(604800);//保存7天
                                            callback();
                                        });
                                    }, function (err, res) {
                                        cb();
                                    });
                                }
                            });
                        });
                    } else {
                        cb();
                    }
                },
                function (cb) {// 如果有,且活动结束，更新status为2及top5
                    if (jutil.now() >= activityEtime) {
                        gsData.updateGSDataInfo(userUid, gsData.GS_TABLETSCOMPETE, issueId, {
                            "status": 2,
                            "data": JSON.stringify(top5Data)
                        }, function (err, res) {
                            cb(err);
                        });
                    } else {
                        cb();
                    }
                },
                function (cb) { // 活动结束，处理数据
                    if (jutil.now() >= activityEtime) {
                        redis.loginFromUserUid(userUid).s(_getGSRedisKey("", "IssueId")).del();// 活动结束，清除过期期号
                        cb();
                    } else {
                        cb();
                    }
                }
            ], function (err, res) {
                if (err) {
                    callBackFn();
                } else if (activityArg != 0) { // 开启状态
                    var mCode = bitUtil.parseUserUid(userUid);
                    var curWeek = (new Date(_dayOffset(jutil.now()) * 1000)).getDay();
                    var newActiveityBtime = 0;
                    if (curWeek == 0) {//周末
                        newActiveityBtime = (new Date(_dayOffset(jutil.now()) * 1000)).getTime() / 1000 + 1.5 * 86400;// 12点开始
                    } else {
                        newActiveityBtime = (new Date(_dayOffset(jutil.now()) * 1000)).getTime() / 1000 + 0.5 * 86400;// 12点开始
                    }
                    var newActiveityEtime = (new Date(_dayOffset(jutil.now()) * 1000)).getTime() / 1000 + (8 - curWeek) * 86400;//周末结束
                    var nowTime = _dayOffset(jutil.now());
                    var bTime = _dayOffset(activityBtime);
                    if (issueId == 0 || (nowDate.getDay() == 1 || (nowTime - 7 * 86400) >= bTime)) {//无活动，开启下一轮
                        var newItem = {};
                        newItem["sTime"] = newActiveityBtime;
                        newItem["eTime"] = newActiveityEtime;
                        activityConfigModel.updateConfig(mCode[0], mCode[1], "tabletsCompete", newItem, function (err, res) {
                            redis.loginFromUserUid(userUid).s(_getGSRedisKey("", "IssueId")).del();
                            callBackFn();
                        });
                    } else { // 活动中
                        callBackFn();
                    }

                } else {
                    callBackFn();
                }
            });
        }
    });
}


/*
* rediskey
* */
function _getGSRedisKey(issueId,key){
    return gsData.getGSRedisKey(gsData.GS_TABLETSCOMPETE,issueId,key);
}
/*
 * 匹配可挑战者
 * */
function _getRankMatchUser(userUid,issueId,userRank,count,winTimeMin,winTimeMax,tabletsCompeteConfig,callbackFn) {
    var successiveWinTime = tabletsCompeteConfig["rank"]["successiveWinTime"] - 0;
    var successiveWinAddRank = tabletsCompeteConfig["rank"]["successiveWinAddRank"] - 0;
    var matchRankMin = Math.floor(userRank + (winTimeMin / successiveWinTime) * successiveWinAddRank);
    var matchRankMax = Math.floor(userRank + (winTimeMax / successiveWinTime) * successiveWinAddRank);
    redis.countryForDynamic(userUid).z(_getGSRedisKey(issueId, "gsTabletsUser:rankList")).rangeByScore(matchRankMin, matchRankMax, function (err, res) {
        if (err) callbackFn(err)
        else {
            var matchUsers = [];
            async.series([
                function(cb){
                    if(count==3){
                        matchUsers = _getRankMatchUserByCount(userUid, count, res, null);
                        cb(null);
                    }else if(count==4){
                        redis.user(userUid).s(_getGSRedisKey(issueId, "rankMatchUsers")).getObj(function (err, resMUsers) {
                            if(resMUsers==null){
                                matchUsers = _getRankMatchUserByCount(userUid, -1, res, null);
                            }else{
                                matchUsers = _getRankMatchUserByCount(userUid, count, res, resMUsers);
                            }
                            cb(null);
                        })
                    }else {//排除上次的匹配及自己
                        redis.user(userUid).s(_getGSRedisKey(issueId, "rankMatchUsers")).getObj(function (err, resMUsers) {
                            if(resMUsers==null){
                                matchUsers = _getRankMatchUserByCount(userUid, -1, res, null);
                            }else{
                                matchUsers = _getRankMatchUserByCount(userUid, count, res, resMUsers);
                            }
                            cb(null);
                        })
                    }
                }
            ],function(err,res){
                if (matchUsers.length >= 2) callbackFn(null, matchUsers);
                else _getRankMatchUser(userUid, issueId, userRank, count, winTimeMin - 1, winTimeMax + 1, tabletsCompeteConfig, callbackFn);
            });
        }
    });
}
function _getRankMatchUserByCount(userUid, count, res, resMUsers){
    var matchUsers = [];
    if(count == -1 || count == 3){
        for (var i in res) {
            if (res[i] != userUid) matchUsers.push(res[i]);
        }
    }else if (count == 4){
        for (var i in res) {
            if (res[i] != userUid && res[i] != resMUsers[0]["userUid"]) matchUsers.push(res[i]);
        }
    }else{
        for (var i in res) {
            if (res[i] != userUid && res[i] != resMUsers[0]["userUid"] && res[i] != resMUsers[1]["userUid"]) matchUsers.push(res[i]);
        }
    }
    return matchUsers;
}
/*
  *返回用户组挑战数据及挑战阵容数据heroId
  * param tabletsUserList 格式：[{..},{..}]
  * param issueId 期号
  */
function _getTabletsUserBattleData(tabletsUserList, issueId, callbackFn) {
    var topInfoList = [];
    //async.forEach(tabletsUserList, function (tabletsUser, forCb) {
    async.forEachSeries(tabletsUserList, function (tabletsUser, forCb) {
        var topUserUid = tabletsUser["userUid"];
        var configData = configManager.createConfig(topUserUid);

        tabletsUser["teamLv"] = tabletsUser["lv"];//configData.userExpToLevel(tabletsUser["exp"]);
        //tabletsUser["teamInfo"] = {};

        if(false) {//test-debug
            topInfoList.push(tabletsUser);
            forCb(null);
        }else {
            redis.user(topUserUid).s(_getGSRedisKey(issueId,"userBattleData")).getObj(function (err, res) {
                if (res == null) {
                    updateRedisTabletsUserBattleData(topUserUid, issueId, function (err, res) {
                        if (err) forCb(err);
                        else {
                            tabletsUser["heroId"] = res["heroId"];
                            tabletsUser["teamInfo"] = res["teamInfo"];
//                            tabletsUser["userData"] = res["userData"];
                            topInfoList.push(tabletsUser);
                            forCb(null);
                        }
                    });
                } else {
                    tabletsUser["heroId"] = res["heroId"];
                    tabletsUser["teamInfo"] = res["teamInfo"];
//                    tabletsUser["userData"] = res["userData"];
                    topInfoList.push(tabletsUser);
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
/*
* 初始化redis排行榜
* */
function _initRedisTabletsUserData(userUid, issueId, callbackFn) {
    var sql = "SELECT userUid,point,rank FROM gsTabletsUser WHERE issueId=" + mysql.escape(issueId) + " ORDER BY point desc, pointUpdateTime DESC";
    mysql.loginDBFromUserUid(userUid).query(sql, function (err, res) {
        if (err) callbackFn(err);
        else {
            if (res == null || res.length == 0) callbackFn(null, "");
            else {
                var i = 0;
                var curpoint = 0;
                async.forEachSeries(res, function (item, callback) {
                    //console.log("_________",(item["point"]-0)+(0.0001*i-0))
                    if(curpoint-0!=item["point"]-0){
                        i = 1;
                        curpoint = item["point"];
                    }else{
                        i++;
                    }
                    redis.countryForDynamic(userUid).z(_getGSRedisKey(issueId, "gsTabletsUser:topList")).add((item["point"] - 0) + (0.0001 * i - 0), item["userUid"], function (err, res) {
                        callback(null);
                    });
                    redis.countryForDynamic(userUid).z(_getGSRedisKey(issueId, "gsTabletsUser:rankList")).add(item["rank"] - 0, item["userUid"]);
                }, function (err) {
                    callbackFn(null, null);
                });
            }
        }
    });
}
function _dayOffset(now){
    var date = new Date(now * 1000);
    date.setSeconds(0);
    date.setMinutes(0);
    date.setHours(0);
    return date.getTime() / 1000;
}
exports.getGSRedisKey = _getGSRedisKey;
exports.getDefaultTabletsUserRedis = getDefaultTabletsUserRedis;
exports.checkUserServerStatus = checkUserServerStatus;
exports.getTwoMatchUsers = getTwoMatchUsers;
exports.getUserTop = getUserTop;
exports.getTopList10 = getTopList10;
exports.getLastTop5 = getLastTop5;
exports.getTabletsUser = getTabletsUser;
exports.addTabletsUser = addTabletsUser;
exports.updateTabletsUser = updateTabletsUser;
exports.updateRedisTabletsUserBattleData = updateRedisTabletsUserBattleData;
exports.getRedisBattleData = getRedisBattleData;
exports.getDailyReward = getDailyReward;
exports.getBoxReward = getBoxReward;
exports.sendClickReward = sendClickReward;
exports.clickUser = clickUser;
exports.tabletsTaskDailyReward = tabletsTaskDailyReward;
exports.userGetBoxStatus = userGetBoxStatus;
