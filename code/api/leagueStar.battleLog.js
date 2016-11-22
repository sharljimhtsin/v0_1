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
    if (jutil.postCheck(postData, "starId","round","times") == false) {
        response.echo("leagueStar.battleLog", jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var starId = postData["starId"];
    var round = postData["round"];
    var times = postData["times"];
    var configData = configManager.createConfig(userUid);
    var dragonConfig = jutil.deepCopy(configData.getConfig("starCraft"));
    var returnData;
    var round;
    var leagueUid;

    var startTime = jutil.monday() + dragonConfig["startWeektime"];
    if(jutil.now() < startTime)
        startTime -= 604800;

    async.series([function (cb) {   ///获取userInfo，体力是否充足
//        if (startTime+dragonConfig["doTime"]["battleTime1"] <= jutil.now() && jutil.now() <= startTime+dragonConfig["doTime"]["battleIn2"]) {//报名时间内
//            cb(null);
//        } else if (startTime+dragonConfig["doTime"]["battleTime2"] <= jutil.now()) {
//            cb(null);
//        } else {
//            cb("timeOut");
//        }
//    }, function(cb) {
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
        leagueDragon.getBattleRoundData(userUid, starId, round, function(err, res){
            if(err || res == null || res[times] == undefined){
                cb("dbError");
            } else {
                returnData = res[times];
                cb(null);
            }
        });
    }],function(err){
        if (err) {
            response.echo("leagueStar.battleLog", jutil.errorInfo(err));
        } else {
            response.echo("leagueStar.battleLog", returnData);
        }
    });
}

exports.start = start;