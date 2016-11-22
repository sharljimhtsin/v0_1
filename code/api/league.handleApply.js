/**
 * Created with JetBrains WebStorm.
 * User: kongyajie--联盟同意申请
 * Date: 14-6-19
 * Time: 下午8:07
 * To change this template use File | Settings | File Templates.
 */

var league = require("../model/league");
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var configManager = require("../config/configManager");

/**
 * 处理加入联盟申请
 * @param postData  ({"leagueUid":xx,"memberUserUid":xx,"action":xx}) //操作 0 拒绝，1 同意
 * @param response
 * @param query
 */

function start(postData, response, query) {
    if (jutil.postCheck(postData,"leagueUid","memberUserUid","action") == false) {
        response.echo("league.handleApply",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var leagueUid = postData["leagueUid"];
    var memberUserUid = postData["memberUserUid"];//成员userUid
    var action = postData["action"] - 0;

    if([0,1].indexOf(action) == -1){
        response.echo("league.handleApply",jutil.errorInfo("postError"));
        return;
    }

    var newUserData = {};
    var configData = configManager.createConfig(userUid);
    var leagueConfig = configData.getConfig("league");

    if(action == 0){//拒绝
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
            //删除玩家对本联盟的申请
            function(cb){
                league.delUserLeagueApply(memberUserUid,leagueUid,function(err,res){
                    if(err) cb(err);
                    else{
                        cb(null);
                    }
                });
            },
            //删除联盟缓存中该玩家的申请
            function(cb){
                league.delLeagueApply(userUid,leagueUid,memberUserUid,function(err,res){
                    if(err) cb(err);
                    else{
                        cb(null);
                    }
                });
            }
        ],function(err){
            if (err) {
                response.echo("league.handleApply",jutil.errorInfo("dbError"));
            } else {
                response.echo("league.handleApply",{"result":1});
            }
        });
    }else if(action == 1){//同意
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
            //检测该申请人是否已加入联盟
            function(cb){
                user.getUser(memberUserUid,function(err,res){
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
            //检测联盟成员数量是否已满
            function(cb){
                league.getMemberNum(userUid,leagueUid,function(err,res){
                    if(err){
                        cb(err);
                    }else{
                        var currentNum = res;
                        league.getLeagueMaxMemberNum(userUid,leagueUid,function(err,res){
                            if(err){
                                cb(err);
                            }else{
                                var maxNum = res;
                                if(currentNum >= maxNum){
                                    cb("beyondMemberLimit");
                                }else{
                                    cb(null);
                                }
                            }
                        });
                    }
                });
            },
            //添加到联盟成员表中（同意的时候）
            function(cb){
                league.addMember(userUid,leagueUid,memberUserUid,0,function(err,res){
                    if(err){
                        cb(err);
                    }else{
                        cb(null);
                    }
                })
            },
            //更新申请人的玩家信息
            function(cb){
                newUserData["leagueUid"] = leagueUid;
                user.updateUser(memberUserUid,newUserData,function(err,res){//更新玩家信息
                    if(err)cb(err);
                    else{
                        cb(null);
                    }
                });
            },
            //删除玩家的所有联盟申请
            function(cb){
                league.delAllUserLeagueApply(memberUserUid,function(err,res){
                    if(err){
                        cb(err);
                    }else{
                        cb(null);
                    }
                })
            }
        ],function(err){
            if (err) {
                response.echo("league.handleApply",jutil.errorInfo(err));
            } else {
                response.echo("league.handleApply",{"result":1});
            }
        });
    }else{//异常
        response.echo("league.handleApply",jutil.errorInfo("postError"));
    }
}

exports.start = start;