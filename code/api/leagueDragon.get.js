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

function start(postData, response, query) {
    var userUid = query["userUid"];
    var leagueUid;
    var returnData;
    var configData = configManager.createConfig(userUid);
    var dragonConfig = configData.getConfig("starCraft");
    async.series([function (cb) {   ///获取userInfo，体力是否充足
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
            else if(league.leagueExpToLevel(userUid, res["exp"]) < dragonConfig["openLeagueLv"])
                cb("noOpen");
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
    }, function(cb){//取得地图配置
        leagueDragon.getDragon(userUid, leagueUid, function(err, res){
            if(err)
                cb("dbError");
            else{
                returnData = res;
                cb(null);
            }
        });
    }, function(cb){
        leagueDragon.getStar(userUid, returnData["starId"], function(err, res){
            if(err/* || res == null || (res["starId"] != 0 && res["leagueUid"] != leagueUid)*/)
                cb("dbError");
            else {
                returnData["starData"] = res;
                returnData["starData"]["hasTimes"] = Math.floor((jutil.now() - res["hasTime"])/ 604800);
                cb(null);
            }
        });
    }],function(err){
        if (err) {
            response.echo("leagueDragon.get",jutil.errorInfo(err));
        } else {
            response.echo("leagueDragon.get",returnData);
        }
    });
}

exports.start = start;