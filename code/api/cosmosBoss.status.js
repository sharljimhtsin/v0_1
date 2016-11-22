/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 13-12-27
 * Time: 下午5:10
 * To change this template use File | Settings | File Templates.
 */
var cosmosBoss = require("../model/cosmosBoss");
var async = require("async");
var jutil = require("../utils/jutil");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var user = require("../model/user");
function start(postData, response, query) {
    var userUid = query["userUid"];
    var returnData = {};
    var gDay = jutil.day();
    var mRanking = [];
    var inFoDay = gDay;
    var killerId;
    var killerInfo = {};
    var configData = configManager.createConfig(userUid);

    async.auto({
        "getStatus":function(cb){
            cosmosBoss.getBossStatus(userUid, gDay, function(err, res) {
                if (err) cb("dbError");
                else{
                    returnData["status"] = res;
                    if(res != 2){
                        inFoDay -= 1;
                    }
                    cb(null);
                }
            });
        },
        "getRanking":["getStatus",function(cb){
            cosmosBoss.getRanking(userUid, inFoDay, function(err,res) {
                if (err) {
                    console.error("cosmosBooss.status", userUid, inFoDay, err.stack);
                    cb(null);
                } else {
                    for (var i = 0; i < res.length; i+=2) {
                        var mRank = Math.floor(i/2) + 1;
                        mRanking.push({"userUid":res[i],"rank":mRank,"value":res[i+1]});
                    }
                    cb(null);
                }
            });
        }],
        "getYesterdayInfo":["getRanking",function(cb){
            async.forEach(mRanking, function(item, forCb) {
                var mUserUid = item["userUid"];
                cosmosBoss.getUserNameAndLevel(inFoDay, mUserUid, function(err, res) {
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
        }],
        "getBossLevel":function(cb){
            cosmosBoss.getBossLevel(userUid, function(err, res) {
                if (err) cb(err);
                else {
                    if (res == null) {
                        returnData["bossLevel"] = configData.g("cosmosBoss")("LevelInit")();
                    } else {
                        returnData["bossLevel"] = res;
                    }
                    cb(null);
                }
            });
        },
        "getDayKiller":["getStatus",function(cb){
            cosmosBoss.getDayKiller(userUid, inFoDay,function(err,res){
                if (err) cb(err);
                else {
                    killerId = res;
                    cb(null);
                }
            });
        }],
        "getDayKillerName":["getDayKiller",function(cb){
            if(killerId == null){
                cb(null);
                return;
            }
            cosmosBoss.getUserNameAndLevel(inFoDay,killerId,function(err,res){
                if(err){
                    cb(err);
                }else{
                    var nameAndLevel = res || "**|99";
                    var nameAndLevelArray = nameAndLevel.split("|");

                    killerInfo["killerName"] = nameAndLevelArray[0];
                    killerInfo["killerLevel"] = nameAndLevelArray[1];
                    killerInfo["killerId"] = killerId;
                    cb(null);
                }
            })
        }],
        "getDayKillerScore":["getDayKiller",function(cb){
            if(killerId == null){
                cb(null);
                return;
            }
            cosmosBoss.getUserIndex(killerId,inFoDay,function(err,res){
                if(err){
                    cb(err);
                }else{
                    killerInfo["killerValue"] = res[1];
                    cb(null);
                }
            })
        }],
        "getYKillTime":["getDayKiller",function(cb){
            if(killerId == null){
                cb(null);
                return;
            }
            cosmosBoss.getUserTime(inFoDay,killerId,function(err,res){
                returnData["killLostTime"] = res;
                cb(null);
            })
        }]
    },function(err){
        if(err){
            response.echo("cosmosBoss.status", jutil.errorInfo(err));
        }else{
            returnData["ranking"] = mRanking;
            returnData["killerInfo"] = killerInfo;
            response.echo("cosmosBoss.status", returnData);
        }
    })
}
exports.start = start;