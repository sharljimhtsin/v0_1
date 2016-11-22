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
var formation = require("../model/formation");


function start(postData, response, query) {
    if (jutil.postCheck(postData, "starId") == false) {
        response.echo("leagueStar.battleIn", jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var starId = postData["starId"];
    var configData = configManager.createConfig(userUid);
    var dragonConfig = jutil.deepCopy(configData.getConfig("starCraft"));
    var returnData = {};
    //var signList = [];
    //var ranks;
    var round;
    var defLeagueUid;
    var actLeagueUid;
    var leagueUid;
    var leagueName;
    var mCode = bitUtil.parseUserUid(userUid);
    var userName;
    var heroId;
    var serverId;

    var startTime = jutil.monday() + dragonConfig["startWeektime"];

    if(jutil.now() < startTime)
        startTime -= 604800;

    var rewardStart = startTime+dragonConfig["doTime"]["rewardStart"];
    if(jutil.now() < rewardStart)
        rewardStart -= 604800;
    var isIn = false;
    async.series([function (cb) {   ///获取userInfo，体力是否充足
        if (startTime+dragonConfig["doTime"]["battleIn1"] <= jutil.now() && jutil.now() <= startTime+dragonConfig["doTime"]["battleTime1"]-180) {//报名时间内
            round = 1;
            cb(null);
        } else if (startTime+dragonConfig["doTime"]["battleTime1"]-180 <= jutil.now() && jutil.now() <= startTime+dragonConfig["doTime"]["battleTime1"]) {
            round = 1;
            isIn = true;
            cb(null);
        } else if (startTime+dragonConfig["doTime"]["battleIn2"] <= jutil.now() && jutil.now() <= startTime+dragonConfig["doTime"]["battleTime2"]-180) {
            round = 2;
            cb(null);
        } else if (startTime+dragonConfig["doTime"]["battleTime2"]-180 <= jutil.now() && jutil.now() <= startTime+dragonConfig["doTime"]["battleTime2"]) {
            round = 2;
            isIn = true;
            cb(null);
        } else {
            cb("notBattleTime");
        }
    }, function(cb) {
        user.getUser(userUid, function (err, res) {
            if (err || res == null) {
                cb("noThisUser");
            } else if(res["leagueUid"] == 0 || res["leagueUid"] == ""){
                cb("noLeague");
            } else {
                leagueUid = res["leagueUid"];
                userName = jutil.fromBase64(res["userName"]);
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
                leagueName = res["leagueName"];
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
                serverId = res["serverId"];
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
                returnData["actLeagueName"] = signList[round-1]["leagueName"];
                cb(null);
            }
        });
    }, function(cb) {
        leagueDragon.getlastWin(userUid, starId, function(err, res){
            if(err)
                cb("dbError");
            else if(res == null){
                cb(null);
            } else {
                defLeagueUid = res["leagueUid"];
                serverId = res["serverId"];
                cb(null);
            }
        });
    }, function(cb) {
        formation.getUserHeroId(userUid, function(err, res){
            heroId = res;
            cb(err);
        });
    }, function(cb) {
        if(leagueUid == defLeagueUid || leagueUid == actLeagueUid){
            //把人塞入备战队列
            leagueDragon.getBattleRank(mCode[0], starId, leagueUid == defLeagueUid?"def":"act", function(err, res){
                if(err){
                    cb(err);
                } else if(res != null && res.length >= dragonConfig["monsterCount"]) {
                    cb("maxRank");
                } else {
                    for(var i in res){
                        if(res[i]["userUid"] == userUid){
                            isIn = true;
                        }
                    }
                    cb(null);
                }
            });
        } else {
            cb("noBattle");
        }
    }, function(cb){
        if(isIn){
            cb(null);
        } else {
            leagueDragon.intoBattleRank(userUid, starId, leagueUid == defLeagueUid?"def":"act", userName, heroId, function(err, res){
                //leagueDragon.intoBattleRankLeague(userUid, starId, leagueUid == defLeagueUid?"def":"act", mCode[1]+"|"+leagueUid);
                cb(err);
            });
        }
    }, function(cb){
        if(defLeagueUid == null || defLeagueUid == 0){
            returnData["defList"] = [];
            for(var i = 0; i < dragonConfig["monsterCount"]; i++){
                returnData["defList"].push({"userUid":0,"userName":jutil.toBase64(dragonConfig["stars"][starId]["monsterName"]), "heroId":dragonConfig["stars"][starId]["monster"]});
            }
            cb(null);
        } else {
            leagueDragon.getBattleRank(mCode[0], starId, "def", function(err, res){
                returnData["defList"] = res;
                cb(err);
            });
        }
    }, function(cb){
        leagueDragon.getBattleRank(mCode[0], starId, "act", function(err, res){
            returnData["actList"] = res;
            cb(err);
        });
    }, function(cb){
        if(defLeagueUid == null || defLeagueUid == 0){
            returnData["defLeagueName"] = jutil.toBase64(dragonConfig["stars"][starId]["monsterName"]);
            cb(null);
        } else if(defLeagueUid ==  leagueUid){
            returnData["defLeagueName"] = jutil.toBase64(leagueName);
            cb(null);
        } else {
            var luserUid = bitUtil.createUserUid(mCode[0], serverId, 0);
            league.getLeague(luserUid, defLeagueUid, function(err, res){
                if(err || res == null){
                    cb("dbError");
                } else {
                    returnData["defLeagueName"] = jutil.toBase64(res["leagueName"]);
                    cb(null);
                }
            });
        }
    }, function(cb) {
        leagueDragon.getWinTimes(userUid, function(err, res){
            if(err)
                cb(err);
            else {
                returnData["winTimes"] = res;
                cb(null);
            }
        });
    }],function(err){
        if (err) {
            response.echo("leagueStar.battleIn",jutil.errorInfo(err));
        } else {
            response.echo("leagueStar.battleIn",returnData);
        }
    });
}

exports.start = start;