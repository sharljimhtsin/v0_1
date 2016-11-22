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
    var userUid = query["userUid"];
    var configData = configManager.createConfig(userUid);
    var dragonConfig = configData.getConfig("starCraft");
    var returnData = {};
    var leagueUid;
    var startTime = jutil.monday() + dragonConfig["startWeektime"];
    var mCode = bitUtil.parseUserUid(userUid);

    if(jutil.now() < startTime)
        startTime -= 604800;
    async.series([function (cb) {
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
    }, function(cb){
        league.getLeague(userUid, leagueUid, function(err, res){
            if (err)
                cb("dbError");
            else if(res == null)
                cb("noLeague");
            else
                cb(null);
        });
    }, function(cb){
        league.getMember(userUid, leagueUid, userUid,function(err,res){
            if(err || res == null){
                cb("dbError");
            } else{
                cb(null);
            }
        });
    }, function(cb){
        for(var key in dragonConfig["doTime"]){
            returnData[key] = startTime + dragonConfig["doTime"][key];
        }
        if(jutil.now() < returnData["rewardStart"]){
            returnData["rewardStart"] -= 604800;
            returnData["rewardEnd"] -= 604800;
        }
        cb(null);
    }, function(cb){
        leagueDragon.getDragon(userUid, leagueUid, function(err, res){
            if(err)
                cb("dbError");
            else if(res["lv"] < dragonConfig["openDragonLv"]){
                cb("StarCraftNoOpen");
            } else {
                returnData["dragonData"] = res;
                cb(null);
            }
        });
    }, function(cb){
        var rewardStart = startTime+dragonConfig["doTime"]["rewardStart"];
        if(jutil.now() < rewardStart)
            rewardStart -= 604800;
        leagueDragon.getContribution(userUid, leagueUid, rewardStart, function(err, res){
            if(err)
                cb("dbError");
            else{
                returnData["contribution"] = res == null?0:res;
                cb(null);
            }
        });
    }, function(cb){
        leagueDragon.getSignStar(userUid, leagueUid, function(err, res){
            if(err)
                cb("dbError");
            else{
                returnData["signStar"] = res;
                cb(null);
            }
        });
    }, function(cb) {
        leagueDragon.getStars(userUid, function(err, res){
            if(err)
                cb("dbError");
            else {
                returnData["starList"] = res;
                if(returnData["starList"]["0"] != undefined){
                    delete returnData["starList"]["0"];
                }
                cb(null);
            }
        });
    }, function(cb) {
        async.eachSeries(Object.keys(dragonConfig["stars"]), function(starId, esCb){
            if(returnData["starList"][starId] == undefined || returnData["starList"][starId]["leagueUid"] == "0"){
                returnData["starList"][starId] = {"holdLeague":{"leagueName":"","leagueUid":0,"exp":0,"type":1}, "hasTimes":0,"starId":starId,"leagueUid":0};
                esCb(null);
            } else {
                var lUserUid = bitUtil.createUserUid(mCode[0], returnData["starList"][starId]["serverId"], 0);
                league.getLeague(lUserUid, returnData["starList"][starId]["leagueUid"], function(err, res){
                    if(err || res == null){
                        returnData["starList"][starId] = {"holdLeague":{"leagueName":"","leagueUid":0,"exp":0,"type":1}, "hasTimes":0,"starId":starId,"leagueUid":0};
                        esCb(null);
                    } else {
                        returnData["starList"][starId]["holdLeague"] = {"leagueName":jutil.toBase64(res["leagueName"]),"leagueUid":res["leagueUid"],"exp":res["exp"],"type":res["type"]};
                        returnData["starList"][starId]["hasTimes"] = Math.floor((jutil.now() - returnData["starList"][starId]["hasTime"])/ 604800);
                        esCb(null);
                    }
                });
            }
        }, cb);
    }, function(cb) {
        returnData["dragonData"]["starData"] = returnData["starList"][returnData["dragonData"]["starId"]];
        cb(null);
    }],function(err){
        if (err) {
            response.echo("leagueStar.getList",jutil.errorInfo(err));
        } else {
            response.echo("leagueStar.getList",returnData);
        }
    });
}

exports.start = start;