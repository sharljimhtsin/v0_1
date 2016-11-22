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
 * 退出联盟
 * @param postData  ({"leagueUid":xx})
 * @param response
 * @param query
 */

function start(postData, response, query) {
    if (jutil.postCheck(postData,"leagueUid") == false) {
        response.echo("league.exit",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var leagueUid = postData["leagueUid"];

    async.series([
        //删除联盟成员
        function(cb){
            league.delMember(userUid,leagueUid,userUid,function(err,res){
                if(err) cb(err);
                else{
                    cb(null);
                }
            });
        },
        //更新玩家数据
        function(cb){
            var newUserData = {"leagueUid" :"0"};//联盟uid置为0
            user.updateUser(userUid,newUserData,function(err,res){
                if(err) cb(err);
                else{
                    cb(null);
                }
            });
        }
    ],function(err){
        if (err) {
            console.log(err);
            response.echo("league.exit",jutil.errorInfo(err));
        } else {
            response.echo("league.exit",{"result":1});
        }
    });
}

exports.start = start;