/**
 * Created with JetBrains WebStorm.
 * User: joseppe
 * Date: 14-11-11
 * Time: 下午13:53
 * 联盟副本获取记录
 */

var league = require("../model/league");
var leagueMap = require("../model/leagueMap");
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var configManager = require("../config/configManager");

/**
 * 获取联盟地图
 * @param postData  ({"leagueUid":xx})
 * @param response
 * @param query
 */

function start(postData, response, query) {
    if (jutil.postCheck(postData,"leagueUid") == false) {
        response.echo("leagueMap.get",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var leagueUid = postData["leagueUid"];

    var data;
    var newdata = [];
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
        function(cb){//取得地图配置
            leagueMap.getMapLog(userUid,leagueUid,function(err, res){
                if(err)
                    cb("dbError");
                else{
                    data = res;
                    cb(null);
                }
            });
            //cb(null);
        },
        function(cb){
            async.each(data, function(llog, esCb){
                llog = JSON.parse(llog);
                user.getUser(llog["userUid"], function(err, res){
                    if(err){
                        llog["userName"] = jutil.toBase64("");
                    } else {
                        llog["userName"] = res["userName"];
                    }
                    newdata.push(llog);
                    esCb(null);
                })
            }, function(err, res){
                cb(err)
            });
            //cb(null)
        },
        function(cb){
            //newdata = [{"userUid":123456,"userName":jutil.toBase64("你好"),"logTime":1234356,"content":jutil.toBase64("你好你好")}];
            cb(null);
        }
    ],function(err){
        if (err) {
            response.echo("leagueMap.log",jutil.errorInfo(err));
        } else {
            response.echo("leagueMap.log",newdata);
        }
    });
}

exports.start = start;