/**
 * Created with JetBrains WebStorm.
 * User: joseppe
 * Date: 15-04-28
 * Time: 下午14:52
 * 联盟神龙获取状态
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
    var dragonConfig = jutil.deepCopy(configData.getConfig("starCraft"));
    var StarConfig;
    var returnData = {};
    var startTime = jutil.monday() + dragonConfig["startWeektime"];

    if(jutil.now() < startTime)
        startTime -= 604800;
    var rewardStart = startTime+dragonConfig["doTime"]["rewardStart"];
    var rewardEnd = startTime+dragonConfig["doTime"]["rewardEnd"];
    if(jutil.now() < rewardStart){
        rewardStart -= 604800;
        rewardEnd -= 604800;
    }

    var isDouble = false;
    async.series([function (cb) {   ///获取userInfo，体力是否充足
        if (jutil.now() >= rewardStart && jutil.now() <= rewardEnd) {//报名时间外
            cb(null);
        } else {
            cb("timeOut");
        }
    }, function (cb) {
        userVariable.getVariable(userUid, "leagueStarReward", function(err, res){
            if(err){
                cb(err);
            } else if(res != null && res - rewardStart >= 0){
                cb("haveReceive");
            } else {
                cb(null);
            }
        });
    }, function (cb) {
        user.getUser(userUid, function (err, res) {
            if (err || res == null) {
                cb("noThisUser");
            } else if(res["leagueUid"] == 0 || res["leagueUid"] == ""){
                cb("noLeague");
            } else {
                leagueUid = res["leagueUid"];
                cb(null);
            }
        });
    }, function(cb){//验证联盟数据存在
        league.getLeague(userUid,leagueUid,function(err, res){
            if (err)
                cb("dbError");
            else if(res == null)
                cb("noLeague");
            else
                cb(null);
        });
    }, function(cb){//取得地图配置
        leagueDragon.getDragon(userUid,leagueUid,function(err, res){
            if(err)
                cb("dbError");
            else if(res == null || res["starId"] == 0){
                cb("noReward");
            } else{
                returnData["reward"] = dragonConfig["stars"][res["starId"]]["reward"];
                cb(null);
            }
        });
    }, function(cb){
        league.getMember(userUid,leagueUid,userUid,function(err,res){
            if(err || res == null){
                cb("dbError");
            } else{
                isDouble = res["leagueTitle"] == 2?true:false;
                cb(null);
            }
        });
    }, function (cb){
        userVariable.setVariable(userUid, "leagueStarReward", jutil.now(), cb);
    }, function (cb){
        returnData["rewardList"] = [];
        async.eachSeries(returnData["reward"], function (item, forCb) {
            mongoStats.dropStats(item["id"], userUid, response.ip, null, mongoStats.LEAGUE_STAR, isDouble?item["count"]*2:item["count"], item["level"], item["isPatch"]);
            modelUtil.addDropItemToDB(item["id"], isDouble?item["count"]*2:item["count"], userUid, item["isPatch"], item["level"], function (err, res) {
                if (err) {
                    forCb(err);
                } else {
                    if (res instanceof Array) {
                        for (var i in res) {
                            returnData["rewardList"].push(res[i]);
                        }
                    } else {
                        returnData["rewardList"].push(res);
                    }
                    forCb(null);
                }
            });
        }, function (err, res) {
            cb(err);
        });
    }],function(err){
        if (err) {
            response.echo("leagueStar.reward",jutil.errorInfo(err));
        } else {
            response.echo("leagueStar.reward", returnData);
        }
    });
}

exports.start = start;