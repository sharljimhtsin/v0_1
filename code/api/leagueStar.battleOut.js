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
var bitUtil = require("../alien/db/bitUtil");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "starId") == false) {
        response.echo("leagueStar.battleOut", jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var starId = postData["starId"];
    var configData = configManager.createConfig(userUid);
    var dragonConfig = jutil.deepCopy(configData.getConfig("starCraft"));
    var returnData;
    var signList = [];
    var ranks;
    var round;
    var defLeagueUid;
    var actLeagueUid;
    var leagueUid;
    var mCode = bitUtil.parseUserUid(userUid);

    var startTime = jutil.monday() + dragonConfig["startWeektime"];

    if(jutil.now() < startTime)
        startTime -= 604800;

    var rewardStart = startTime+dragonConfig["doTime"]["rewardStart"];
    if(jutil.now() < rewardStart)
        rewardStart -= 604800;
    async.series([function (cb) {   ///获取userInfo，体力是否充足
        if (startTime+dragonConfig["doTime"]["battleIn1"] <= jutil.now() && jutil.now() <= startTime+dragonConfig["doTime"]["battleTime1"]-180) {//报名时间内
            round = 1;
            cb(null);
        } else if (startTime+dragonConfig["doTime"]["battleIn2"] <= jutil.now() && jutil.now() <= startTime+dragonConfig["doTime"]["battleTime2"]-180) {
            round = 2;
            cb(null);
        } else {
            cb("inBattleTime");
        }
    }, function(cb) {
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
    }, function(cb){
        league.getMember(userUid,leagueUid,userUid,function(err,res){
            if(err || res == null){
                cb("dbError");
            } else{
                cb(null);
            }
        });
    }, function(cb) {
        leagueDragon.getStar(userUid, starId, function(err, res){
            if(err)
                cb("dbError");
            else if(res == null || res["leagueUid"] == 0){//未被占领
                cb(null);
            } else {
                defLeagueUid = res["leagueUid"];
                cb(null);
            }
        });
    }, function(cb) {
        leagueDragon.starSignView(userUid, starId, rewardStart, function(err, res){
            if(err)
                cb("dbError");
            else if(res == null || res.length == 0){
                cb("noSign");
            } else if(res.length == 1 && round == 2){
                cb("battleOver");
            } else {
                var signList = res.slice(0,2);
                actLeagueUid = signList[round-1]["leagueUid"];
                cb(null);
            }
        });
    }, function(cb) {
        leagueDragon.getlastWin(userUid, starId, function(err, res){
            if(err)
                cb("dbError");
            else {
                defLeagueUid = res == null?defLeagueUid:res["leagueUid"];
                cb(null);
            }
        });
    }, function(cb) {
        if(leagueUid == defLeagueUid || leagueUid == actLeagueUid){
            leagueDragon.outBattleRank(userUid, starId, leagueUid == defLeagueUid?"def":"act", cb);
        } else {
            cb("noBattle");
        }
    }],function(err){
        if (err) {
            response.echo("leagueStar.battleOut",jutil.errorInfo(err));
        } else {
            response.echo("leagueStar.battleOut", {"status":1});
        }
    });
}

exports.start = start;