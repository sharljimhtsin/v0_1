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
    if (jutil.postCheck(postData, "starId") == false) {
        response.echo("leagueStar.sign", jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var starId = postData["starId"];
    var DragonData;
    var leagueUid;
    var configData = configManager.createConfig(userUid);
    var dragonConfig = jutil.deepCopy(configData.getConfig("starCraft"));

    var startTime = jutil.monday() + dragonConfig["startWeektime"];

    //var signData = {"userUid":userUid, "signTime":jutil.now(), "starId":starId};
    if(jutil.now() < startTime)
        startTime -= 604800;
    async.series([function (cb) {   ///获取userInfo，体力是否充足
        if (startTime+dragonConfig["doTime"]["signTimeStart"] <= jutil.now() && jutil.now() <= startTime+dragonConfig["doTime"]["signTimeEnd"]) {//报名时间内
            cb(null);
        } else {
            cb("timeOut");
        }
    }, function(cb){//验证联盟数据存在
        user.getUser(userUid, function (err, res) {
            if (err || res == null) {
                cb("noThisUser");
            } else if(res["leagueUid"] == 0 || res["leagueUid"] == ""){
                cb("noLeague");
            } else {
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
            else
                cb(null);
        });
    }, function(cb){
        league.getMember(userUid,leagueUid,userUid,function(err,res){
            if(err || res == null){
                cb("dbError");
            } else{
                var title = res["leagueTitle"];
                if(title != 1 && title != 2){//不是会长或副会长
                    cb("limitedLeagueAuthority");
                }else{
                    cb(null);
                }
            }
        });
    }, function(cb){//取得地图配置
        leagueDragon.getDragon(userUid,leagueUid,function(err, res){
            if(err)
                cb("dbError");
            else {
                DragonData = res;
                cb(null);
            }
        });
    }, function(cb){
        if(DragonData["starId"] != 0){//放弃之前星球
            leagueDragon.removeStar(userUid, leagueUid, DragonData["starId"], cb);
        } else {
            cb(null);
        }
    }, function(cb){
        leagueDragon.signStar(userUid, leagueUid, starId, function(err, res){
            if(err)
                cb(err);
            else {
                cb(null);
            }
        });
    }],function(err){
        if (err) {
            response.echo("leagueStar.sign",jutil.errorInfo(err));
        } else {
            response.echo("leagueStar.sign",{});
        }
    });
}

exports.start = start;