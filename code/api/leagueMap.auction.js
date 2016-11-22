/**
 * Created with JetBrains WebStorm.
 * User: joseppe
 * Date: 14-11-1
 * Time: 下午21:53
 * 联盟副本掉落获取
 */


var league = require("../model/league");
var leagueMap = require("../model/leagueMap");
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var configManager = require("../config/configManager");
var mongoStats = require("../model/mongoStats");



function start(postData, response, query) {
    if (jutil.postCheck(postData,"leagueUid","bigMapId","lootId","contribution") == false) {
        response.echo("leagueMap.auction",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var leagueUid = postData["leagueUid"];
    var bigMapId = postData["bigMapId"];
    var lootId = postData["lootId"];
    var contribution = postData["contribution"];
    if(contribution <= 0){
        response.echo("leagueMap.auction",jutil.errorInfo("postError"));
        return ;
    }
    var userData;
    var newUserData;

    var outTime = 0;
    async.series([
        function (cb) {   ///获取userInfo，体力是否充足
            user.getUser(userUid, function (err, res) {
                if (err || res == null) {
                    cb("noThisUser");
                } else {
                    userData = res;
                    if(userData["leagueContribution"] < contribution){
                        cb("contributionNotEnough")
                    } else {
                        cb(null);
                    }
                }
            })
        },
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
            leagueMap.getLoot(userUid,leagueUid,bigMapId,function(err,res){//取得未过期掉落
                if(err){
                    cb("dbError");
                } else{
                    var noloot = true;
                    for(var i in res){
                        if(i == lootId && res[i]["lootTimeout"] >= jutil.now()){
                            noloot = false;
                            break;
                        }
                    }
                    if(noloot){
                        cb("dateOut");
                    } else {
                        cb(null);
                    }
                }
            });
        },
        function(cb){//取得竞拍信息
            leagueMap.getAuction(userUid,lootId,function(err,res){
                if(err){
                    cb("dbError");
                } else if(res == null){
                    cb(null);
                } else {
                    var already = false;
                    for(var i in res){
                        if(res[i]["userUid"] == userUid){
                            already = true;
                        }
                    }
                    if(already){
                        cb("alreadyAuction");
                    } else {
                        cb(null);
                    }
                }
            });
        },
        function(cb){//扣除个人贡献值
            newUserData = {"leagueContribution":userData["leagueContribution"] - contribution};
            mongoStats.expendStats("contribution", userUid, '127.0.0.1', userData, mongoStats.E_LEAGUE_AUCTION, contribution);
            user.updateUser(userUid,newUserData,function(err,res){
                if(err){
                    cb("dbError");
                } else {
                    cb(null);
                }
            });
        },
        function(cb){//写入竞拍信息
            var data = {"lootId":lootId, "userUid":userUid, "leagueUid":leagueUid,"contribution":contribution,"outTime":outTime};
            leagueMap.setAuction(userUid,data,function(err,res){
                if(err){
                    cb("dbError");
                } else {
                    cb(null);
                }
            });
        }
    ],function(err){
        if (err) {
            response.echo("leagueMap.auction",jutil.errorInfo(err));
        } else {
            response.echo("leagueMap.auction",newUserData);
        }
    });
}

exports.start = start;