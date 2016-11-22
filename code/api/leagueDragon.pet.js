/**
 * Created with JetBrains WebStorm.
 * User: joseppe
 * Date: 15-04-28
 * Time: 下午14:52
 * 联盟神龙喂养
 */

var league = require("../model/league");
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var userVariable = require("../model/userVariable");
var configManager = require("../config/configManager");
var leagueDragon = require("../model/leagueDragon");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");

function start(postData, response, query) {
    var userUid = query["userUid"];
    var leagueUid;
    var configData = configManager.createConfig(userUid);
    var dragonConfig = configData.getConfig("starCraft");
    var shakeConfig = configData.getConfig("shake")["normal"];
    var reward;
    var rewardList = [];
    var petTimes = 0;
    var userData;
    var dragonData;
    var leagueLv;
    var userLv;

    async.series([function (cb) {   ///获取userInfo，体力是否充足
        user.getUser(userUid, function (err, res) {
            if (err || res == null) {
                cb("noThisUser");
            } else if(res["leagueUid"] == 0 || res["leagueUid"] == ""){
                cb("noLeague");
            } else {
                userData = {"ingot":res["ingot"], "gold":res["gold"]};
                leagueUid = res["leagueUid"];
                userLv = res["lv"];
                cb(null);
            }
        })
    }, function(cb){//验证联盟数据存在
        userVariable.getVariableTime(userUid, "petTimes", function (err, res) {
            if (err) {
                cb(err);
            } else if(res != null && jutil.compTimeDay(jutil.now(), res["time"])){
                petTimes = res["value"]-0;
                cb(null);
            } else {
                cb(null);
            }
        });
    }, function(cb){//验证联盟数据存在
        if(petTimes >= dragonConfig["prayCost"].length){
            cb("timesNotEnough");
        } else if(userData[dragonConfig["prayCost"][petTimes]["id"]] - dragonConfig["prayCost"][petTimes]["count"] < 0){
            cb("ingotNotEnough");
        } else {
            cb(null);
        }
    }, function(cb){//验证联盟数据存在
        league.getLeague(userUid,leagueUid,function(err, res){
            if (err)
                cb("dbError");
            else if(res == null)
                cb("noLeague");
            else if(league.leagueExpToLevel(userUid, res["exp"]) < dragonConfig["openLeagueLv"])
                cb("noOpen");
            else{
                leagueLv = league.leagueExpToLevel(userUid, res["exp"]);
                cb(null);
            }
        });
    }, function(cb){
        league.getMember(userUid,leagueUid,userUid,function(err,res){
            if(err || res == null){
                cb("dbError");
            } else{
                cb(null);
            }
        });
    }, function(cb){//取得地图配置
        leagueDragon.getDragon(userUid,leagueUid,function(err, res){
            if(err)
                cb("dbError");
            else if(res["lv"] >= leagueLv){
                cb("maxLevel");
            } else {
                dragonData = res;
                cb(null);
            }
        });
    }, function(cb){
        var randomVal = Math.random();
        for (var key in shakeConfig) {
            var mItem = shakeConfig[key];
            if (randomVal >= mItem["minProb"] && randomVal < mItem["maxProb"]) {
                if (mItem["content"] != null) {
                    reward = mItem["content"];
                    cb(null);
                } else if (mItem["levelContent"] != null) {
                    var mLevelContent = mItem["levelContent"];
                    reward = mLevelContent[userLv];
                    cb(null);
                }
                break;
            }
        }
    }, function(cb) { //content处理
        if (reward == null || reward.length == 0) {
            cb("configError");
        } else {
            async.forEach(reward, function(dropItem, forCb) {
                mongoStats.dropStats(dropItem["id"], userUid, response.ip, null, mongoStats.SHAKE, dropItem["count"]);
                modelUtil.addDropItemToDB(dropItem["id"], dropItem["count"], userUid, 0, 1, function(err, res) {
                    if (err) console.error(err.stack);
                    if(res instanceof Array){
                        for(var i in res){
                            rewardList.push(res[i]);
                        }
                    } else if(res) {
                        rewardList.push(res);
                    }
                    forCb(err);
                });
            }, function(err) {
                cb(err);
            });
        }
    }, function(cb){
        userData[dragonConfig["prayCost"][petTimes]["id"]] -= dragonConfig["prayCost"][petTimes]["count"];
        mongoStats.expendStats(dragonConfig["prayCost"][petTimes]["id"], userUid, "127.0.0.1", null, mongoStats.A_LEAGUEDRAGON1,dragonConfig["prayCost"][petTimes]["count"]);//联盟龙伊美加币消耗统计
        user.updateUser(userUid, userData, cb);
    }, function(cb){
        petTimes++;
        userVariable.setVariableTime(userUid, "petTimes", petTimes, jutil.now(), cb);
    }, function(cb){//取得地图配置
        var lvData = leagueDragon.toNewLvAndExp(dragonConfig["ShinronExp"], leagueLv, dragonData["lv"], dragonData["exp"]+dragonConfig["prayExp"]);
        dragonData["lv"] = lvData[0];
        dragonData["exp"] = lvData[1];
        leagueDragon.setDragon(userUid, dragonData, cb);
    }, function(cb){//取得地图配置
        leagueDragon.getStar(userUid, dragonData["starId"], function(err, res){
            if(err || res == null || (res["starId"] != 0 && res["leagueUid"] != leagueUid))
                cb("dbError");
            else {
                dragonData["starData"] = res;
                dragonData["starData"]["hasTimes"] = Math.floor((jutil.now() - res["hasTime"])/ 604800);
                cb(null);
            }
        });
    }],function(err){
        if (err) {
            response.echo("leagueDragon.pet",jutil.errorInfo(err));
        } else {
            response.echo("leagueDragon.pet",{"dragonData":dragonData, "userData":userData, "petTimes":petTimes, "reward":reward, "rewardList":rewardList});
        }
    });
}

exports.start = start;