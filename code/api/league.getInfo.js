/**
 * Created with JetBrains WebStorm.
 * User: kongyajie
 * Date: 14-6-23
 * Time: 下午7:44
 * To change this template use File | Settings | File Templates.
 */
var user = require("../model/user");
var league = require("../model/league");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var async = require("async");

/**
 * 返回某个联盟的常规数据
 * {"leagueUid","leagueName","exp","type","notice","createTime","memberNum","personalExp"}
 * @param postData
 * @param response
 * @param query
 */

function start(postData, response, query) {
    if (jutil.postCheck(postData,"leagueUid") == false) {
        response.echo("league.getInfo",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var leagueUid = postData["leagueUid"];

    var configData = configManager.createConfig(userUid);
    var returnData;
    async.series([
        //联盟基础数据
        function(cb){
            league.getLeague(userUid,leagueUid,function(err,res) {
                if (err) {
                    cb("dbError");
                }else if(res == null){
                    cb("noLeague");
                }else {
                    res["leagueName"] = jutil.toBase64(res["leagueName"]);
                    res["notice"] = jutil.toBase64(res["notice"]);
                    returnData = res;
                    cb(null);
                }
            });
        },
        //成员数量
        function(cb){
            league.getMemberNum(userUid,leagueUid,function(err,res){
                if(err || res == null){
                    cb("dbError");
                } else{
                    returnData["memberNum"] = res;
                    cb(null);
                }
            });
        },
        //个人贡献
        function(cb){
            league.getMember(userUid,leagueUid,userUid,function(err,res){
                if(err || res == null){
                    cb("dbError");
                } else{
                    returnData["personalExp"] = res["leagueExp"];
                    cb(null);
                }
            });
        }
    ],function(err){
        if(err){
            response.echo("league.getInfo",jutil.errorInfo(err));
        }else{
            response.echo("league.getInfo",returnData);
        }
    });
}

exports.start = start;