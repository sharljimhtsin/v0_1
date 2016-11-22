/**
 * 龙神祝福活动的接口--practice.endorse
 * User: za
 * Date: 15-9-29
 * Time: 下午18:45
 */
var jutil = require("../utils/jutil");
var async = require("async");
var endorse = require("../model/practiceEndorse");
var user = require("../model/user");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "action") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var action = postData["action"];
    var currentConfig;
    var sTime = 0;
    var eTime = 0;
    var returnData = {};//返回集合
    var userData = {};//用户数据
    var rewardList = [];//奖励列表
    var nowReList = [];
    var ingot = 0;
    var list = [];//奖励列表
    var vip = 0;
    var vipPoint = 0;
    var vipList;
    var index = 0;
    var nIndex = 0;
    var mount = 0;
    var ballList = [];
    var payPoint = 0;
    switch (action){
        case "get"://取数据
        default:
            async.series([function(cb) {// 取配置
              endorse.getConfig(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        sTime = res[0]-0;
                        eTime = res[1]-0;
                        currentConfig = res[2];
                        vipList = currentConfig["vipList"];
                        returnData["sTime"] = sTime;
                        returnData["eTime"] = eTime;
                        returnData["config"] = currentConfig;
                        cb(null);
                    }
                });
            },function(cb){//取vip对应的许愿次数
                user.getUser(userUid,function(err,res){
                    if (err || res == null) cb("dbError");
                    else {
                        vip = res["vip"]-0;
                        vipPoint = vipList[vip];
                        ingot = res["ingot"];
                        cb(null);
                    }
                });
            },function(cb){
                endorse.getUserData(userUid,sTime,function(err,res){//取用户数据
                    if(err||res["arg"] == null)cb("dbError");
                    else {
                        userData = res;
                        payPoint = userData["arg"]["payPoint"];
//                        console.log(vip,userData["arg"]["vip"],vipPoint,payPoint);
                        if(vip > userData["arg"]["vip"]){
                            if(vipPoint >= payPoint){
                                userData["arg"]["vipPoint"] = vipPoint - payPoint;
                            }else{
                                userData["arg"]["vipPoint"] = 0;//vipPoint - payPoint;
                            }
                            returnData["vipPoint"] = userData["arg"]["vipPoint"];
                        }else{
                            returnData["vipPoint"] = userData["arg"]["vipPoint"];
                        }
                        userData["arg"]["payPoint"] = payPoint;
//                        console.log(returnData["vipPoint"]);
//                        returnData["vipPoint"] = userData["arg"]["vipPoint"];
                        userData["arg"]["vip"] = vip;
                        returnData["userData"] = ingot;
                        userData["arg"]["index"] = userData["arg"]["index"] == undefined ? 0 : userData["arg"]["index"];
                        userData["arg"]["status"] = userData["arg"]["status"] == undefined ? 0 : userData["arg"]["status"];
                        userData["arg"]["rewardStatus"] = userData["arg"]["rewardStatus"] == undefined ? 0 : userData["arg"]["rewardStatus"];
                        userData["arg"]["endorseTime"] = jutil.now();
                        returnData["index"] = userData["arg"]["index"];
                        returnData["status"] = userData["arg"]["status"];
                        returnData["rewardStatus"] = userData["arg"]["rewardStatus"];
                        cb(null);
                    }
                });
            },function(cb){//更新数据
                endorse.setUserData(userUid,userData,cb);
            }],function(err,res){
                echo(err,returnData);
            });
            break;
        case "endorse"://传入："type":0-许愿，1-改签
            if (jutil.postCheck(postData, "type") == false) {
                echo("postError");
                return false;
            }
            var type = postData["type"];//档位
            async.series([function(cb) {// 获取活动配置数据
                endorse.getConfig(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        sTime = res[0];
                        eTime = res[1];
                        currentConfig = res[2];
                        rewardList = currentConfig["rewardList"];
                        vipList = currentConfig["vipList"];
                        ballList = currentConfig["ballList"];
                        //随机一个龙珠（7随1）随机结果0-6
                        var list = [];
                        while(list.length < 1){//需求：1,10,100
                            var randomRate = Math.random();
                            var p = 0;
                            for(var i in ballList){
                                p += ballList[i] - 0;
                                if (randomRate <= p) {
                                    list.push(i);
                                    break;
                                }
                            }
                        }
                        index = list[0];
                        nowReList = rewardList[index];
                        cb(null);
                    }
                });
            },function(cb){//取用户数据
                endorse.getUserData(userUid, sTime, function(err,res){
                    if(err||res["arg"] == null)cb("dbError");
                    else {
                        userData = res;
                        vipPoint = userData["arg"]["vipPoint"];
                        payPoint = userData["arg"]["payPoint"];

                        userData["arg"]["rewardStatus"] = 0;
                        if(type == 0){
                            if(vipPoint -1 <0){
                                cb("timesNotEnough");//vip对应的抽奖次数不够
                            }else{
                                ingot = currentConfig["wishPay"] - 0;
                                userData["data"] += ingot;
                                userData["arg"]["index"] = index;
                                userData["arg"]["list"] = nowReList;
                                userData["arg"]["status"] = 1;
                                returnData["status"] = userData["arg"]["status"];
                                returnData["index"] = userData["arg"]["index"];
                                returnData["list"] = userData["arg"]["list"];
                                vipPoint--;
                                payPoint++;
                                userData["arg"]["vipPoint"] = vipPoint;
                                userData["arg"]["payPoint"] = payPoint;
                                returnData["vipPoint"] = userData["arg"]["vipPoint"];
                                stats.events(userUid,"127.0.0.1",null,mongoStats.P_ENDORSE4);//神龙许愿的许愿的次数
                                cb(null);
                            }
                        }else if(type == 1){
//                            console.log(type);
                            ingot = currentConfig["endorsePay"] - 0;
                            userData["data"] += ingot;
                            //随机一个龙珠（7随1）随机结果0-6
                            var nlist = [];
                            while(nlist.length < 1){//需求：1,10,100
                                var randomRate = Math.random();
                                var p = 0;
                                for(var k in ballList){
                                    p += ballList[k] - 0;
                                    if (randomRate <= p && k >= userData["arg"]["index"]) {
                                        nlist.push(k);
                                        break;
                                    }else{
                                        continue;
                                    }
                                }
                            }
                            nIndex = nlist[0];
                            userData["arg"]["index"] = nIndex;
                            nowReList = rewardList[nIndex];
//                            console.log(nowReList,"1");
                            userData["arg"]["list"] = nowReList;
//                            console.log(userData["arg"]["list"],"2");
                            returnData["status"] = userData["arg"]["status"];//0
                            returnData["index"] = userData["arg"]["index"];
                            returnData["list"] = userData["arg"]["list"];
//                            console.log(returnData["list"],"3");
                            userData["arg"]["vipPoint"] = vipPoint;
                            userData["arg"]["payPoint"] = payPoint;
//                            returnData["vipPoint"] = userData["arg"]["vipPoint"];
                            userData["arg"]["endorseTime"] = jutil.now();
                            stats.events(userUid,"127.0.0.1",null,mongoStats.P_ENDORSE5);//神龙许愿的改签的次数
                            cb(null);
                        }else{
                            cb("typeError");
                        }
                    }
                });
            },function(cb) {//扣钱
                user.getUser(userUid,function(err,res){
                    if (err || res == null) cb("dbError");
                    else if(res["ingot"] - ingot < 0){
                        cb("ingotNotEnough");
                    } else {
                        returnData["userData"] = {"ingot":res["ingot"] - ingot};
                        returnData["vipPoint"] = vipPoint;
                        user.updateUser(userUid, returnData["userData"], cb);
                    }
                });
            },function(cb){//设置数据
                if(type == 0){
                    mongoStats.expendStats("ingot", userUid,"127.0.0.1", null, mongoStats.P_ENDORSE1, ingot);
                    endorse.setUserData(userUid, userData, cb);
                }else if(type ==1){
                    mongoStats.expendStats("ingot", userUid,"127.0.0.1", null, mongoStats.P_ENDORSE2, ingot);
                    endorse.setUserData(userUid, userData, cb);
                }else{
                    cb("dbError");
                }
            }], function (err, res) {
            echo(err, returnData);
        });
            break;
        case "reward"://领奖
            async.series([function(cb) {// 取配置
                endorse.getConfig(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        sTime = res[0]-0;
                        currentConfig = res[2];
                        mount = currentConfig["mount"];
                        cb(null);
                    }
                });
            },function(cb){//取用户数据
                endorse.getUserData(userUid, sTime, function (err, res) {
                    if(err||res["arg"] == null)cb("dbError");
                    else {
                        userData = res;
//                        console.log(userData["arg"]["rewardStatus"]);
                        if(userData["arg"]["rewardStatus"] == 1){
                            cb("haveReceive");
                        }else{
                            list = userData["arg"]["list"];
                            var kList = [];
                            while(kList.length < mount){//需求：1,10,100
                                var randomRate = Math.random();
                                var p = 0;
                                for(var i in list){
                                    p += list[i]["prob"] - 0;
                                    if (randomRate <= p) {
                                        kList.push({"id":list[i]["id"],"count":list[i]["count"]});
                                        break;
                                    }
                                }
                            }
                            returnData["reward"] = kList;
                            userData["arg"]["rewardStatus"] = 1;
                            userData["arg"]["status"] = 0;
                            returnData["status"] = userData["arg"]["status"];
                            userData["arg"]["endorseTime"] = jutil.now();
                            endorse.setUserData(userUid,userData,cb);
                        }
                    }
                });
            },function(cb){//进背包
                returnData["rewardList"] = [];
                async.eachSeries(returnData["reward"], function (reward, esCb) {
                    mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.P_ENDORSE3, reward["count"]);//神龙许愿的活动掉落
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
            }], function (err, res) {
                echo(err, returnData);
            });
            break;
    }
    function echo(err, res){
        if(err){
            response.echo("practice.endorse", jutil.errorInfo(err));
        } else{
            response.echo("practice.endorse", res);
        }
    }
}
exports.start = start;