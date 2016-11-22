/**
 * 返回当前worldboss的状态
 * worldBoss.info
 * User: liyuluan
 * Date: 13-12-18
 * Time: 上午10:49
 */

var worldBoss = require("../model/worldBoss");
var jutil = require("../utils/jutil");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var async = require("async");


function start(postData, response, query) {
    var gDay = jutil.day();
    var gBossStatus = 0;

    var echoStr = "";
    var userUid = query["userUid"];
    var scoreValue = 0;
    var attackCount = 0;
    var totleHurt = 0;

    async.series([
        function(cb) {
            worldBoss.getBossStatus(userUid, gDay, function(err, res) {
                if (err) {
                    console.log("worldBoss.getBossStatus", err.stack);
                    cb("dbError");
                } else {
                    gBossStatus = res;
                    cb(null);
                }
            });
        },
        function(cb) {
            if (gBossStatus == 0) { //战斗没开始
//                cb("outTime");
                echoStr = 0;
                cb(null);
            } else if (gBossStatus == 1) { //战斗进行中
                getRealTimeInfoString(gDay, userUid,function(err, res) {
                    if (err) {
                        console.log("getRealTimeInfoString", err.stack);
                    }
                    echoStr = res;
                    cb(null);
                });
            } else { //战斗已结束
                worldBoss.getRankStr(userUid, gDay, function(err,res) {
                    if (err) {
                        console.log("worldBoss.getRankStr", err.stack);
                        cb("dbError");
                    } else {
                        echoStr = res;
                        cb(null);
                    }
                });
            }
        },
        function(cb) { //取排名和伤血量
            worldBoss.getUserIndex(userUid, gDay, function(err, res) {
                if (err) {
                    console.log("worldBoss.getUserIndex", err.stack);
                    cb("dbError");
                } else {
                    totleHurt = res[1] || 0;
                    scoreValue = res[0] || 0;
                    cb(null);
                }
            });
        },
//        function(cb) {
//            worldBoss.getBloody(gDay, userUid, function(err, res) {
//                if (err) cb("dbError");
//                else {
//                    attackCount = res;
//                    cb(null);
//                }
//            });
//        },
        function(cb) { //取攻击次数
            worldBoss.getAttackCount(gDay, userUid, function(err, res) {
                if (err) {
                    console.log("getAttackCount", err.stack);
                    cb("dbError");
                } else {
                    attackCount = res;
                    cb(null);
                }
            });
        }
    ], function(err) {
        if (err) {
            console.log("worldBoss.info", err, err.stack);
            response.echo("worldBoss.info", jutil.errorInfo(err));
        }
        else {
            var mStr = '{"info":' + echoStr + ',"attackCount":' + attackCount + ',"scoreValue":' + scoreValue + ',"totleHurt":' + totleHurt + '}';
            response.echoString("worldBoss.info", mStr);
        }
    });
}


function getRealTimeInfoString(day, userUid,callbackFn) {
    worldBoss.getRealTimeInfoString(userUid, day, function(err, res) {
        if (res != null) callbackFn(null, res);
        else {
            realTimeInfo(day, userUid,function(err, res) {
                var resStr = "";
                try {
                    resStr = JSON.stringify(res);
                } catch(error) {
                    console.error(error.stack);
                }
                worldBoss.setRealTimeInfoString(userUid, day, resStr, function(){

                });
                callbackFn(null, resStr);
            });
        }
    });
}




//取当前的boss的状态
function realTimeInfo(day, userUid,callbackFn) {
    var mRanking = [];
    var bossHurt = 0;
    var bossHP = 0;
    var attackerList = [];
    var mUserTime;
    var configData = configManager.createConfig(userUid);

    async.series([
        function(cb) { //取排行
            worldBoss.getRanking(userUid, day, function(err,res) {
                if (err) {
                    cb(null);
                } else {
                    for (var i = 0; i < res.length; i+=2) {
                        var mRank = Math.floor(i/2) + 1;
                        mRanking.push({"userUid":res[i],"rank":mRank,"value":res[i+1]});
                    }
                    cb(null);
                }
            });
        },
        function(cb){//取战斗开始的时间
            worldBoss.getUserTime(day, userUid, function(err, res) {
                if(err != null)  cb("dbError");
                else{
                    mUserTime = res;
                    cb(null);
                }
            });
        },
        function(cb) { //取用户名字
            async.forEach(mRanking, function(item, forCb) {
                var mUserUid = item["userUid"];
                worldBoss.getUserNameAndLevel(day, mUserUid, function(err, res) {
                    if (err) forCb(null);
                    else {
                        var nameAndLevel = res || "**|99";
                        var nameLevelArray = nameAndLevel.split("|");
                        item["userName"] = nameLevelArray[0];
                        item["level"] = nameLevelArray[1];
                        forCb(null);
                    }
                });
            }, function(err) {
                cb(null);
            });
        },
        function(cb) { //取boss伤害值
            worldBoss.getAllHurt(userUid, day, function(err, res) {
                bossHurt = res || 0;
                cb(null);
            });
        },
        function(cb) { //取boss总血量
            worldBoss.getBossLevel(userUid, function(err, res) {
                var bossLevel = 0;
                if (res == null) bossLevel = configData.g("worldBoss")("LevelInit")() - 0;
                else bossLevel = res - 0;
                bossHP = bossLevel * (configData.g("worldBoss")("hpPerLevel")() - 0);
                cb(null);
            });
        },
        function(cb) { //取攻击者列表
            worldBoss.getLastAttack(userUid,day, function(err, res) {
                if (err || res == null ) cb(null);
                else {
                    for (var i = 0; i < res.length; i++) {
                        var resItem = res[i].split("|");
                        var returnItem = {};
                        returnItem["userName"] = resItem[1];
                        returnItem["hurt"] = resItem[2];
                        returnItem["count"] = resItem[3];
                        returnItem["heroId"] = resItem[4];
                        attackerList.push(returnItem);
                    }
                    cb(null);
                }
            });
        }
    ], function(err, res) {
        var result = {};
        result["end"] = 0;
        result["mRanking"] = mRanking;
        result["bossHurt"] = bossHurt;
        result["bossHP"] = bossHP;
        result["attackerList"] = attackerList;
        result["mUserTime"] = mUserTime;
        callbackFn(null,result);
    });
}

exports.start = start;