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
        response.echo("leagueStar.signView", jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var starId = postData["starId"];
    var configData = configManager.createConfig(userUid);
    var dragonConfig = jutil.deepCopy(configData.getConfig("starCraft"));
    var mCode = bitUtil.parseUserUid(userUid);

    var startTime = jutil.monday() + dragonConfig["startWeektime"];

    if(jutil.now() < startTime)
        startTime -= 604800;
    var returnData = {};
    var rewardStart = startTime+dragonConfig["doTime"]["rewardStart"];
    if(jutil.now() < rewardStart)
        rewardStart -= 604800;
    async.series([function (cb) {   ///获取userInfo，体力是否充足
//        if (startTime+dragonConfig["doTime"]["signTimeStart"] <= jutil.now() && jutil.now() <= startTime+dragonConfig["doTime"]["signTimeEnd"]) {//报名时间内
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
                returnData["myLeague"] = {"leagueUid":res["leagueUid"]};
                cb(null);
            }
        });
    }, function(cb){//验证联盟数据存在
        league.getLeague(userUid, returnData["myLeague"]["leagueUid"], function(err, res){
            if (err)
                cb("dbError");
            else if(res == null)
                cb("noLeague");
            else{
                returnData["myLeague"]["leagueExp"] = res["exp"];
                returnData["myLeague"]["leagueName"] = jutil.toBase64(res["leagueName"]);
                cb(null);
            }
        });
    }, function(cb){
        league.getMember(userUid, returnData["myLeague"]["leagueUid"], userUid, function(err,res){
            if(err || res == null){
                cb("dbError");
            } else{
                cb(null);
            }
        });
    }, function(cb){//取得地图配置
        leagueDragon.getDragon(userUid, returnData["myLeague"]["leagueUid"], function(err, res){
            if(err)
                cb("dbError");
            else{
                if(res == null)
                    returnData["myLeague"]["dragonLv"] = 0;
                else
                    returnData["myLeague"]["dragonLv"] = res["lv"];
                cb(null);
            }
        });
    }, function (cb) {
        leagueDragon.getContribution(userUid, returnData["myLeague"]["leagueUid"], rewardStart, function(err, res){
            returnData["myLeague"]["contribution"] = res == null?0:res;
            cb(err);
        });
    }, function (cb) {
        leagueDragon.starSignView(userUid, starId, rewardStart, function(err, res){
            returnData["list"] = res;
            cb(err);
        });
    }],function(err){
        if (err) {
            response.echo("leagueStar.signView",jutil.errorInfo(err));
        } else {
            response.echo("leagueStar.signView",returnData);
        }
    });
}

exports.start = start;