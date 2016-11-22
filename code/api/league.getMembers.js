/**
 * Created with JetBrains WebStorm.
 * User: kongyajie
 * Date: 14-6-19
 * Time: 下午7:59
 * To change this template use File | Settings | File Templates.
 */

var user = require("../model/user");
var league = require("../model/league");
var jutil = require("../utils/jutil");
var async = require("async");
var pvptop = require("../model/pvptop");
var configManager = require("../config/configManager");
var variable = require("../model/userVariable");


/**
 * 返回联盟所有成员信息
 * @param postData  ({"leagueUid":xx})
 * @param response
 * @param query
 */

function start(postData, response, query) {
    if (jutil.postCheck(postData,"leagueUid") == false) {
        response.echo("league.getMembers",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var leagueUid = postData["leagueUid"];

    var returnData;
    var memberUserUids = [];

    var configData = configManager.createConfig(userUid);
    var leagueData = {};
    var leagueStatus = false;
    var presidentId = "";
    async.series([
        //联盟成员基础数据
        function(cb){
            league.getMembers(userUid,leagueUid,function(err,res){
                if(err) cb(err);
                else{
                    returnData = res;
                    for(var key in res){
                        if(res[key]["leagueTitle"] == 2){
                            presidentId = key;
                        }
                        memberUserUids.push(res[key]["userUid"]);
                    }
                    cb(null);
                }
            });
        },
        function(cb){
//            console.log("4554664",leagueUid,userUid);
            league.getLeague(userUid,leagueUid,function(err,res){
                if(err)cb(err);
                else{
//                    console.log(res,"233224243");
                    leagueData = res;
                    cb(null);
                }
            });
        },
        function(cb){
//            console.log(presidentId,"presidentId....");
            variable.getVariableTime(presidentId,"loginLog",function(err,res){
                if(err)cb(err);
                else{
//                    console.log(res["time"],"1232243",res);
                    if (res == null) cb(null);
                    else{
//						console.log(jutil.now(),res["time"],"11111111111111111111",jutil.now() - res["time"] >= 604800,jutil.now() - res["time"]);
                        if(res["time"] != 0){
//							console.log(res["time"],"");
                            if(jutil.now() - res["time"] >= 604800){//可以弹劾 
                                leagueStatus = true;
                                cb(null);
                            }else{//时间未到，不可以弹劾
                                leagueStatus = false;
                                cb(null);
                            }
                        }else{//数据丢失 取联盟开服时间
                            if(jutil.now() - leagueData["createTime"] >= 604800){
                                leagueStatus = true;
                            }else{//时间未到，不可以弹劾
                                leagueStatus = false;
                                cb(null);
                            }
                        }
                    }
                }
            });
        },
        //联盟成员个人数据
        function(cb){
//            console.log(memberUserUids,leagueUid,"465465645");
            async.forEach(memberUserUids,function(item,forCb) {
                pvptop.getPvpUserInfo(item,function(err,res) {
                    if (err) forCb("dbError");
                    else {
                        async.series([
                            function(cbb){
                                returnData[item]["userName"] = res["userName"];// jutil.toBase64(
                                returnData[item]["leagueName"] = leagueData["leagueName"];
                                returnData[item]["heroId"] = res["heroIdList"][0];
//							console.log(leagueStatus,"leagueStatus...",returnData[item]["leagueTitle"]);
                                if(returnData[item]["leagueTitle"] == 2 && leagueStatus){
//								console.log(item,presidentId,"1123131",item == presidentId);
                                    if(item == presidentId){
                                        returnData[item]["status"] = 0;
//									console.log("111111111111");
                                        cbb(null);
                                    }else{
                                        returnData[item]["status"] = 1;
//									console.log("222222222222");
                                        cbb(null);
                                    }
                                }else{
                                    returnData[item]["status"] = 1;
                                    cbb(null);
                                }
                            },
                            function(cbb){
//							console.log(returnData[item]["leagueTitle"],returnData[item]["status"],item);
                                pvptop.getUserTop(item,function(err,res){
                                    if (err) cbb("dbError");
                                    else{
                                        returnData[item]["rank"] = res == null?999999:res["top"];
                                        user.getUser(item,function(err,res){
                                            if(err) cbb(err);
                                            else{
                                                //var exp = res["exp"];
                                                //var userLevel = configData.userExpToLevel(exp);
                                                returnData[item]["userLevel"] = res["lv"];
                                                cbb(null);
                                            }
                                        });
                                    }
                                });
                            }],function(err,res){
                            forCb(err);
                        });
                    }
                });
            },function(err,res){
                if(err) cb(err);
                else cb(null);
            });
        }
    ],function(err){
        if (err) {
            response.echo("league.getMembers",jutil.errorInfo(err));
        } else {
            response.echo("league.getMembers",returnData);
        }
    });
}

exports.start = start;