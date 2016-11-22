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
var configManager = require("../config/configManager");
var leagueDragon = require("../model/leagueDragon");
var mongoStats = require("../model/mongoStats");

function start(postData, response, query) {
    var userUid = query["userUid"];
    var leagueUid;
    var configData = configManager.createConfig(userUid);
    var dragonConfig = jutil.deepCopy(configData.getConfig("starCraft"));
    var winTimes;
    var ingot;

    var startTime = jutil.monday() + dragonConfig["startWeektime"];

    if(jutil.now() < startTime)
        startTime -= 604800;

    async.series([function (cb) {   ///获取userInfo，体力是否充足
        if (startTime+dragonConfig["doTime"]["battleIn1"] <= jutil.now() && jutil.now() <= startTime+dragonConfig["doTime"]["battleTime1"]-180) {//报名时间内
            cb(null);
        } else if (startTime+dragonConfig["doTime"]["battleIn2"] <= jutil.now() && jutil.now() <= startTime+dragonConfig["doTime"]["battleTime2"]-180) {
            cb(null);
        } else {
            cb("inBattleTime");
        }
    }, function(cb){//验证联盟数据存在
        user.getUser(userUid, function (err, res) {
            if (err || res == null) {
                cb("noThisUser");
            } else if(res["leagueUid"] == 0 || res["leagueUid"] == ""){
                cb("noLeague");
            } else {
                leagueUid = res["leagueUid"];
                ingot = res["ingot"];
                cb(null);
            }
        })
    }, function(cb){//验证联盟数据存在
        league.getLeague(userUid,leagueUid,function(err, res){
            if (err)
                cb("dbError");
            else if(res == null)
                cb("noLeague");
            else
                cb(null);
        });
    }, function(cb){
        leagueDragon.getWinTimes(userUid, function(err, res){
            if(err || res == null)
                cb("dbError");
            else if(res >= dragonConfig["maxWinTimes"]){
                cb("timesNotEnough");
            } else {
                winTimes = res;
                cb(null);
            }
        });
    }, function(cb){
        ingot = ingot - dragonConfig["winTimesPay"][winTimes];
        if(ingot < 0){
            cb("ingotNotEnough");
        } else {
            mongoStats.expendStats("ingot", userUid, '127.0.0.1', null, mongoStats.E_LEAGUESTAR_ADDWINS, dragonConfig["winTimesPay"][winTimes]);
            user.updateUser(userUid, {"ingot":ingot}, cb);
        }
    }, function(cb){
        leagueDragon.addWinTimes(userUid, cb);
        winTimes++
    }],function(err){
        if (err) {
            response.echo("leagueStar.addWins",jutil.errorInfo(err));
        } else {
            response.echo("leagueStar.addWins",{"winTimes":winTimes,"userData":{"ingot":ingot}});
        }
    });
}

exports.start = start;