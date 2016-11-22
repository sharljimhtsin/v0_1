/**
 * Created with JetBrains WebStorm.
 * User: joseppe
 * Date: 14-11-11
 * Time: 上午1:06
 * 联盟副本掉落日志
 */


var league = require("../model/league");
var leagueMap = require("../model/leagueMap");
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var configManager = require("../config/configManager");


function start(postData, response, query) {
    if (jutil.postCheck(postData,"leagueUid","bigMapId") == false) {
        response.echo("leagueMap.lootLog",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var leagueUid = postData["leagueUid"];
    var bigMapId = postData["bigMapId"];

    var loots = [];
    async.series([
        function(cb){//验证联盟数据存在
            league.getLeague(userUid,leagueUid,function(err, res){
                if (err)
                    cb("dbError");
                else if(res == null)
                    cb("noLeague");
                else
                    cb(null);
            });
        },
        function(cb){
            league.getMember(userUid,leagueUid,userUid,function(err,res){
                if(err || res == null){
                    cb("dbError");
                } else{
                    cb(null);
                }
            });
        },
        function(cb){//取得地图掉落
            leagueMap.getLoot(userUid,leagueUid,bigMapId,function(err,res){//取得掉落所有日志
                if(err){
                    cb("dbError");
                } else{
                    //loots = res;
                    for(var i in res){
                        var loot = res[i];
                        if(loot["status"] == 0 || loot["lootTimeout"] > jutil.now()){
                            continue;
                        }
                        loots.push(loot);
                    }
                    //排序
                    loots.sort(function(x, y) {
                        return x.lootTimeout - y.lootTimeout;
                    });
                    loots = loots.slice(0,20);
                    cb(null);
                }
            });
        },
        function(cb){
            async.each(loots, function(loot, forCb){
                if(loot["userUid"]-0 > 0){
                    user.getUser(loot["userUid"],function(err,res){
                        if(err || res == null){
                            loot["userName"] = jutil.toBase64("");
                            forCb(null);
                        } else{
                            loot["userName"] = res["userName"];
                            forCb(null);
                        }
                    });
                } else {
                    loot["userName"] = jutil.toBase64("");
                    forCb(null);
                }
            }, function(err){
                cb(err);
            });
        }
    ],function(err){
        if (err) {
            response.echo("leagueMap.lootLog",jutil.errorInfo(err));
        } else {
            response.echo("leagueMap.lootLog",loots);
        }
    });
}

exports.start = start;