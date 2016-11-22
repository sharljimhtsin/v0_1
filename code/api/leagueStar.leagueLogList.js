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
        response.echo("leagueStar.leagueLogList", jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var starId = postData["starId"];
    var configData = configManager.createConfig(userUid);
    var dragonConfig = jutil.deepCopy(configData.getConfig("starCraft"));
    var returnData = [];
    var leagues;

    var startTime = jutil.monday() + dragonConfig["startWeektime"];

    if(jutil.now() < startTime)
        startTime -= 604800;

    async.series([function (cb) {   ///获取userInfo，体力是否充足
        if (startTime+dragonConfig["doTime"]["battleIn1"] <= jutil.now() && jutil.now() <= startTime+dragonConfig["doTime"]["battleTime1"]) {//报名时间内
            cb("inBattleTime");
        } else if (startTime+dragonConfig["doTime"]["battleIn2"] <= jutil.now() && jutil.now() <= startTime+dragonConfig["doTime"]["battleTime2"]) {
            cb("inBattleTime");
        } else {
            cb(null);
        }
    }, function(cb) {
        leagueDragon.getLeagueRoundData(userUid, 1, starId, function(err, res){
            if(!err && res != null){
                returnData.push({"round":1,"defLeagueUid":res["enemyTeam"]["leagueUid"], "defLeagueName":res["enemyTeam"]["name"], "actLeagueUid":res["ownTeam"]["leagueUid"],"actLeagueName":res["ownTeam"]["name"], "isWin":res["isWin"]});
            }
            cb(err);
        });
    }, function(cb) {
        leagueDragon.getLeagueRoundData(userUid, 2, starId, function(err, res){
            if(!err && res != null)
                returnData.push({"round":2,"defLeagueUid":res["enemyTeam"]["leagueUid"], "defLeagueName":res["enemyTeam"]["name"], "actLeagueUid":res["ownTeam"]["leagueUid"],"actLeagueName":res["ownTeam"]["name"], "isWin":res["isWin"]});
            cb(err);
        });
    }],function(err){
        if (err) {
            response.echo("leagueStar.leagueLogList",jutil.errorInfo(err));
        } else {
            response.echo("leagueStar.leagueLogList",returnData);
        }
    });
}

exports.start = start;