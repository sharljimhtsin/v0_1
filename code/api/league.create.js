/**
 * Created with JetBrains WebStorm.
 * User: kongyajie
 * Date: 14-6-18
 * Time: 下午9:16
 * To change this template use File | Settings | File Templates.
 */

var league = require("../model/league");
var jutil = require("../utils/jutil");
var async = require("async");
var configManager = require("../config/configManager");
var user = require("../model/user");
var mongoStats = require("../model/mongoStats");

/**
 * 创建联盟
 * @param postData  ({"leagueName":xx,"type":xx,"costType":xx})
 * @param response
 * @param query
 */

function start(postData, response, query) {
    if (jutil.postCheck(postData,"leagueName","type","costType") == false) {
        response.echo("league.create",jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];
    var leagueName = postData["leagueName"];
    var type = postData["type"];
    var costType = postData["costType"];

    var newLeagueData;
    var newLeagueUid;
    var newUserData = {};

    var configData = configManager.createConfig(userUid);
    var leagueConfig = configData.getConfig("league");
    var leagues;
    var payIngot = 0;
    var userData;

    //联盟名字有效性验证
    if(leagueName == null || leagueName == ""){
        response.echo("league.create", jutil.errorInfo("nameInvalid"));
        return;
    }
    leagueName = jutil.filterWord(leagueName);
    if (leagueName == false) {
        response.echo("league.create", jutil.errorInfo("nameInvalid"));
        return;
    }
    //创建类型的有效性验证，只能是0或者1
    if ([0,1].indexOf(costType) == -1){
        response.echo("league.create", jutil.errorInfo("dbError"));
        return;
    }

    async.series([
        //检测联盟名字是否冲突
        function(cb){
            league.getLeagues(userUid,function(err,res){
                if(err){
                    cb("dbError");
                }else if(res == null){
                    leagues = [];
                    cb(null);
                } else {
                    leagues = res;
                    for(var key in leagues){
                        var item = leagues[key];
                        if(item["leagueName"] == leagueName){
                            cb("nameInvalid");
                            return;
                        }
                    }
                    cb(null);
                }
            });
        },
        function(cb){
            async.forEach(leagues, function(item, forCb){
                league.checkMember(userUid, item["leagueUid"], userUid, function (err, res) {
                    if(res == 1){
                        user.updateUser(userUid,{"leagueUid":item["leagueUid"]},function(err, res){});
                        forCb("hasJoinLeague");
                    } else {
                        forCb(null);
                    }
                });
            }, function(err, res) {
                cb(err);
            })
        },
        //检测等级是否满足 && 是否已加入联盟 && 伊美加币/索尼是否足够
        function(cb){
            user.getUser(userUid,function(err,res){
                if(err || res == null){
                    cb("dbError");
                }else{
                    var exp = res["exp"] - 0;
                    var leagueUid = res["leagueUid"];
                    var gold = res["gold"] - 0;
                    var ingot = res["ingot"] - 0;
                    var userLevel = res["lv"];
                    var needLevel = leagueConfig["setupLevelLimit"] - 0;
                    var needMoney = leagueConfig["setup"][costType]["cost"] - 0;
                    if(userLevel < needLevel){
                        cb("userLevelInsufficient");
                        return;
                    }
                    if(leagueUid != 0 ){
                        cb("hasJoinLeague");
                        return;
                    }
                    if(costType == 0){
                        if(gold < needMoney - 0){
                            cb("noMoney");
                            return;
                        }else{
                            newUserData["gold"] = gold - needMoney;
                        }
                    }else if(costType == 1){
                        if(ingot < needMoney - 0){
                            cb("ingotNotEnough");
                            return;
                        }else{
                            newUserData["ingot"] = ingot - needMoney;//扣除创建所需费用
                            payIngot = needMoney;
                        }
                    }
                    cb(null);
                }
            });
        },
        //新建联盟
        function(cb){
            var level = leagueConfig["setup"][costType]["levelIni"];
            var exp = league.leagueLevelToExp(userUid,level);
            league.addLeague(userUid,leagueName,exp,type,costType,"",jutil.now(),function(err,res) {
                if(err){
                    cb("dbError");
                }else{
                    newLeagueData = res;
                    newLeagueUid = newLeagueData["leagueUid"];
                    cb(null);
                }
            });
        },

        //将创建者加入联盟成员表中（title = 2）
        function(cb){
            league.addMember(userUid,newLeagueUid,userUid,2,function(err,res){
                if(err){
                    console.log("league.create --------addMember() err");
                    cb("dbError");
                }else{
                    newUserData["leagueUid"] = newLeagueUid;//更新玩家的联盟id
                    cb(null);
                }
            });
        },
        //更新玩家信息
        function(cb){
            user.updateUser(userUid,newUserData,function(err,res){
                if(err){
                    console.log("league.create --------updateUser() err");
                    cb("dbError");
                }
                else{
                    cb(null);
                }
            });
        },
        //清除所有的联盟申请
        function(cb){
            league.delAllUserLeagueApply(userUid,function(err,res){
                if(err){
                    console.log("league.create --------delAllUserLeagueApply() err");
                    cb(err);
                }else{
                    cb(null);
                }
            });
        }
    ],function(err){
        if (err) {
            response.echo("league.create",jutil.errorInfo(err));
        } else {
            if(payIngot > 0){
                var userIP = "127.0.0.1";
                mongoStats.expendStats("ingot", userUid, userIP, userData, mongoStats.E_LEAGUE_CREATE, payIngot);
            }
            response.echo("league.create",{"result":1,"newLeagueUid":newLeagueUid,"newUserData":newUserData});
        }
    });
}

exports.start = start;