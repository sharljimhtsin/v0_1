/**
 * Created with JetBrains WebStorm.
 * User: za
 * Date: 16-1-26  弹劾会长-league.accuse
 * Time: 下午3:57
 * To change this template use File | Settings | File Templates.
 */

var league = require("../model/league");
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var variable = require("../model/userVariable");

function start(postData, response, query) {
    if (jutil.postCheck(postData,"leagueUid") == false) {
        response.echo("league.accuse",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var leagueUid = postData["leagueUid"];
    var returnData = {};
    var updateMember = {};
    var updatePresidentMember = {};
    var leagueData = {};
    var presidentId = "";
    var Data = {};
    async.series([
        function(cb){//取用户联盟（需求：只有会长才能改名）
            league.getMembers(userUid,leagueUid,function(err,res){
                if(err)cb(err);
                else{
//                    console.log(res,"6666");
                    var len = Object.keys(res).length;
                    if (len < 0)cb("hasNotJoinLeague");
                    else {
                        Data = res;
                        if(Data[userUid] == undefined){
                            cb("dbError");
                        }else{
//                            console.log(res,"-9-99-",userUid);
                            if(Data[userUid]["leagueTitle"] == 2){//验证当前玩家是不是会长
                                cb("limitedLeagueAuthority");
                            } else{//会员
                                for(var x in Data){
                                    if(Data[x]["leagueTitle"] == 2){
                                        updatePresidentMember = Data[x];
                                    }
                                }
                                updateMember = Data[userUid];
                                cb(null);
                            }
                        }
                    }
                }
            });
        },
        function(cb){
//            console.log(updatePresidentMember["userUid"],"99999",updateMember,"ggg",leagueUid);
            league.getLeague(userUid,leagueUid,function(err,res){
                if(err)cb(err);
                else{
//                    console.log(res,"22343");
                    leagueData = res;
                    cb(null);
                }
            });
        },
        function(cb){//会长满7天不曾登陆游戏后，任何玩家可以点击弹劾，升为会长
            presidentId = updatePresidentMember["userUid"];
//            console.log(updatePresidentMember["userUid"],"presidentId...",presidentId);
            variable.getVariableTime(presidentId,"loginLog",function(err,res){
                if(err)cb(err);
                else{
//                    console.log(res["time"],"1232243",res);
                    if (res == null) cb(null);
                    else{
                        if(jutil.now() - res["time"] >= 604800 ||jutil.now() - leagueData["createTime"] >= 604800){//可以弹劾 res["time"] == 0
                            leagueData["createTime"] = jutil.now();
                            cb(null);
                        }else{//时间未到，不可以弹劾
                            cb("timeNotMatch");
                        }
                    }
                }
            });
        },
        function(cb){//用户选择是否弹劾
//            console.log(updateMember,updatePresidentMember,"2324");
            updateMember["leagueTitle"] = 2;
            updatePresidentMember["leagueTitle"] = 0;
            leagueData["founderUserUid"] = userUid;
            returnData["updateMember"] = updateMember;
            returnData["updatePresidentMember"] = updatePresidentMember;
            returnData["leagueData"] = leagueData;
            cb(null);
        },
        function(cb){//修改联盟中的会长标识
            league.updateLeague(userUid,leagueUid,leagueData,cb);
        },
        function(cb){//修改用户权限
            league.updateMember(userUid,leagueUid,updateMember,cb);
        },
        function(cb){//修改会长权限
            league.updateMember(presidentId,leagueUid,updatePresidentMember,cb);
        }
    ],function(err){
        if (err) {
            response.echo("league.accuse",jutil.errorInfo(err));
        } else {
            response.echo("league.accuse",{"result":returnData});
        }
    });

}

exports.start = start;