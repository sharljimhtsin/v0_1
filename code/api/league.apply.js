/**
 * Created with JetBrains WebStorm.
 * User: kongyajie--联盟申请
 * Date: 14-6-19
 * Time: 下午7:59
 * To change this template use File | Settings | File Templates.
 */

var league = require("../model/league");
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");

/**
 * 发送加入联盟申请
 * @param postData  ({"leagueUid":xx})
 * @param response
 * @param query
 */

function start(postData, response, query) {
    if (jutil.postCheck(postData,"leagueUid") == false) {
        response.echo("league.apply",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var leagueUid = postData["leagueUid"];

    async.series([
        //检测是否已加入联盟
        function(cb){
            user.getUser(userUid,function(err,res){
                if(err || res == null){
                    cb("dbError");
                }else{
                    var leagueUid = res["leagueUid"];
                    if(leagueUid != 0 ){
                        cb("hasJoinLeague");
                        return;
                    }
                    cb(null);
                }
            });
        },
        //写入玩家联盟申请缓存
        function(cb){
            league.addUserLeagueApply(userUid,leagueUid,function(err,res){
                if(err){
                    cb(err);
                }else{
                    cb(null);
                }
            })
        },
        //写入联盟申请缓存
        function(cb){
            league.addLeagueApply(userUid,leagueUid,userUid,function(err,res){
                if(err){
                    cb(err);
                }else{
                    cb(null);
                }
            })
        }
    ],function(err){
        if (err) {
            response.echo("league.apply",jutil.errorInfo(err));
        } else {
            response.echo("league.apply",{"result":1});
        }
    });

}

exports.start = start;