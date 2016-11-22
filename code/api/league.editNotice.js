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

/**
 * 修改公告
 * @param postData  ({"leagueUid":xx,"newNotice":xx})
 * @param response
 * @param query
 */

function start(postData, response, query) {
    if (jutil.postCheck(postData,"leagueUid","newNotice") == false) {
        response.echo("league.editNotice",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var leagueUid = postData["leagueUid"];
    var newNotice = postData["newNotice"];
    var newLeagueData;

    //联盟名字有效性验证
    if(newNotice == null || newNotice == ""){
        response.echo("league.editNotice", jutil.errorInfo("nameInvalid"));
        return;
    }
    newNotice = jutil.filterWord(newNotice);
    if (newNotice == false) {
        response.echo("league.editNotice", jutil.errorInfo("nameInvalid"));
        return;
    }

    async.series([
        //检测是否有联盟管理权限
        function(cb){
            league.getMember(userUid,leagueUid,userUid,function(err,res){
                if(err || res == null){
                    cb("dbError");
                }else{
                    var title = res["leagueTitle"];
                    if(title != 1 && title != 2){//不是会长或副会长
                        cb("limitedLeagueAuthority");
                    }else{
                        cb(null);
                    }
                }
            });
        },
        function(cb){
            league.getLeague(userUid,leagueUid,function(err,res){
                if(err) cb(err);
                else if(res == null)
                    cb("noLeague");
                else {
                    newLeagueData = res;
                    newLeagueData["notice"] = newNotice;
                    cb(null);
                }
            });
        },

        //修改公告
        function(cb){
            league.updateLeague(userUid,leagueUid,newLeagueData,function(err,res){
                if(err) cb(err);
                else{
                    cb(null);
                }
            });
        }
    ],function(err){
        if (err) {
            response.echo("league.editNotice",jutil.errorInfo(err));
        } else {
            response.echo("league.editNotice",{"result":1});
        }
    });

}

exports.start = start;