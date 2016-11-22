/**
 * Created with JetBrains WebStorm.
 * User: joseppe
 * Date: 14-11-11
 * Time: 下午13:41
 * 联盟副本伤害排行
 */


var league = require("../model/league");
var leagueMap = require("../model/leagueMap");
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var configManager = require("../config/configManager");


function start(postData, response, query) {
    if (jutil.postCheck(postData,"leagueUid","leagueMapId") == false) {
        response.echo("leagueMap.hurtList",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var leagueUid = postData["leagueUid"];
    var leagueMapId = postData["leagueMapId"];

    var hurtList = [];
    var myHurt = {};
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
        function(cb){
            leagueMap.getUserHurt(userUid,leagueMapId,function(err,res){
                if(err){
                    cb("dbError");
                } else{
                    res.sort(function(x,y){
                        return y.hurt - x.hurt;
                    });
                    myHurt = {"top":0,"hurt":0};
                    for(var i in res){
                        if(res[i]["userUid"] == userUid){
                            myHurt["top"] = i-0+1;
                            myHurt["hurt"] = res[i]["hurt"];
                        }
                    }
                    hurtList = res;
                    hurtList = hurtList.slice(0,20);
                    cb(null);
                }
            });
        },
        function(cb){
            async.each(hurtList, function(hurt, esCb){
                user.getUser(hurt["userUid"],function(err, res){
                    hurt["userName"] = res["userName"];
                    esCb(null);
                })
            }, function(err, res){
                cb(null);
            })
        }
    ],function(err){
        if (err) {
            response.echo("leagueMap.hurtList",jutil.errorInfo(err));
        } else {
            response.echo("leagueMap.hurtList",{"hurtList":hurtList,"myHurt":myHurt});
        }
    });
}

exports.start = start;