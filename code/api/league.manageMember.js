/**
 * Created with JetBrains WebStorm.
 * User: kongyajie
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
 * @param postData  ({"leagueUid":xx,"memberUserUid":xx,"action":xx}) //操作 0 踢出，1 升职 2降职
 * @param response
 * @param query
 */

function start(postData, response, query) {
    if (jutil.postCheck(postData,"leagueUid","memberUserUid","action") == false) {
        response.echo("league.manageMember",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var leagueUid = postData["leagueUid"];
    var memberUserUid = postData["memberUserUid"];//成员userUid
    var action = postData["action"];

    var newUserData = {};
    var newMemberData;
    var newMemberNum;

    if([0,1,2].indexOf(action) == -1){
        response.echo("league.manageMember",jutil.errorInfo("postError"));
        return;
    }

    var configData = configManager.createConfig(userUid);
    var dragonConfig = jutil.deepCopy(configData.getConfig("starCraft"));

    var startTime = jutil.monday() + dragonConfig["startWeektime"];

    if(jutil.now() < startTime)
        startTime -= 604800;

    async.series([
        function(cb){
            if(jutil.now() >= startTime+dragonConfig["doTime"]["battleIn1"] && jutil.now() <= startTime+dragonConfig["doTime"]["battleEnd"]){
                cb("battleTime");
            } else {
                cb(null);
            }
        },
        function(cb){//检测是否有联盟管理权限
            league.getMember(userUid,leagueUid,userUid,function(err,res){
                if(err || res == null) cb("limitedLeagueAuthority");
                else{
                    if(res["leagueTitle"] != 2 && res["leagueTitle"] != 1){
                        cb("limitedLeagueAuthority");
                    }else{
                        cb(null);
                    }
                }
            });
        },
        function(cb){//踢出的不能是会长或者自己
            league.getMember(userUid,leagueUid,memberUserUid,function(err,res){
                if(err || res == null) cb("hasNotJoinLeague");
                else{
                    if(res["leagueTitle"] == 2 || userUid == memberUserUid){
                        cb("dbError");
                    }else{
                        cb(null);
                    }
                }
            });
        },
        //-------------踢出成员-----------------
        function(cb){//删除成员
            if(action != 0){
                cb(null);
            }else{
                league.delMember(userUid,leagueUid,memberUserUid,function(err,res){
                    if(err) cb(err);
                    else{
                        cb(null);
                    }
                });
            }
        },
        function(cb){//更新踢出成员的user信息
            if(action != 0){
                cb(null);
            }else{
                newUserData["leagueUid"] = "0";//联盟uid置为0
                user.updateUser(memberUserUid,newUserData,function(err,res){
                    if(err) cb(err);
                    else{
                        cb(null);
                    }
                });
            }
        },
        //-------------修改成员职位-----------------
        function(cb){
            if(action == 0){
                cb(null);
            }else{
                var newTitle = action == 1 ? 1 : 0;
                league.getMember(userUid,leagueUid,memberUserUid,function(err,res){
                    if(err) cb(err);
                    else{
                        newMemberData = res;
                        newMemberData["leagueTitle"] = newTitle;
                        cb(null);
                    }
                });
            }
        },

        function(cb){
            if(action == 0){
                cb(null);
            }else{
                league.updateMember(userUid,leagueUid,newMemberData,function(err,res){
                    if(err) cb(err);
                    else{
                        cb(null);
                    }
                });
            }
        },

        function(cb){
            league.getMemberNum(userUid,leagueUid,function(err,res){
                if(err) cb(err);
                else{
                    newMemberNum = res;
                    cb(null);
                }
            });
        }
    ],function(err){
        if (err) {
            response.echo("league.manageMember",jutil.errorInfo(err));
        } else {
            response.echo("league.manageMember",{"result":1,"newMemberNum":newMemberNum});
        }
    });
}

exports.start = start;