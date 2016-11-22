/**
 * Created with JetBrains WebStorm.
 * User: joseppe
 * Date: 14-10-28
 * Time: 下午4:36
 * To change this template use File | Settings | File Templates.
 */

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

function getDefaultDragon(leagueUid){
    var data = {"leagueUid":leagueUid, "lv":0, "exp":0, "starId":0, "attackLv":0, "attackExp":0, "defenceLv":0, "defenceExp":0, "spiritLv":0, "spiritExp":0, "hpLv":0, "hpExp":0};
    return jutil.deepCopy(data);
}

function getDefaultStar(starId){
    var data = {"starId":starId, "leagueUid":0, "serverId":1, "hasTime":0, "destroy":0};
    return jutil.deepCopy(data);
}

function getDragon(userUid,leagueUid,callbackFn) {
    redis.domain(userUid).s("leagueDragon:"+leagueUid).getObj(function(err,res){
        if(!err && res == null){
            var sql = "SELECT * FROM leagueDragon WHERE leagueUid = " + mysql.escape(leagueUid);
            mysql.game(userUid).query(sql,function(err, res) {
                var dragonData;
                if (err){
                    callbackFn(err);
                } else if(res == null || res.length == 0) {
                    dragonData = getDefaultDragon(leagueUid);
                    redis.domain(userUid).s("leagueDragon:"+leagueUid).setObj(dragonData, function(err,res){
                        redis.domain(userUid).s("leagueDragon:"+leagueUid).expire(3*86400);
                        callbackFn(err, dragonData);
                    });

                } else {
                    dragonData = res[0];
                    redis.domain(userUid).s("leagueDragon:"+leagueUid).setObj(dragonData, function(err,res){
                        redis.domain(userUid).s("leagueDragon:"+leagueUid).expire(3*86400);
                        callbackFn(err, dragonData);
                    });
                }
            });
        } else {
            callbackFn(err, res);
        }
    });
}

function delDragon(userUid,leagueUid,callbackFn) {
    redis.domain(userUid).s("leagueDragon:"+leagueUid).del();
    var sql = "DELETE FROM leagueDragon WHERE leagueUid = " + mysql.escape(leagueUid);
    mysql.game(userUid).query(sql,callbackFn);
}

function getStars(userUid, callbackFn) {
    redis.loginFromUserUid(userUid).h("leagueStar").getAllJSON(function(err,res){
        if(err)
            callbackFn(err);
        else if(res == null){
            var sql = "SELECT * FROM leagueStar WHERE 1";
            mysql.loginDBFromUserUid(userUid).query(sql,function(err, res) {
                if (err || res.length == 0) callbackFn(err,{});
                else {
                    var starData = {};
//                    console.log(res,"leagueDra..");
                    for(var i in res){
                        starData[res[i]["starId"]] = res[i];
                    }
                    redis.loginFromUserUid(userUid).h("leagueStar").setAllJSON(starData, function(){
                        redis.loginFromUserUid(userUid).h("leagueStar").expire(3*86400);
                        callbackFn(null, starData);
                    });
                }
            });
        } else {
            callbackFn(null, res);
        }
    });
}

function getStar(userUid, starId, callbackFn) {
    var starData;
    getStars(userUid, function(err, res){
        if(err){
            callbackFn(err);
        } else if(res == null || res[starId] == null){
            var sql = "SELECT * FROM leagueStar WHERE starId = " + mysql.escape(starId);
            mysql.loginDBFromUserUid(userUid).query(sql,function(err, res) {
                if (err)callbackFn(err);
                else if(res == null || res.length == 0){
                    starData = getDefaultStar(starId);
                    redis.loginFromUserUid(userUid).h("leagueStar").setJSON(starId, starData, function(){
                        redis.loginFromUserUid(userUid).h("leagueStar").expire(3*86400);
                        callbackFn(null, starData);
                    });
                } else {
                    starData = res[0];
                    redis.loginFromUserUid(userUid).h("leagueStar").setJSON(starId, starData, function(){
                        redis.loginFromUserUid(userUid).h("leagueStar").expire(3*86400);
                        callbackFn(null, starData);
                    });
                }
            });
        } else {
            callbackFn(null, res[starId]);
        }
    });
}

function setDragon(userUid, dragonData, callbackFn){
    redis.domain(userUid).s("leagueDragon:"+dragonData["leagueUid"]).setObj(dragonData, function(err, res){
        redis.domain(userUid).s("leagueDragon:"+dragonData["leagueUid"]).expire(3*86400);
        var whereSql = "leagueUid = " + mysql.escape(dragonData["leagueUid"]);
        mysql.dataIsExist(userUid, "leagueDragon", whereSql, function(err,res) {
            if (err) callbackFn(err);
            else if (res == 1) {
                var updateSql = "UPDATE leagueDragon SET ? WHERE " + whereSql;
                mysql.game(userUid).query(updateSql, dragonData, callbackFn);
            } else {
                var insertSql = "INSERT INTO leagueDragon SET ?";
                mysql.game(userUid).query(insertSql, dragonData, callbackFn);
            }
        });
    });
}

function toNewLvAndExp(config, maxLv, lv, exp){
    var mexp = 0;
    for(var i = lv + 1; i <= maxLv && exp >= config[i] && config[i] != undefined; i++){
        lv = i;
        exp -= config[i];
    }
    if(i > maxLv || config[i] == undefined){
        mexp = exp;
        exp = 0;
    }
    return [lv, exp, mexp];
}

function signStar(userUid, leagueUid, starId, callbackFn){
    redis.loginFromUserUid(userUid).s("leagueStar:sign:league:"+leagueUid).get(function(err, res){
        if(res != null && res != starId){
            redis.loginFromUserUid(userUid).h("leagueStar:sign:star:"+res).hdel(leagueUid, function(err, res){
                setSignStar();
            });
        } else {
            setSignStar();
        }

        function setSignStar(){
            redis.loginFromUserUid(userUid).s("leagueStar:sign:league:"+leagueUid).setex(86400*2, starId, function(err, res){
                if(err){
                    callbackFn(err);
                } else {
                    var mCode = bitUtil.parseUserUid(userUid);
                    redis.loginFromUserUid(userUid).h("leagueStar:sign:star:"+starId).setex(86400*2, leagueUid, mCode[1]+"|"+jutil.now(), callbackFn);
                }
            });
        }
    });
}

function starSignView(userUid, starId, rewardStart, callbackFn){
    redis.loginFromUserUid(userUid).h("leagueStar:sign:star:"+starId).getObj(function(err, res){
        if(err || res == null){
            callbackFn(err, []);
        } else {
            var list = [];
            var mCode = bitUtil.parseUserUid(userUid);
            async.eachSeries(Object.keys(res), function(leagueUid, esCb){
                var lCode = res[leagueUid].split("|");
                var leagueData = {"leagueUid":leagueUid, "signTime":lCode[1] - 0, "server":lCode[0]};
                var luserUid = bitUtil.createUserUid(mCode[0], lCode[0], 0);

                async.series([function(cb){
                    getContribution(luserUid, leagueUid, rewardStart, function(err, res){
                        if(err)
                            cb(err);
                        else{
                            leagueData["contribution"] = res - 0;
                            cb(null);
                        }
                    });
                }, function(cb){
                    getDragon(luserUid, leagueUid, function(err, res){
                        if(!err && res != null){
                            leagueData["dragonLv"] = res["lv"];
                        } else {
                            leagueData["dragonLv"] = 0;
                        }
                        cb(err);
                    });
                }, function(cb){
                    league.getLeague(luserUid, leagueUid, function(err, res){
                        if(err){
                            cb(err);
                        } else if(res == null){
                            cb(null);
                        } else {
                            leagueData["leagueName"] = jutil.toBase64(res["leagueName"]);
                            leagueData["leagueExp"] = res["exp"];
                            list.push(leagueData);
                            cb(null);
                        }
                    });
                }], esCb);
            }, function(err, res){
                list.sort(function(x, y){ return x["contribution"] == y["contribution"]?x["signTime"] - y["signTime"]:y["contribution"] - x["contribution"]; });
                callbackFn(err, list);
            })
        }
    });
}

function removeStar(userUid, leagueUid, starId, callbackFn){
    redis.loginFromUserUid(userUid).h("leagueStar").hdel(starId);
    var sql = "UPDATE leagueStar SET ? WHERE starId = " + mysql.escape(starId);
    mysql.loginDBFromUserUid(userUid).query(sql, {"leagueUid":"0", "serverId":"1", "hasTime":"0", "destroy":"0"}, function(err, res) {
        if (err)callbackFn(err);
        else {
            var updateSql = "UPDATE leagueDragon SET ? WHERE leagueUid = " + mysql.escape(leagueUid);
            mysql.game(userUid).query(updateSql, {"starId":0}, callbackFn);
            redis.domain(userUid).s("leagueDragon:"+leagueUid).del();
        }
    });
}

function addContribution(userUid, leagueUid, contributionAdd, rewardStart, callbackFn){
    redis.loginFromUserUid(userUid).z("league:contribution:"+rewardStart).incrby(contributionAdd, leagueUid, callbackFn);
    redis.loginFromUserUid(userUid).z("league:contribution:"+rewardStart).expire(86400*7);
}

function getContribution(userUid, leagueUid, rewardStart, callbackFn){
    redis.loginFromUserUid(userUid).z("league:contribution:"+rewardStart).score(leagueUid, callbackFn);
}

function getSignStar(userUid, leagueUid, callbackFn){
    redis.loginFromUserUid(userUid).s("leagueStar:sign:league:"+leagueUid).get(callbackFn);
}

function setStar(userUid, starId, leagueUid, callbackFn){
    getDragon(userUid, leagueUid, function(err, res){
        if(err || res == null){
            callbackFn("dbError");
        } else if(res["starId"] == starId){
            callbackFn(null);
        } else {
            res["starId"] = starId;
            setDragon(userUid, res, function(err, res){
                if(err){
                    callbackFn(err);
                } else {
                    var mCode = bitUtil.parseUserUid(userUid);
                    var starData = {"starId":starId, "leagueUid":leagueUid, "serverId":mCode[1], "hasTime":jutil.now(), "destroy":0};
                    redis.loginFromUserUid(userUid).h("leagueStar").setJSON(starId, starData, function(err, res){
                        redis.loginFromUserUid(userUid).h("leagueStar").expire(3*86400);
                        var whereSql = "starId = " + mysql.escape(starId);
                        mysql.dataIsExistOnLoginDB(userUid, "leagueStar", whereSql, function(err,res) {
                            if (err) callbackFn(err);
                            if (res == 1) {
                                var updateSql = "UPDATE leagueStar SET ? WHERE " + whereSql;
                                mysql.loginDBFromUserUid(userUid).query(updateSql, starData, callbackFn);
                            } else {
                                var insertSql = "INSERT INTO leagueStar SET ?";
                                mysql.loginDBFromUserUid(userUid).query(insertSql, starData, callbackFn);
                            }
                        });
                    });
                }
            });
        }
    });
}

function getlastWin(userUid, starId, callbackFn){
    redis.loginFromUserUid(userUid).h("leagueStar:lastWin").get(starId, function(err, res){
        if(err || res == null){
            callbackFn(err, res);
        } else {
            var lCode = res.split('|');
            callbackFn(err, {"serverId":lCode[0], "leagueUid":lCode[1], "leagueName":lCode[2]});
        }
    });
}

function intoBattleRank(userUid, starId, type, userName, heroId, callbackFn){
    redis.loginFromUserUid(userUid).h("leagueStar:battleRank:"+starId+":"+type).setJSON(userUid, {"userUid":userUid, "inTime":jutil.now(), "userName":userName, "heroId":heroId}, callbackFn);
    redis.loginFromUserUid(userUid).h("leagueStar:battleRank:"+starId+":"+type).expire(86400);
}

function outBattleRank(userUid, starId, type, callbackFn){
    redis.loginFromUserUid(userUid).h("leagueStar:battleRank:"+starId+":"+type).hdel(userUid, callbackFn);
    redis.loginFromUserUid(userUid).h("leagueStar:battleRank:"+starId+":"+type).expire(86400);
}

function getBattleRank(country, starId, type, callbackFn){
    var list = [];
    redis.login(country).h("leagueStar:battleRank:"+starId+":"+type).getAllJSON(function(err, res){
        if(err){
            callbackFn(err);
        } else if(res == null){
            callbackFn(null, list);
        } else {
            for(var i in res){
                list.push({"userUid":i, "inTime":res[i]["inTime"], "userName":jutil.toBase64(res[i]["userName"]), "heroId":res[i]["heroId"]});
            }
            list.sort(function(a, b){return a["inTime"] - b["inTime"]; });
            callbackFn(null, list);
        }
    });
}

function intoBattleRankLeague(userUid, starId, type, leagueUid){
    redis.loginFromUserUid(userUid).s("leagueStar:battleRankLeague:"+starId+":"+type).set(leagueUid);
    redis.loginFromUserUid(userUid).s("leagueStar:battleRankLeague:"+starId+":"+type).expire(86400);
}

function getWinTimes(userUid, callbackFn){
    var configData = configManager.createConfig(userUid);
    var dragonConfig = configData.getConfig("starCraft");
    redis.user(userUid).s("leagueStar:winTimes").get(function(err, res){
        callbackFn(err, isNaN(res)?dragonConfig["winTimes"]:(res-0+dragonConfig["winTimes"]));
    });
}

function addWinTimes(userUid, callbackFn){
    redis.user(userUid).s("leagueStar:winTimes").incr(callbackFn);
}

function toBattle(country, loop, callbackFn){
    var configData = configManager.createConfigFromCountry(country);
    var dragonConfig = configData.getConfig("starCraft");
    var starIds = [];
    for(var i in dragonConfig["stars"]){
        starIds.push(i);
    }
    var userUid = bitUtil.createUserUid(country, 1, 0);//此处跨服，后面不需要用到分服信息

    var startTime = jutil.monday() + dragonConfig["startWeektime"];

    if(jutil.now() < startTime)
        startTime -= 604800;

    var rewardStart = startTime+dragonConfig["doTime"]["rewardStart"];
    if(jutil.now() < rewardStart)
        rewardStart -= 604800;
    async.series([function(cb){
        if(jutil.compTimeDay(jutil.now(), startTime+dragonConfig["doTime"]["battleTime1"]) || jutil.compTimeDay(jutil.now(), startTime+dragonConfig["doTime"]["battleTime2"])){
            cb(null);
        } else {
            cb("errorTime");
        }
    }, function(cb) {
        var getKey = "cronRun:leagueStar" + ":" + (jutil.day() - 1) + ":" + loop;
        redis.login(country).s(getKey).setnx(1, function (err, res) {
            redis.login(country).s(getKey).expire(86400);
            if (err || res == 0) { //奖励已经发放
                cb("isBattle");
            } else {
                cb(null);
            }
        });
    }, function(cb) {
        async.eachSeries(starIds, function(starId, esCb){
            var defList = [];
            var actList = [];
            var defCity = 1;
            var actCity = 1;
            var defLeagueUid = 0;
            var actLeagueUid = 0;
            var defLeagueName = "";
            var actLeagueName = "";
            var winLeague = 0;
            var roundData = {"roundData":[],"drop":{}};
            var isRot = false;
            var isDef = false;
            async.series([function(esCcb){
                function setRotLeague(err, res){
                    if(res == null || res["leagueUid"] == 0){
                        isRot = true;
                        for(var i = 0; i < dragonConfig["monsterCount"]; i++){
                            defList.push({"userUid":0, "inTime":0, "userName":jutil.toBase64(dragonConfig["stars"][starId]["monsterName"]), "heroId":dragonConfig["stars"][starId]["monster"]});
                        }
                        defLeagueUid = 0;
                        defLeagueName = dragonConfig["stars"][starId]["monsterName"];
                        defCity = 1;
                        roundData["enemyTeam"] = {"leagueUid":0, "serverId":defCity,"name":jutil.toBase64(dragonConfig["stars"][starId]["monsterName"]),"member":defList.length,"team":[]};
                        esCcb(err);
                    } else {
                        defLeagueUid = res["leagueUid"];
                        defCity = res["serverId"];
                        var lUserUid = bitUtil.createUserUid(country, defCity, 0);
                        league.getLeague(lUserUid, defLeagueUid, function(err, res){
                            if(err || res == null){
                                defLeagueUid = 0;
                                defCity = 1;
                                defLeagueName = "";
                            } else {
                                defLeagueName = res["leagueName"];
                            }
                            roundData["enemyTeam"] = {"leagueUid":defLeagueUid, "serverId":defCity, "name":jutil.toBase64(defLeagueName), "member":0, "team":[]};
                            esCcb(null);
                        });
                    }
                }
                if(loop == 1){
                    getStar(userUid, starId, setRotLeague);
                } else {
                    getlastWin(userUid, starId, setRotLeague);
                }
            }, function(esCcb) {
                if(!isRot){
                    getBattleRank(country, starId, "def", function(err, res){
                        defList = res;
                        roundData["enemyTeam"]["member"] = defList.length;
                        esCcb(err);
                    });
                } else {
                    esCcb(null);
                }
            }, function(esCcb) {
                getBattleRank(country, starId, "act", function(err, res){
                    actList = res;
                    esCcb(err);
                });
            }, function(esCcb) {
                starSignView(userUid, starId, rewardStart, function(err, res){
                    if(err)
                        esCcb(err);
                    else if(res == null || res.length == 0){
                        esCcb("noSign");
                    } else if(res.length == 1 && loop == 2){
                        esCcb("battleOver");
                    } else {
                        roundData["ownTeam"] = {"leagueUid":res[loop-1]["leagueUid"], "serverId":res[loop-1]["server"], "name":res[loop-1]["leagueName"], "member":actList.length, "team":[]};
                        actLeagueUid = res[loop-1]["leagueUid"];
                        actLeagueName = jutil.fromBase64(res[loop-1]["leagueName"]);
                        actCity = res[loop-1]["server"];
                        esCcb(null);
                    }
                });
            }, function(esCcb) {
                var defTimes;
                var actTimes;
                var defPosition = 1;
                var actPosition = 1;
                var times = 0;
                winLeague = actList.length<=0 ? defCity+"|"+defLeagueUid+"|"+defLeagueName : actCity+"|"+actLeagueUid+"|"+actLeagueName;
                async.whilst(function(){
                    return defList.length > 0 && actList.length > 0;
                }, function(wlCb){
                    var defNew = false;
                    var actNew = false;
                    var def = defList[0]["userUid"];
                    var act = actList[0]["userUid"];
                    var battleData;
                    var hps = {"def":{}, "act":{}};
                    async.series([function(wlCcb){
                        if(defTimes == null){
                            defNew = true;
                            if(isRot){
                                defTimes = dragonConfig["winTimes"];
                                wlCcb(null);
                            } else {
                                getWinTimes(def, function(err, res){
                                    defTimes = res;
                                    wlCcb(err);
                                });
                            }
                        } else {
                            wlCcb(null);
                        }
                    }, function(wlCcb) {
                        if(actTimes == null){
                            actNew = true;
                            getWinTimes(act, function(err, res){
                                actTimes = res;
                                wlCcb(err);
                            });
                        } else {
                            wlCcb(null);
                        }
                    }, function(wlCcb) {
                        console.log(times, def, act, defTimes, actTimes, defPosition, actPosition);
                        doBattle(act, def, starId, loop, times, isDef, function(err, res){
                            battleData = res["battleData"];
                            var hp;
                            hp = 0;
                            for(var i in battleData["enemyTeam"]["team"]){
                                hps["def"][i-0+1] = battleData["enemyTeam"]["team"][i]["hp"];
                                hp += battleData["enemyTeam"]["team"][i]["hp"];
                            }
                            if(defNew){
                                roundData["enemyTeam"]["team"].push({"userUid":def, "name":battleData["enemyTeam"]["name"],"heroId":battleData["enemyTeam"]["team"][0]["heroId"],"hp":hp, "maxWins":defTimes});
                            }
                            hp = 0;
                            for(var j in battleData["ownTeam"]["team"]){
                                hps["act"][j-0+1] = battleData["ownTeam"]["team"][j]["hp"];
                                hp += battleData["ownTeam"]["team"][j]["hp"];
                            }
                            if(actNew){
                                roundData["ownTeam"]["team"].push({"userUid":act, "name":battleData["ownTeam"]["name"],"heroId":battleData["ownTeam"]["team"][0]["heroId"],"hp":hp, "maxWins":actTimes});
                            }
                            if(res["win"] == def){
                                defTimes--;
                                if(defTimes <= dragonConfig["winTimes"])
                                    redis.user(def).s("leagueStar:winTimes").del();
                                else
                                    redis.user(def).s("leagueStar:winTimes").incrby(-1);
                                if(defTimes <= 0){
                                    defList.shift();
                                    defTimes = null;
                                }

                                actList.shift();
                                actTimes = null;
                                redis.user(act).s("leagueStar:winTimes").del();
                            } else {
                                actTimes--;
                                if(actTimes <= dragonConfig["winTimes"])
                                    redis.user(act).s("leagueStar:winTimes").del();
                                else
                                    redis.user(act).s("leagueStar:winTimes").incrby(-1);
                                if(actTimes <= 0){
                                    actList.shift();
                                    actTimes = null;
                                }

                                defList.shift();
                                defTimes = null;
                                redis.user(def).s("leagueStar:winTimes").del();
                            }
                            if(defList.length<=0 && actList.length<=0){
                                winLeague = res["win"] == def ? defCity+"|"+defLeagueUid+"|"+defLeagueName : actCity+"|"+actLeagueUid+"|"+actLeagueName;
                                roundData["isWin"] = res["win"] == def?false:true;
                            } else if(defList.length<=0 || actList.length<=0){
                                winLeague = defList.length<=0 ? actCity+"|"+actLeagueUid+"|"+actLeagueName : defCity+"|"+defLeagueUid+"|"+defLeagueName;
                                roundData["isWin"] = defList.length<=0?true:false;
                            }
                            wlCcb(err)
                        });
                    }, function(wlCcb){
                        times++;
                        var thisRound = [];
                        for(var round = 0; round < 2 && round < battleData["roundData"].length; round++){
                            //roundData["roundData"][round] = [];
                            var hurt = 0;
                            var behurt = 0;
                            var tHurt  = 0;
                            var position = 1;
                            var hp = 0;
                            for(var i in battleData["roundData"][round]){
                                if(battleData["roundData"][round][i]["isMe"]){
                                    for(var j in battleData["roundData"][round][i]["targetBeAtt"]){
                                        tHurt = battleData["roundData"][round][i]["targetBeAtt"][j]["hurt"];
                                        position = battleData["roundData"][round][i]["targetBeAtt"][j]["position"];
                                        hp = hps["def"][position];
                                        tHurt = tHurt > hp ? hp : tHurt;
                                        hps["def"][position] -= tHurt;
                                        hurt += tHurt;
                                    }
                                } else {
                                    for(var j in battleData["roundData"][round][i]["targetBeAtt"]){
                                        tHurt = battleData["roundData"][round][i]["targetBeAtt"][j]["hurt"];
                                        position = battleData["roundData"][round][i]["targetBeAtt"][j]["position"];
                                        hp = hps["act"][position];
                                        tHurt = tHurt > hp ? hp : tHurt;
                                        hps["act"][position] -= tHurt;
                                        behurt += tHurt;
                                    }
                                }
                            }
                            var nowHps = {"act":{}, "def":{}};
                            var actP = 1;
                            var defP = 1;
                            for(var i = 1; i <= 8; i++){
                                if(!isNaN(hps["act"][i]) && hps["act"][i] > 0){
                                    nowHps["act"][actP] = hps["act"][i];
                                    actP++;
                                }
                                if(!isNaN(hps["def"][i]) && hps["def"][i] > 0){
                                    nowHps["def"][defP] = hps["def"][i];
                                    defP++;
                                }
                            }
                            hps = nowHps;
                            thisRound.push({"isMe":true, "targetAtt":{"position":actPosition},"targetBeAtt":{"position":defPosition,"hurt":hurt}});
                            thisRound.push({"isMe":false, "targetAtt":{"position":defPosition},"targetBeAtt":{"position":actPosition,"hurt":behurt}});
                        }
                        if(battleData["roundData"].length>=3){
                            //roundData["roundData"][2] = [];
                            thisRound.push({"isMe":true, "targetAtt":{"position":actPosition},"targetBeAtt":{"position":defPosition,"hurt":battleData["roundData"][2][0]["ownSpirit"]}});
                            thisRound.push({"isMe":false, "targetAtt":{"position":defPosition},"targetBeAtt":{"position":actPosition,"hurt":battleData["roundData"][2][0]["enemySpirit"]}});
                        }
                        roundData["roundData"].push(thisRound);
                        if(defTimes == null)defPosition++;
                        if(actTimes == null)actPosition++;
                        wlCcb(null);
                    }], function(err, res){
                        wlCb(err, res);
                    });
                }, function(err, res){
                    if(defList.length > 0){
                        for(var i in defList){
                            redis.user(defList[i]["userUid"]).s("leagueStar:winTimes").del();
                            if(defTimes != null){
                                defTimes = null;
                                continue;
                            }
                            roundData["enemyTeam"]["team"].push({"userUid":defList[i]["userUid"], "name":defList[i]["userName"], "heroId":defList[i]["heroId"], "hp":999, "maxWins":1});
                        }
                    }
                    if(actList.length > 0){
                        for(var i in actList){
                            redis.user(actList[i]["userUid"]).s("leagueStar:winTimes").del();
                            if(actTimes != null){
                                actTimes = null;
                                continue;
                            }
                            roundData["ownTeam"]["team"].push({"userUid":actList[i]["userUid"], "name":actList[i]["userName"], "heroId":actList[i]["heroId"], "hp":999, "maxWins":1});
                        }
                    }
                    esCcb(err, res);
                });
            }, function(esCcb){
                redis.login(country).h("leagueStar:lastWin").set(starId, winLeague, esCcb);
                redis.login(country).h("leagueStar:lastWin").expire(86400);
            }, function(esCcb){
                redis.login(country).h("leagueStar:roundData:"+loop).setJSON(starId, roundData, esCcb);
                redis.login(country).h("leagueStar:roundData:"+loop).expire(86400*5);
            }, function(esCcb){
                redis.login(country).h("leagueStar:battleRank:"+starId+":act").del();
                redis.login(country).h("leagueStar:battleRank:"+starId+":def").del();
                redis.login(country).s("leagueStar:battleRankLeague:"+starId+":act").del();
                redis.login(country).s("leagueStar:battleRankLeague:"+starId+":def").del();
                esCcb(null);
            }], function(err, res){
                console.log("starId", starId, "end", err);
                esCb(null);
            });
        }, cb);
    }], function(err, res){
        console.log("result", err, res);
        callbackFn(null);
    });
}

function doBattle(one, other, starId, loop, times, isDef, callbackFn){
    var hisUserUid = one;
    var hisUserData;
    var hisBattleData;
    var hisDefaultBattleData;
    var herUserUid = other;
    var herUserData = {};
    var herBattleData;
    var herDefaultBattleData;
    var battleReturnData = {};
    var isWin = false;
    var errMan = 0;
    var configData = configManager.createConfig(hisUserUid);
    var dragonConfig = configData.getConfig("starCraft");
    var skillConfig = configData.getConfig("skill");
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
        if(!herUserUid == 0){
            user.getUser(herUserUid, function (err, res) {
                if (err || res == null) {
                    errMan = herUserUid;
                    callBack("noThisUser", null);
                } else {
                    herUserData = res;
                    callBack(null, null);
                }
            });
        } else {
            herUserData["userName"] = jutil.toBase64(dragonConfig["stars"][starId]["monsterName"]);
            herUserData["lv"] = 1;
            herUserData["leagueUid"] = 0;
            callBack(null);
        }
    }, function (callBack) {//获取甲方的气势
        title.getTitlesPoint(hisUserUid, function (point) {
            hisUserData["momentum"] = point;
            callBack(null, null);
        });
    }, function (callBack) {//获取乙方的气势
        if(!herUserUid == 0){
            title.getTitlesPoint(herUserUid, function (point) {
                herUserData["momentum"] = point;
                callBack(null, null);
            });
        } else {
            herUserData["momentum"] = 0;
            callBack(null, null);
        }
    }, function (callback) {//获取甲方的挑战队列
        battleModel.getBattleNeedData(hisUserUid, function (err, res) {
            if (err || res == null) {
                errMan = hisUserUid;
                callback("PVP DATA WRONG", null);
            } else {
                var hisListData = res;
                getDragon(hisUserUid, hisUserData["leagueUid"], function (err, res) {
                    if (err) {
                        callBack(err);
                    } else {
                        hisListData["dragonData"] = res;
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
            }
        });
    }, function (callback) {//获取乙方挑战队列
        if(!herUserUid == 0){
            battleModel.getBattleNeedData(herUserUid, function (err, res) {
                if (err) {
                    errMan = herUserUid;
                    callback("PVP DATA WRONG", null);
                } else {
                    var herListData = res;
                    getDragon(herUserUid, herUserData["leagueUid"], function (err, res) {
                        if (err) {
                            callBack(err);
                        } else {
                            herListData["dragonData"] = res;
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
                }
            });
        } else {
            var formations = {};
            for(var i = 1; i <= 8; i++){
                var heroData = jutil.deepCopy(dragonConfig["monster"]);
                heroData["name"] = jutil.toBase64(dragonConfig["stars"][starId]["monsterName"]);
                heroData["hero"] = dragonConfig["stars"][starId]["monster"];
                formations[i] = heroData;
            }
            herBattleData = configData.getLeagueNpc(formations);
            herDefaultBattleData = configData.getLeagueNpc(formations);
            for (var key in herBattleData) {
                var enemyItem = herBattleData[key];
                var defaultItem = herDefaultBattleData[key];
                var skill = enemyItem["skill"][0];
                var skillId = skill["skillId"];
                var configSkill = skillConfig[skillId];
                var add = configSkill["attr"] / 100;
                if (battleModel.doSkillAdd(herBattleData, herDefaultBattleData, key, add, configSkill["skillType"])) {
                    enemyItem["skill"] = [];
                } else {
                    defaultItem["skill"] = [];
                    enemyItem["skill"][0]["skillProp"] = 0;
                    enemyItem["skill"][0]["skillCount"] = 0;
                    enemyItem["skill"][0]["skillTime"] = 0;
                }
            }
            callback(null, null);
        }
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
        console.log(battleReturnData["ownTeam"]["name"],1)
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
                battleReturnData["isWin"] = round["win"];
                battleReturnData["own"] = one;
                battleReturnData["enemy"] = other;
                isWin = round["win"];
                // 存储战斗回合记录
                addBattleRoundData(isWin?one:other, isWin?other:one, starId, loop, times, battleReturnData);
                break;
            }
            isMeFirst = !isMeFirst;
        }
        callback(null, null);
    }], function (err, res) {
        if (err) {
            callbackFn(err, {"win":errMan, "battleData":battleReturnData});
        } else {
            callbackFn(null, {"win":isWin?one:other, "battleData":battleReturnData});
        }
    });
}

function battleEnd(country, callbackFn){
    var configData = configManager.createConfigFromCountry(country);
    var dragonConfig = configData.getConfig("starCraft");
    var starIds = [];
    for(var i in dragonConfig["stars"]){
        starIds.push(i);
    }
    var winList;
    //var userUid = bitUtil.createUserUid(country, city, 0);
    async.series([function(cb){
        var getKey = "cronRun:leagueStar" + ":" + (jutil.day() - 1) + ":3";
        redis.login(country).s(getKey).setnx(1, function (err, res) {
            redis.login(country).s(getKey).expire(86400);
            if (err || res == 0) { //奖励已经发放
                cb("isBattle");
            } else {
                cb(null);
            }
        });
    }, function(cb) {
        redis.login(country).h("leagueStar:lastWin").getObj(function(err, res){
            if(err || res == null){
                cb("noData");
            } else {
                winList = res;
                cb(null);
            }
        });
    }, function(cb) {
        async.eachSeries(starIds, function(starId, esCb){
            if(winList[starId] == undefined || winList[starId] == 0){
                esCb(null);
            } else {
                var lCode = winList[starId].split('|');
                if(lCode[1]  == 0){
                    esCb(null);
                } else {
                    var userUid = bitUtil.createUserUid(country, lCode[0], 0);
                    setStar(userUid, starId, lCode[1], esCb);
                }
            }
        }, cb);
    }, function(cb) {
        redis.login(country).h("leagueStar:lastWin").del(cb);
    }], function(err, res){
        callbackFn(null);
    });
}

function addBattleRoundData(winner, loser, starId, round, times, roundData) {
    var userUid = winner == 0?loser:winner;
    //var logId = crypto.createHash('md5').update(winner + loser + starId + timeStamp, "utf8").digest('hex');
    redis.loginFromUserUid(userUid).h("leagueStar:battleLog:"+starId+":"+round).setJSON(times, roundData);
    redis.loginFromUserUid(userUid).h("leagueStar:battleLog:"+starId+":"+round).expire(86400*5);
}

function getLeagueRoundData(userUid, loop, starId, callbackFn){
    redis.loginFromUserUid(userUid).h("leagueStar:roundData:"+loop).getJSON(starId, callbackFn);
}

function getBattleRoundData(userUid, starId, round, callbackFn) {
    redis.loginFromUserUid(userUid).h("leagueStar:battleLog:"+starId+":"+round).getAllJSON(callbackFn);
}

exports.getDragon = getDragon;
exports.delDragon = delDragon;
exports.getStars = getStars;
exports.getStar = getStar;
exports.setDragon = setDragon;
exports.toNewLvAndExp = toNewLvAndExp;
exports.signStar = signStar;
exports.removeStar = removeStar;
exports.starSignView = starSignView;
exports.addContribution = addContribution;
exports.getContribution = getContribution;
exports.getSignStar = getSignStar;
exports.getlastWin = getlastWin;
exports.intoBattleRank = intoBattleRank;
exports.toBattle = toBattle;
exports.battleEnd = battleEnd;
exports.intoBattleRankLeague = intoBattleRankLeague;
exports.getBattleRank = getBattleRank;
exports.outBattleRank = outBattleRank;
exports.getWinTimes = getWinTimes;
exports.addWinTimes = addWinTimes;
exports.getLeagueRoundData = getLeagueRoundData;
exports.getBattleRoundData = getBattleRoundData;