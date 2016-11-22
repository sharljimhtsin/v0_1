/**
 * Created with JetBrains WebStorm.
 * User: kongyajie
 * Date: 14-6-18
 * Time: 上午10:57
 * To change this template use File | Settings | File Templates.
 */

var user = require("../model/user");
var league = require("../model/league");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var async = require("async");

/**
 * 返回所有联盟数据
 * {
 *  "leagueData":
 *      {"联盟id":{"leagueUid","leagueName","exp","type","memberNum","founderName","founderLevel"},
 *      "联盟id":{"leagueUid","leagueName","exp","type","memberNum","founderName","founderLevel"}},
 *  "leagueApplyData":
 *      {"联盟id":{"leagueUid","time"},"联盟id2":{"leagueUid","time"}}
 * }
 * @param postData  空
 * @param response
 * @param query
 */

function start(postData, response, query) {
    var userUid = query["userUid"];

    var configData = configManager.createConfig(userUid);

    var returnData = {};
    var leaguesData;        //所有联盟的基础数据
    var leagueMembersData;  //所有联盟的成员数据
    var leagueFounders = [];//所有联盟的创建人集合
    var leagueApplyData;    //此玩家的所有加入联盟申请
    async.series([
        //所有联盟基础数据
        function(cb){
            league.getLeagues(userUid,function(err,res) {
                if (err) {
                    cb("dbError");
                } else if(res == null){
                    leaguesData = {};
                    cb(null);
                }else {
                    leaguesData = res;
                    for(var key in leaguesData){
                        var item = leaguesData[key];
                        item["leagueName"] = jutil.toBase64(item["leagueName"]);
                        leagueFounders.push({"leagueUid":item["leagueUid"],
                                            "founderUserUid":item["founderUserUid"]});
                    }
                    cb(null);
                }
            });
        },
        //所有联盟成员数据（成员数量）
        function(cb){
            async.forEach(leagueFounders,function(item,forCb) {
                var leagueUid = item["leagueUid"];
                league.getMembers(userUid,leagueUid,function(err,res){
                    if(err){
                        forCb("dbError");
                    } else if(res == null){
                        delete leaguesData[leagueUid];
                    } else {
                        leagueMembersData = res;
                        var memberNum = Object.keys(leagueMembersData).length - 0;//联盟的成员数量
                        leaguesData[leagueUid]["memberNum"] = memberNum;
                        forCb(null);
                    }
                });
            },function(err,res){
                if(err) cb(err);
                else cb(null);
            });
        },
        //联盟会长数据（名字、等级）
        function(cb){
            async.forEach(leagueFounders,function(item,forCb) {
                var founderUserUid = item["founderUserUid"];
                var leagueUid = item["leagueUid"];
                user.getUser(founderUserUid,function(err,res){
                    if(err || res == null) {
                        forCb("dbError");
                    }
                    else{
                        //var exp = res["exp"];
                        //var name = res["userName"];
                        //var level = configData.userExpToLevel(exp) - 0;
                        leaguesData[leagueUid]["founderName"] = res["userName"];
                        leaguesData[leagueUid]["founderLevel"] = res["lv"];
                        forCb(null);
                    }
                });
            },function(err,res){
                if(err) cb(err);
                else cb(null);
            });
        },
        //此玩家的所有加入联盟申请数据
        function(cb){
            league.getUserLeagueApply(userUid,function(err,res){
                if(err){
                    cb(err);
                }else{
                    leagueApplyData = res;
                    cb(null,res);
                }
            });
        }
    ],function(err){
        if(err){
            response.echo("league.getAll",jutil.errorInfo(err));
        }else{
            returnData["leagueData"] = leaguesData;
            if(leagueApplyData != null){
                returnData["leagueApplyData"] = leagueApplyData;
            }
            response.echo("league.getAll",returnData);
        }
    });
}

exports.start = start;