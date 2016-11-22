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
var mail = require("../model/mail");
var user = require("../model/user");
var mongoStats = require("../model/mongoStats");


function getAllMap(userUid,leagueUid,callbackFn) {
    var sql = "SELECT * FROM leagueMap WHERE leagueUid = " + mysql.escape(leagueUid);
    mysql.game(userUid).query(sql,function(err, res) {
        if (err || res == null) callbackFn(err,null);
        else {
            var returnObj = {};
            async.forEach(res,function(resItem, cb){
                if(resItem['battleTime'] >= jutil.monday()){
                    redis.domain(userUid).h("leagueMap:"+resItem["leagueMapId"]).exists(function(err,res){
                        if(res == 0){
                            redis.domain(userUid).h("leagueMap:"+resItem["leagueMapId"]).setObj(resItem);
                            redis.domain(userUid).h("leagueMap:"+resItem["leagueMapId"]).expire(jutil.monday() + 7*86400 - jutil.now());
                            returnObj[resItem['leagueMapId']] = resItem;
                            cb(null);
                        } else {
                            redis.domain(userUid).h("leagueMap:"+resItem["leagueMapId"]).getObj(function(err,res){
                                returnObj[res['leagueMapId']] = res;
                                cb(null);
                            });
                        }
                    });
                } else {
                    for(var i = 1; i<= 8; i++){
                        resItem["npc"+i] = 0;
                    }
                    resItem["finish"] = 0;
                    resItem['battleTime'] = jutil.monday();
                    var sql = "UPDATE leagueMap SET ? WHERE leagueMapId = " + mysql.escape(resItem["leagueMapId"]);
                    mysql.game(userUid).query(sql,resItem,function(err, res) {
                        returnObj[resItem['leagueMapId']] = resItem;
                        cb(err);
                    });
                    redis.domain(userUid).h("leagueMap:"+resItem["leagueMapId"]).setObj(resItem);
                    redis.domain(userUid).h("leagueMap:"+resItem["leagueMapId"]).expire(jutil.monday() + 7*86400 - jutil.now());
                }
            },function(err, res){
                callbackFn(err, returnObj);
            });
        }
    });
}

function getMap(userUid,leagueMapId,callbackFn) {
    var setNewData = function(resItem, toredis){
        if(resItem['battleTime'] < jutil.monday()){
            for(var i = 1; i<= 8; i++){
                resItem["npc"+i] = 0;
            }
            resItem["finish"] = 0;
            resItem['battleTime'] = jutil.monday();
            var sql = "UPDATE leagueMap SET ? WHERE leagueMapId = " + mysql.escape(resItem["leagueMapId"]);
            mysql.game(userUid).query(sql,resItem, function(err, res){});
            toredis = true;
        }
        if(toredis){
            redis.domain(userUid).h("leagueMap:"+resItem["leagueMapId"]).setObj(resItem);
            redis.domain(userUid).h("leagueMap:"+resItem["leagueMapId"]).expire(jutil.monday() + 7*86400 - jutil.now());
        }
        return resItem;
    }
    redis.domain(userUid).h("leagueMap:"+leagueMapId).getObj(function(err,res){
        if(err)
            callbackFn(err);
        else if(res == null){
            var sql = "SELECT * FROM leagueMap WHERE leagueMapId = " + mysql.escape(leagueMapId);
            mysql.game(userUid).query(sql,function(err, res) {
                if (err || res.length == 0) callbackFn(err,null);
                else {
                    var resItem = res[0];
                    callbackFn(null, setNewData(resItem, true));
                }
            });
        } else {
            callbackFn(null, setNewData(res, false));
        }
    });
}

function createMap(userUid,leagueUid,bigMapId,mapId,callbackFn) {
    var newData = {"leagueUid":leagueUid, "bigMapId":bigMapId, "mapId":mapId, "battleTime":jutil.now(),"finish":0};
    for(var i = 1; i <= 8; i++){
        newData["npc"+i] = 0;
    }
    var sql = "INSERT INTO leagueMap SET ?";
    mysql.game(userUid).query(sql,newData,function(err, res) {
        newData["leagueMapId"] = res["insertId"];
        redis.domain(userUid).h("leagueMap:"+newData["leagueMapId"]).setObj(newData);
        redis.domain(userUid).h("leagueMap:"+newData["leagueMapId"]).expire(jutil.monday() + 7*86400 - jutil.now());
        callbackFn(err,newData);
    });
}

function updateMap(userUid,leagueMapId,npcs,otherData,callbackFn){
    var length = 0;
    for(var i in npcs){
        length++;
        redis.domain(userUid).h("leagueMap:"+leagueMapId).hincrby("npc"+i, npcs[i]-0, function(err, res){
            if(--length == 0){
                var data = [];
                for(var j in npcs){
                    data.push("`npc"+j+"` = `npc"+j+"` + "+npcs[j]);
                }
                for(var j in otherData){
                    data.push("`"+j+"` = '"+otherData[j]+"'");
                }
                redis.domain(userUid).h("leagueMap:"+leagueMapId).setObj(otherData, function(err, res){
                    var sql = "UPDATE leagueMap SET "+data.join(', ')+" WHERE leagueMapId = " + mysql.escape(leagueMapId);
                    mysql.game(userUid).query(sql,data,function(err, res) {
                        callbackFn(err,null);
                    });
                });
            }
        });
    }
}

function setUserHurt(userUid,leagueMapId,npcs,callbackFn){
    var hurt = 0;
    for(var i in npcs){
        hurt += npcs[i]-0;
    }
    redis.domain(userUid).h("leagueHurt:"+leagueMapId).hincrby(userUid, hurt-0, callbackFn);
    redis.domain(userUid).h("leagueHurt:"+leagueMapId).expire(jutil.monday() + 7*86400 - jutil.now());
}

function getMaxUserHurt(userUid,leagueMapId,callbackFn){
    redis.domain(userUid).h("leagueHurt:"+leagueMapId).getObj(function(err, res){
        var hurt = 0;
        var uid = 0;
        for(var i in res){
            var myhurt = res[i] - 0;
            if(myhurt > hurt){
                hurt = myhurt;
                uid = i;
            }
        }
        callbackFn(err, uid);
    })
}

function getUserHurt(userUid,leagueMapId,callbackFn){
    redis.domain(userUid).h("leagueHurt:"+leagueMapId).getObj(function(err, res){
        var data = [];
        for(var i in res){
            data.push({"userUid":i, "hurt":res[i]});
        }
        callbackFn(err, data);
    })
}

function loot(userUid, mapdata, callbackFn){
    var configData = configManager.createConfig(userUid);
    var leagueMapConfig = configData.getConfig("guildMap");
    var lootConfig = leagueMapConfig["bigMap"][mapdata["bigMapId"]]["map"][mapdata["mapId"]]["loot"];
    var reward = {};
    var lootTimeout = jutil.now() + leagueMapConfig["sellTime"]; //暂时为5分钟来测试，3* 86400;//使用过期时间

    var r = Math.floor(Math.random() * lootConfig.length);
    reward["id"] = lootConfig[r]["id"];
    reward["count"] = lootConfig[r]["count"];
    var loot = {"leagueUid":mapdata["leagueUid"],"bigMapId":mapdata["bigMapId"],"mapId":mapdata["mapId"],"reward":JSON.stringify(reward),"lootTimeout":lootTimeout, "userUid":0, "status":"0"};
    var sql = "INSERT INTO `leagueMapLoot` SET ?";
    mysql.game(userUid).query(sql, loot, function(err, res){
        loot["lootId"] = res["insertId"];
        redis.domain(userUid).h("leagueMapLoot:"+loot["leagueUid"]).setJSON(loot["lootId"], loot,function(err, res){
            redis.domain(userUid).h("leagueMapLoot:"+loot["leagueUid"]).expire(7*86400);
            callbackFn(err, reward);
        })
    });
}

function setLootResult(userUid, loot, callbackFn){
    var sql = "UPDATE `leagueMapLoot` SET ? WHERE `lootId`=" + mysql.escape(loot["lootId"]);
    loot["status"] = 1;
    mysql.game(userUid).query(sql, loot, function(err, res){
        redis.domain(userUid).h("leagueMapLoot:"+loot["leagueUid"]).setJSON(loot["lootId"], loot,function(err, res){
            redis.domain(userUid).h("leagueMapLoot:"+loot["leagueUid"]).expire(7*86400);
            callbackFn(err, res);
        })
    });
}

function getLoot(userUid, leagueUid, bigMapId, callbackFn){
    var cleanRedis = function(res){
        var loots = {};
        for(var i in res){
            var lootId = 0;
            if(res.hasOwnProperty("lootId")){
                lootId = res["lootId"];
            } else {
                lootId = i;
            }
            var loot = res[i];
            if(loot["bigMapId"] == bigMapId){
                loot["lootId"] = lootId;
                loots[lootId] = loot;
            }
        }
        return loots;
    }
    redis.domain(userUid).h("leagueMapLoot:"+leagueUid).getAllJSON(function(err, res){
        if(err){
            callbackFn(err, res);
        } else if(res == null){
            var sql = "SELECT * FROM `leagueMapLoot` WHERE `leagueUid` = "+mysql.escape(leagueUid);
            mysql.game(userUid).query(sql, function(err, res){
                if(err || res == null || res.length == 0){
                    callbackFn(err, res);
                } else{
                    redis.domain(userUid).h("leagueMapLoot:"+leagueUid).setAllJSONFromArray(res, "lootId", function(err, res){
                        redis.domain(userUid).h("leagueMapLoot:"+leagueUid).expire(7*86400);
                        callbackFn(err, cleanRedis(res));
                    });
                }
            })
        } else{
            callbackFn(null, cleanRedis(res));
        }
    })
}

function getAuction(userUid,lootId,callbackFn){
    redis.domain(userUid).h("leagueMapAuction:"+lootId).getAllJSON(function(err, res){
        if(err){
            callbackFn(err, res);
        } else if(res == null){
            var sql = "SELECT * FROM `leagueMapAuction` WHERE `lootId` = "+mysql.escape(lootId);
            mysql.game(userUid).query(sql, function(err, res){
                if(err || res == null || res.length == 0){
                    callbackFn(err, null);
                } else {
                    var data = res;
                    redis.domain(userUid).h("leagueMapAuction:"+lootId).setJSON(data["auctionId"], data, function(err, res){
                        redis.domain(userUid).h("leagueMapAuction:"+lootId).expire(7*86400);
                        callbackFn(err, data);
                    });
                }
            })
        } else{
            var data = [];
            for(var i in res){
                data.push(res[i]);
            }
            callbackFn(null, data);
        }
    })
}

function setAuction(userUid,data,callbackFn){
    var sql = "INSERT INTO `leagueMapAuction` SET ?";
    mysql.game(userUid).query(sql, data, function(err, res){
        if(err){
            callbackFn(err, res);
        } else {
            data["auctionId"] = res["insertId"];
            redis.domain(userUid).h("leagueMapAuction:"+data["lootId"]).setJSON(data["auctionId"], data, function(err, res){
                redis.domain(userUid).h("leagueMapAuction:"+data["lootId"]).expire(7*86400);
                callbackFn(err, data);
            });
        }
    })
}

function getMapLog(userUid, leagueUid, callbackFn){
    redis.domain(userUid).l("leagueMapLog:"+leagueUid).range(0,29,function(err, res){
        redis.domain(userUid).l("leagueMapLog:"+leagueUid).trim(0,29);
        callbackFn(err, res);
    });
}

function setMapLog(userUid, leagueUid, content, callbackFn){
    if(content == null || content == ""){
        callbackFn(null, null);
    } else {
        var data = {"userUid":userUid, "content":jutil.toBase64(content), "logTime":jutil.now()};
        redis.domain(userUid).l("leagueMapLog:"+leagueUid).leftPush(JSON.stringify(data),callbackFn);
    }
}

function lockMap(userUid, leagueMapId){
    var data = {"lockTime":jutil.now()+5};
    redis.domain(userUid).h("leagueMap:"+leagueMapId).setObj(data);
    var sql = "UPDATE leagueMap SET ? WHERE leagueMapId = " + mysql.escape(leagueMapId);
    mysql.game(userUid).query(sql,data, function(err,res){});
}

function auctionResult(county, city, hour, min, callbackFn){
    var redisDB = redis.domain(county, city);
    var getKey = "cronRun:leagueMapAuctionR" + ":" + (jutil.day() - 1) + ":" + hour + ":" + min;
    redisDB.s(getKey).setnx(1, function (err, res) {
        redisDB.s(getKey).expire(86400);
        if (err || res == 0) { //奖励已经发放
            callbackFn(null);
        } else {
            var userUid = bitUtil.createUserUid(county, city, 0);
            var configData = configManager.createConfig(userUid);
            var loots = [];
            async.series([
                function(cb) { //取Limit数据
                    var sql = "SELECT * FROM `leagueMapLoot` WHERE `lootTimeout` <= "+mysql.escape(jutil.now())+" and `status` = 0";
                    mysql.game(null, county, city).query(sql, function(err, res){
                        if(err || res == null || res.length == 0){
                            cb("noloots");
                        } else {
                            loots = res;
                            cb(null);
                        }
                    });
                },
                function(cb) { //只处理一次
                    var newLoot = [];
                    async.eachSeries(loots, function(loot, esCb){
                        redisDB.s("cronRun:leagueMapAuctionL:"+loot["lootId"]).setnx(1, function (err, res) {
                            if (err == null && res != 0) { //奖励已经发放
                                newLoot.push(loot);
                                esCb(null);
                            } else {
                                esCb(null);
                            }
                        });
                    }, function(err){
                        loots = newLoot;
                        cb(err);
                    });
                },
                function(cb){ // 发奖励
                    var mailConfig = configData.getConfig("mail");
                    async.eachSeries(loots, function(loot, esCb){
                        var maxAuction = {"userUid":"0","contribution":0};
                        getAuction(userUid, loot["lootId"], function(err, res){
                            if(err || res == null){
                                setLootResult(userUid, loot, function(err,res){
                                    esCb(null);
                                });
                            } else {
                                async.each(res, function(auction, esCb1){
                                    var aUserUid = 0;
                                    var aContribution = 0;
                                    if(auction["contribution"] > maxAuction["contribution"]){
                                        var oldAuction = maxAuction;
                                        maxAuction = auction;
                                        aUserUid = oldAuction["userUid"];
                                        aContribution = oldAuction["contribution"];
                                    } else {//归还贡献
                                        aUserUid = auction["userUid"];
                                        aContribution = auction["contribution"];
                                    }
                                    if(aUserUid != 0 && aUserUid != '' && aUserUid > 10000){
                                        user.getUser(aUserUid, function(err, res){
                                            user.updateUser(aUserUid, {"leagueContribution": res["leagueContribution"] - 0 + aContribution}, esCb1);
                                            mongoStats.dropStats("contribution", aUserUid, '127.0.0.1', null, mongoStats.E_LEAGUE_RESULT, aContribution);
                                        })
                                    } else {
                                        esCb1(null)
                                    }
                                }, function(err){
                                    if(err){
                                        console.error(err);
                                    } else {
                                        loot["userUid"] = maxAuction["userUid"];
                                        loot["contribution"] = maxAuction["contribution"];
                                        setLootResult(userUid, loot, function(err,res){
                                            var message = jutil.formatString(mailConfig["leagueMapSuccess"], [maxAuction["contribution"]]);
                                            mail.addMail(maxAuction["userUid"], -1, message, "["+loot["reward"]+"]", loot["lootId"], function(err, res) {
                                                if (err) esCb(err)
                                                else esCb(null);
                                            });
                                            var reward = JSON.parse(loot["reward"]);
                                            mongoStats.dropStats(reward["id"], maxAuction["userUid"], '127.0.0.1', null, mongoStats.E_LEAGUE_RESULT, reward["count"]);
                                        });
                                    }
                                });
                            }
                        })
                    }, function(err){
                        cb(null,null);
                    });
                }
            ], function(err,res) {
                callbackFn(null);
            });
        }
    });
}

exports.getAllMap = getAllMap;
exports.getMap = getMap;
exports.createMap = createMap;
exports.updateMap = updateMap;
exports.setUserHurt = setUserHurt;
exports.getUserHurt = getUserHurt;
exports.getMaxUserHurt = getMaxUserHurt;
exports.loot = loot;
exports.getLoot = getLoot;
exports.getAuction = getAuction;
exports.setAuction = setAuction;
exports.auctionResult = auctionResult;
exports.getMapLog = getMapLog;
exports.setMapLog = setMapLog;
exports.lockMap = lockMap;