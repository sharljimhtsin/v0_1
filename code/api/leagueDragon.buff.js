/**
 * Created with JetBrains WebStorm.
 * User: joseppe
 * Date: 15-04-28
 * Time: 下午14:52
 * 联盟buff
 */

var league = require("../model/league");
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var userVariable = require("../model/userVariable");
var configManager = require("../config/configManager");
var leagueDragon = require("../model/leagueDragon");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "type", "count") == false) {
        response.echo("leagueDragon.buff", jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var type = postData["type"];
    var count = postData["count"]-0;
    var leagueUid;
    var configData = configManager.createConfig(userUid);
    var dragonConfig = configData.getConfig("starCraft");
    var leagueContribution;
    var dragonData;

    async.series([function (cb) {   ///获取userInfo，体力是否充足
        user.getUser(userUid, function (err, res) {
            if (err || res == null) {
                cb("noThisUser");
            } else if(res["leagueUid"] == 0 || res["leagueUid"] == ""){
                cb("noLeague");
            } else if(res["leagueContribution"] - count < 0){
                cb("ContributionNotEough");
            } else {
                leagueContribution = res["leagueContribution"] - 0;
                leagueUid = res["leagueUid"];
                cb(null);
            }
        })
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
        leagueDragon.getDragon(userUid,leagueUid,function(err, res){
            if(err)
                cb("dbError");
            else{
                dragonData = res;
                cb(null);
            }
        });
    }, function(cb){//取得地图配置
        var lvData = leagueDragon.toNewLvAndExp(dragonConfig["attribExp"], dragonData["lv"], dragonData[type+"Lv"], dragonData[type+"Exp"]+count);
        dragonData[type+"Lv"] = lvData[0];
        dragonData[type+"Exp"] = lvData[1];
        count -= lvData[2];
        leagueDragon.setDragon(userUid, dragonData, cb);
    }, function(cb){//取得地图配置
        user.updateUser(userUid, {"leagueContribution":leagueContribution-count}, cb);
    }],function(err){
        if (err) {
            response.echo("leagueDragon.buff", jutil.errorInfo(err));
        } else {
            response.echo("leagueDragon.buff", {"dragonData":dragonData, "leagueContribution":leagueContribution-count});
        }
    });
}

exports.start = start;