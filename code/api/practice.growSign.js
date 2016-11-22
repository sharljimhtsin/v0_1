/**
 * 新成长基金(类似于签到)
 * User: za
 * Date: 15-7-16
 * Time: 上午11:17
 * To change this template use File | Settings | File Templates.
 */
var jutil = require("../utils/jutil");
var practice = require("../model/practice");
var async = require("async");
var practiceGrowSign = require("../model/practiceGrowSign");
var modelUtil = require("../model/modelUtil");
var userVariable = require("../model/userVariable");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");

//var achievement = require("../model/achievement");
var user = require("../model/user");
function start(postData, response, query) {
    if (jutil.postCheck(postData, "action") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var action = postData['action'];
    var sTime = 0;
    var eTime = 0;
    var currentConfig;
    var returnData = {};
    var userData = {};//用户数据
    var ingot = 0;//剩余的金币数
    var reward = {};//档位状态集合
    var joinTime = jutil.now();//加入基金的时间
    var joinIngot = 0;//消耗金币数

    switch (action) {
        case "get"://1.取配置，//2.取玩家数据 3.取时间戳 4.判定活动是否开启
        default :
            async.series([
                function (cb) {// 取配置
                    practiceGrowSign.getConfig(userUid, function (err, res) {
                        if (err) cb(err);
                        else {
                            sTime = res[0] - 0;
                            eTime = res[1] - 0;
                            currentConfig = res[2];
                            userData["dataTime"] = sTime;
                            returnData["sTime"] = sTime;
                            returnData["config"] = currentConfig;
                            cb(null);
                        }
                    });
                },function(cb){
                    practiceGrowSign.getUserData(userUid,sTime,eTime,function(err,res){
                        if(err)cb(err);
                        else{
                            userData = res;
                            if(userData["arg"]["reward"] == undefined){//初始化
                                var reward = jutil.deepCopy(currentConfig["reward"]);
                                for(var i = 1;i < currentConfig["order"]+1;i++){
                                    reward[i] = 0;
                                }
                                userData["arg"]["reward"] = reward;
                            }
                            if(userData["data"] != null){
                                returnData["joinTime"] = userData["data"];
                            }else{
                                returnData["joinTime"] = 0;
                            }
                            if(eTime - jutil.now() <= 86400*7){//预留7天领排行奖励
                                returnData["status"] = 1;
                            }
                            userData["statusTime"] = eTime;
                            returnData["eTime"] = eTime;
                            returnData["status"] = userData["status"];
                            returnData["statusList"] = userData["arg"]["reward"];
                            cb(null);
                        }
                    });
                },function(cb){
                    practiceGrowSign.setUserData(userUid,userData,cb);
                }
            ], function (err, res) {
                echo(err, returnData);
            });
            break;
        case "join"://1.判定玩家身上的金币数是否可以开启活动
            async.series([
                function (cb) {// 取配置
                    practiceGrowSign.getConfig(userUid, function (err, res) {
                        if (err) cb(err);
                        else {
                            sTime = res[0] - 0;
                            eTime = res[1] - 0;
                            currentConfig = res[2];
                            joinIngot = currentConfig["imeggaCost"] -0;
                            cb(null);
                        }
                    });
                },function(cb){//取数据
                    practiceGrowSign.getUserData(userUid,sTime,eTime,function(err,res){
                        if(err)cb(err);
                        else{
                            userData = res;
                            if(res["status"] != 2){
                                userData["status"] = 2;
                                returnData["status"] = userData["status"];
                                cb(null);
                            }else{
                                userData["status"] = res["status"];
                                returnData["status"] = userData["status"];
                                cb("alreadyJoin");
                            }
                        }
                    });
                },function(cb){//扣钱
                    user.getUser(userUid,function(err,res){
                        if (err || res == null) {
                            cb("dbError" + "2");
                        } else if (res["ingot"] < joinIngot) {
                            cb("ingotNotEnough");
                        } else{
                            userData["data"] = joinTime;
                            returnData["joinTime"] = userData["data"];
                            ingot = res["ingot"] - joinIngot;
                            returnData["userData"] = {"ingot": ingot};
                            user.updateUser(userUid, returnData["userData"], cb);
                            stats.events(userUid,"127.0.0.1",null,mongoStats.P_GROWSIGN1);//新成长基金活动购买人数统计
                            mongoStats.expendStats("ingot",userUid,"127.0.0.1",null,mongoStats.P_GROWSIGN2,joinIngot);//新成长基金活动消耗的伊美加币
                        }
                    });
                },function(cb){//设置数据 //****结束时间需要延长到7天****
                    practiceGrowSign.setUserData(userUid,userData,cb);
                }
            ], function (err, res) {
                echo(err, returnData);
            });
            break;
        case "reward"://1.活动结束领取奖励，2.活动结束释放redis.(考虑活动过期的情况)
            if (jutil.postCheck(postData, "fate") == false) {
                echo("postError");
                return false;
            }
            var fate = postData['fate'];//当前领奖的档位
            var rewardTime = 0;//当前领奖的时间
            if(fateArr.indexOf(fate) == -1) {//类型判断
                echo("fateInvalid");
                return;
            }
            var order = 0;
            async.series([
                function(cb){//取配置
                    practiceGrowSign.getConfig(userUid,function(err,res){
                        if(err)cb(err);
                        else{
                            sTime = res[0];
                            eTime = res[1];// + 86400 * 7;
                            currentConfig = res[2];
                            order = currentConfig["order"] - 0;
                            cb(null);
                        }
                    });
                },function(cb){//取数据
                    practiceGrowSign.getUserData(userUid,sTime,eTime,function(err,res){
                        if(err)cb(err);
                        else{
                            if(res != null){
                                userData = res;
                                var dw = Math.ceil((jutil.now() - userData["data"])/86400);
                                if(res["arg"]["reward"][fate] == 0){//可领
                                    if(dw == fate){//时间相同
                                        returnData["reward"] = currentConfig["reward"][fate];//直接获取档位的奖励
                                        userData["arg"]["reward"][fate] = 1;
                                        rewardTime = jutil.now();
                                        cb(null);
                                    }else{//不能领取
                                        cb("outTime");//时间未到
                                    }
                                }else if(res["arg"]["reward"][fate] == 1){//已领取
                                    cb("haveReceive");
                                }
                            }else{
                                cb("dbError"+"5");
                            }
                        }
                    });
                },function(cb){
                    practiceGrowSign.setUserData(userUid,userData,cb);
                },function (cb) {//进背包
                    returnData["rewardList"] = [];
                    async.eachSeries(returnData["reward"], function (reward, esCb) {
//                        console.log(reward,reward["id"],98798);
                        if(reward["id"] == "ingot"){
                            mongoStats.dropStats("ingot", userUid,"127.0.0.1", null, mongoStats.P_GROWSIGN5,reward["count"]);
                        }else if(reward["id"] == "gold"){
                            mongoStats.dropStats("gold", userUid,"127.0.0.1", null, mongoStats.P_GROWSIGN4,reward["count"]);
                        }else{
                            mongoStats.dropStats(reward["id"], userUid,"127.0.0.1", null, mongoStats.P_GROWSIGN3,reward["count"]);
                        }
                        modelUtil.addDropItemToDB(reward["id"], reward["count"], userUid, false, 1, function (err, res) {
                            if (err) {
                                esCb(err);
                                console.error(reward["id"], reward["count"], err.stack);
                            } else {
                                if (res instanceof Array) {
                                    for (var i in res) {
                                        returnData["rewardList"].push(res[i]);
                                    }
                                } else {
                                    returnData["rewardList"].push(res);
                                }
                                esCb(null);
                            }
                        });
                    }, cb);
                },function(cb){
                    user.getUser(userUid,function(err,res){
                        if(err)cb(err);
                        else{
                            returnData["userData"] = res["ingot"];
                            cb(null);
                        }
                    });
                }],function(err,res){
                echo(err, returnData);
            });
            break;
    }
    function echo(err, res) {
        if (err) {
            response.echo("practice.growSign", jutil.errorInfo(err));
        } else {
            response.echo("practice.growSign", res);
        }
    }
}
var fateArr = [1,2,3,4,5,6,7];

exports.start = start;