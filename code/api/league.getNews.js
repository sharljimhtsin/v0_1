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
 * 返回联盟动态
 * @param postData  ({"leagueUid":xx})
 * @param response
 * @param query
 */

function start(postData, response, query) {
    if (jutil.postCheck(postData,"leagueUid") == false) {
        response.echo("league.getNews",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var leagueUid = postData["leagueUid"];
    var returnData;

    async.series([
        function(cb){
            league.getLeagueNews(userUid,leagueUid,function(err,res){
                if(err) cb(err);
                else{
                    returnData = res;
                    cb(null);
                }
            });
        }
    ],function(err){
        if (err) {
            response.echo("league.getNews",jutil.errorInfo(err));
        } else {
            response.echo("league.getNews",returnData);
        }
    });
}

exports.start = start;