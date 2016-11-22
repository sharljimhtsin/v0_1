/**
 * Created with JetBrains WebStorm.
 * User: kongyajie
 * Date: 14-6-19
 * Time: 下午7:59
 * To change this template use File | Settings | File Templates.
 */

var league = require("../model/league");
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var configManager = require("../config/configManager");
var leagueDragon = require("../model/leagueDragon");
var stats = require("../model/stats");
var mongoStats = require("../model/mongoStats");

/**
 * 解散联盟
 * @param postData  ({"leagueUid":xx})
 * @param response
 * @param query
 */

function start(postData, response, query) {
    if (jutil.postCheck(postData,"leagueUid") == false) {
        response.echo("league.destroy",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var leagueUid = postData["leagueUid"];
    var starId = 0;

    var leagueMemberUserUids = [];
    var configData = configManager.createConfig(userUid);
    var dragonConfig = jutil.deepCopy(configData.getConfig("starCraft"));

    var startTime = jutil.monday() + dragonConfig["startWeektime"];

    if(jutil.now() < startTime)
        startTime -= 604800;


    async.series([
        //检测是否有权限（只有会长才有）
        function(cb){
            if(jutil.now() >= startTime+dragonConfig["doTime"]["battleIn1"] && jutil.now() <= startTime+dragonConfig["doTime"]["battleEnd"]){
                cb("battleTime");
            } else {
                cb(null);
            }
        },
        function(cb){
            league.getMember(userUid,leagueUid,userUid,function(err,res){
                if(err || res == null){
                    cb("dbError");
                }else{
                    var title = res["leagueTitle"];
                    if(title != 2){//不是会长
                        cb("limitedLeagueAuthority");
                    }else{
                        cb(null);
                    }
                }
            });
        },
        //删除联盟
        function(cb){
            leagueDragon.getDragon(userUid,leagueUid,function(err,res){
                if(err) cb(err);
                else{
                    starId = res["starId"];
                    cb(null);
                }
            });
        },
        function(cb){
            if(starId != 0){
                leagueDragon.removeStar(userUid, leagueUid, starId, cb);
            } else {
                cb(null);
            }
        },
        function(cb){
            leagueDragon.delDragon(userUid, leagueUid, cb);
        },
        //获得联盟中所有成员的UserUid
        function(cb){
            league.getMembers(userUid,leagueUid,function(err,res){
                if(err) cb(err);
                else{
                    for(var key in res){
                        leagueMemberUserUids.push(key);
                    }
                    cb(null);
                }
            });
        },
        //删除联盟成员
        function(cb){
            league.delMembers(userUid,leagueUid,function(err,res){
                if(err) cb(err);
                else{
                    cb(null);
                }
            });
        },
        //更新联盟成员的数据
        function(cb){
            async.forEach(leagueMemberUserUids,function(item,forCb) {
                var newUserData = {"leagueUid":"0"};
                user.updateUser(item,newUserData,function(err,res){
                    if(err || res == null){
                        forCb("dbError");
                    } else{
                        forCb(null);
                    }
                });
            },function(err,res){
                if(err) cb(err);
                else cb(null);
            });
        },
        //删除联盟申请
        function(cb){
            league.delLeagueAllApply(userUid,leagueUid,cb);
        },
        //删除联盟
        function(cb){
            league.delLeague(userUid,leagueUid,function(err,res){
                if(err) cb(err);
                else{
                    stats.events(userUid,"127.0.0.1",null,mongoStats.A_LEAGUEDESTROY1);//联盟解散事件触发
                    cb(null);
                }
            });
        }
    ],function(err){
        if (err) {
            response.echo("league.destroy",jutil.errorInfo(err));
        } else {
            response.echo("league.destroy",{"result":1});
        }
    });
}

exports.start = start;