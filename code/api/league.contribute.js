/**
 * Created with JetBrains WebStorm.
 * User: kongyajie--联盟贡献
 * Date: 14-6-19
 * Time: 下午7:59
 * To change this template use File | Settings | File Templates.
 */

var league = require("../model/league");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var async = require("async");
var userVariable = require("../model/userVariable");
var user = require("../model/user");
var pvptop = require("../model/pvptop");
var mongoStats = require("../model/mongoStats");
var leagueDragon = require("../model/leagueDragon");
var leagueTeam = require("../model/leagueTeam");

/**
 * 联盟建设
 * @param postData  ({"leagueUid":xx,"contributeType":0/1/2})
 * @param response  ({"newUserData":newUserData,"newLeagueData":newLeagueData,"newMemberData":newMemberData})
 * @param query
 */

function start(postData, response, query) {
    if (jutil.postCheck(postData,"leagueUid","contributeType") == false) {
        response.echo("league.contribute",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var leagueUid = postData["leagueUid"];
    var contributeType = postData["contributeType"] - 0;

    if([0,1,2].indexOf(contributeType) == -1){
        response.echo("league.contribute",jutil.errorInfo("postError"));
        return;
    }

    var configData = configManager.createConfig(userUid);
    var leagueConfig = configData.getConfig("league");
    var buildObj = leagueConfig["build"][contributeType];

    var nowTime = jutil.now();
    var newUserData = {};   //新的用户数据
    var newLeagueData; //新的联盟数据
    var newMemberData; //新的联盟成员数据
    var userLevel;

    var costType;
    var cost;


    var configData = configManager.createConfig(userUid);
    var dragonConfig = jutil.deepCopy(configData.getConfig("starCraft"));
    var startTime = jutil.monday() + dragonConfig["startWeektime"];

    if(jutil.now() < startTime)
        startTime -= 604800;

    async.series([
        //  今日是否可进行该类型的建设（3种类型的建设每天各可进行一次）
        function(cb) {
            userVariable.getVariableTime(userUid,"leagueContribute" + contributeType,function(err,res) {
                if (err) response.echo("league.contribute",jutil.errorInfo("dbError"));
                else {
                    if (res == null) cb(null);
                    else {
                        var preTime = res["time"] - 0;
                        if (jutil.compTimeDay(nowTime,preTime) == true) {
                            cb("hasContribute");
                        } else {
                            cb(null);
                        }
                    }
                }
            });
        },
        //  取用户数据
        function(cb) {
            user.getUser(userUid,function(err,res) {
                if (err) cb("dbError");
                else {
                    // 检测是否已加入联盟
                    if(res["leagueUid"] != leagueUid){
                        cb("hasNotJoinLeague");
                    }else{
                        // 计算花费
                        costType = buildObj["costType"];
                        cost = buildObj["cost"] - 0;
                        var gold = res["gold"];
                        var ingot = res["ingot"];

                        if(costType == "zeni"){
                            if(gold < cost){
                                cb("noMoney");
                                return;
                            }else{
                                newUserData["gold"] = gold - cost;
                            }
                        }else if(costType == "imegga"){
                            if(ingot < cost){
                                cb("ingotNotEnough");
                                return;
                            }else{
                                newUserData["ingot"] = ingot - cost;
                            }
                        }

                        //计算经验
                        userLevel = res["lv"];
                        if(userLevel > 25){//25级以上玩家才能通过建设增加队伍经验
                            var exp = res["exp"] - 0;
                            var playerExpAdd = buildObj["playerExpAdd"] - 0;
                            newUserData["exp"] = exp + playerExpAdd;
                        }

                        //取出玩家的联盟贡献
                        newUserData["leagueContribution"] = res["leagueContribution"] - 0;
                        cb(null);
                    }
                }
            });
        },
        //  取联盟数据
        function(cb){
            league.getLeague(userUid,leagueUid,function(err,res){
                if(err) cb(err);
                else if(res == null)
                    cb("noLeague");
                else{
                    newLeagueData = res;
                    var exp = res["exp"] - 0;
                    var leagueExpAdd = buildObj["leagueExpAdd"] - 0;
                    newLeagueData["exp"] = exp + leagueExpAdd;
                    cb(null);
                }
            });
        },
        //  取个人贡献值
        function(cb){
            league.getMember(userUid,leagueUid,userUid,function(err,res){
                if(err) cb(err);
                else{
                    newMemberData = res;
                    var leagueExp = newMemberData["leagueExp"] - 0;
                    var contributionAdd = buildObj["contributionAdd"] - 0;
                    newMemberData["leagueExp"] = leagueExp + contributionAdd;
                    var contribution = newUserData["leagueContribution"] - 0;
                    newUserData["leagueContribution"] = contribution + contributionAdd;//更新玩家的联盟贡献
                    cb(null);
                }
            });
        },
        function (cb) {
            leagueTeam.addContribution(userUid, buildObj["contributionAdd"], function () {
                cb();
            });
        },
        function(cb){
            user.updateUser(userUid,newUserData,function(err,res){
                if(err) cb(err);
                else{
                    if(costType == "imegga"){
                        mongoStats.expendStats("ingot", userUid, '127.0.0.1', null, mongoStats.E_LEAGUE_CONTRIBUTION, cost);
                    }
                    cb(null);
                }
            });
        },
        //  更新联盟经验
        function(cb){
            league.updateLeague(userUid,leagueUid,newLeagueData,function(err,res){
                if(err) cb(err);
                else{
                    cb(null);
                }
            });
        },
        //  更新本周联盟总贡献
        function(cb){
            var rewardStart = startTime+dragonConfig["doTime"]["rewardStart"];
            var rewardEnd = startTime+dragonConfig["doTime"]["rewardEnd"];
            if(jutil.now() < rewardStart){
                rewardStart -= 604800;
                rewardEnd -= 604800;
            }
            if (jutil.now() >= rewardStart && jutil.now() <= rewardEnd) {//报名时间外
                leagueDragon.addContribution(userUid,leagueUid,buildObj["contributionAdd"] - 0, rewardStart, function(err,res){
                    if(err) cb(err);
                    else cb(null);
                });
            } else {
                cb(null);
            }

        },
        //  更新个人贡献值
        function(cb){
            league.updateMember(userUid,leagueUid,newMemberData,function(err,res){
                if(err) cb(err);
                else{
                    cb(null);
                }
            });
        },
        //  更新已建设过
        function(cb) {
            userVariable.setVariableTime(userUid,"leagueContribute" + contributeType,1,nowTime,function(err,res) {
                if(err) cb(err);
                else {
                    cb(null);
                }
            });
        },
        //  添加联盟动态
        function(cb){
            pvptop.getPvpUserInfo(userUid,function(err,res) {
                if (err) cb("dbError");
                else {
                    var newsData = {};
                    newsData["userName"] = res["userName"];
                    newsData["userLevel"] = userLevel;
                    newsData["heroId"] = res["heroIdList"][0];
                    newsData["time"] = jutil.now();
                    newsData["type"] = contributeType;
                    league.addLeagueNews(userUid,leagueUid,newsData,function(err,res){
                        if (err) cb("dbError");
                        else{
                            cb(null);
                        }
                    });
                }
            });
        }
    ],function(err){
        if (err) {
            response.echo("league.contribute",jutil.errorInfo(err));
        } else {
            response.echo("league.contribute",{"newUserData":newUserData,"newLeagueData":newLeagueData,"newMemberData":newMemberData});
        }
    });
}

exports.start = start;