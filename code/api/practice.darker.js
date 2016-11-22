/**
 * vip黑洞活动的接口--practice.darker
 * User: za
 * Date: 15-11-3
 * Time: 下午18:44
 */
var jutil = require("../utils/jutil");
var async = require("async");
var darker = require("../model/practiceDarker");
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
    var eTime = 0;
    var sTime = 0;
    var rewardList = [];
    var reward = "";
    var gridIndex = 0;
    var returnData = {};//返回集合
    var mCount = 0;//奖励个数
    var userData = {};//用户数据
    var runPay = 0;//每次转动的价格
    var ingot = 0;//玩家活动消耗的金币数
    var vip = 0;//玩家当前vip等级
    var list = [];
    var freeTimes = 0;
    var darkerType = "";
    var vipList = [];
    var quitTimes = 0;
    var darkerStatus = 0;
    var fkj = false;
    switch (action) {
        case "get"://配置+userData+[1,10]
        default:
            async.series([function (cb) {// 取配置
                    darker.getConfig(userUid, function (err, res) {
                        if (err) cb(err);
                        else {
                            sTime = res[0] - 0;
                            eTime = res[1] - 0;
                            currentConfig = res[2];
                            freeTimes = currentConfig["freeTimes"];
                            returnData["sTime"] = sTime;
                            returnData["eTime"] = eTime;
                            returnData["config"] = currentConfig;
                            mCount = currentConfig["mCount"];
                            cb(null);
                        }
                    });
                },
                function (cb) {//取用户数据
                    darker.getUserData(userUid, sTime, function (err, res) {
                        if (err || res == null)cb("dbError");
                        else {
                            userData = res;
                            userData["arg"]["freeTimes"] = userData["arg"]["freeTimes"] == undefined ? freeTimes : userData["arg"]["freeTimes"];
                            userData["arg"]["darkerType"]  = userData["arg"]["darkerType"] == undefined ? darkerType : userData["arg"]["darkerType"];
                            userData["arg"]["darkerStatus"] = userData["arg"]["darkerStatus"] == undefined ? 0 : userData["arg"]["darkerStatus"];
                            userData["arg"]["quitTimes"] = userData["arg"]["quitTimes"] == undefined ? quitTimes : userData["arg"]["quitTimes"];
                            userData["arg"]["quitTime"] = userData["arg"]["quitTime"] == undefined ? 0 : userData["arg"]["quitTime"];

                            returnData["userFreeTimes"] = userData["arg"]["freeTimes"];//免费转动的次数
                            returnData["quitTime"] = userData["arg"]["quitTime"];//放弃的时间
                            returnData["quitTimes"] = userData["arg"]["quitTimes"];//放弃的次数
                            returnData["darkerType"] = userData["arg"]["darkerType"];//0-普通，3,6,9-vip
                            returnData["darkerStatus"] = userData["arg"]["darkerStatus"];//当前黑洞的状态
                            cb(null);
                        }
                    });
                },
                function(cb){
                    darker.setUserData(userUid, userData, cb);
                }], function (err, res) {
                echo(err, returnData);
            });
            break;
        case "darker"://抽奖  需求：放弃两次后当天不会再抽到vip的奖励
            if (jutil.postCheck(postData, "type") == false) {
                echo("postError");
                return false;
            }
            var type = postData["type"];//档位
            async.series([function (cb) {// 获取活动配置数据
                    darker.getConfig(userUid, function (err, res) {
                        if (err) cb(err);
                        else {
                            sTime = res[0];
                            eTime = res[1];
                            currentConfig = res[2];
                            mCount = currentConfig["mCount"];
                            runPay = currentConfig["runPay"];
                            rewardList = currentConfig["rewardList"];
                            vipList = currentConfig["vipList"];
                            cb(null);
                        }
                    });
                },function(cb){//取用户数据
                    user.getUser(userUid,function(err,res){
                        if(err)cb(err);
                        else{
                            vip = res["vip"]-0;
                            ingot = res["ingot"]-0;
                            cb(null);
                        }
                    });
                },function (cb) {//取用户数据
                    darker.getUserData(userUid, sTime, function (err, res) {
                        if (err || res == null) cb("dbError");
                        else {
                            userData = res;
                            quitTimes = userData["arg"]["quitTimes"];
                            userData["arg"]["quitTimes"] = quitTimes;
                            returnData["quitTimes"] = userData["arg"]["quitTimes"];
                            darkerStatus = userData["arg"]["darkerStatus"];
                            if(userData["arg"]["freeTimes"] <=0 && ingot - runPay < 0){
                                    cb("ingotNotEnough");
                            }else{
                                if(type == "0"){//主界面
                                    if(quitTimes > 2){//需求:放弃次数超过两次，抽不到所有vip档
                                        while (list.length < mCount) {//需求：1
                                            var rando = Math.random();
                                            var t = 0;
                                            for (var r in rewardList) {
                                                t += rewardList[r]["prob"] - 0;
                                                if (rando <= t) {
                                                    if(rewardList[r]["type"] == "0"){
                                                        gridIndex = r;
                                                        list.push({"id": rewardList[r]["id"], "count": rewardList[r]["count"],"type": rewardList[r]["type"]});
                                                        break;
                                                    }else{
                                                        continue;
                                                    }
                                                }
                                            }
                                        }
                                    }else{//正常随机
                                        while (list.length < mCount) {//需求：1
                                            var randomRate1 = Math.random();
                                            var p = 0;
                                            for (var i in rewardList) {
                                                p += rewardList[i]["prob"] - 0;
                                                if (randomRate1 <= p) {
                                                    if((vip < 3 && rewardList[i]["type"] == "6") ||(vip < 3 && rewardList[i]["type"] == "9")){
                                                        continue;
                                                    }else if(vip >= 3 && vip <=7 && rewardList[i]["type"] == "9"){
                                                        continue;
                                                    }else {
                                                        gridIndex = i;
                                                        list.push({"id": rewardList[i]["id"], "count": rewardList[i]["count"],"type": rewardList[i]["type"]});
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    userData["arg"]["gridIndex"] = gridIndex-0;
                                    returnData["gridIndex"] = userData["arg"]["gridIndex"];
                                    userData["arg"]["darkerType"] = list[0]["type"];
                                    darkerType = userData["arg"]["darkerType"];
                                    returnData["darkerType"] = userData["arg"]["darkerType"];
                                    //改状态
                                    var aList = [];
                                    if(returnData["darkerType"] == "0"){//普通档
                                        darkerStatus = 0;
                                        aList.push({"id": list[0]["id"], "count": list[0]["count"]});
                                        returnData["reward"] = aList;
                                        userData["arg"]["reward"] = returnData["reward"];
                                    }else{//vip档
                                        darkerStatus = 1;
                                        returnData["reward"] = [];
                                        userData["arg"]["reward"] = returnData["reward"];
                                    }
                                    userData["arg"]["darkerStatus"] = darkerStatus;
                                    returnData["status"] = userData["arg"]["darkerStatus"];
                                    stats.events(userUid,"127.0.0.1",null,mongoStats.P_DARKER1);
                                    //扣钱，扣次数
                                    if(userData["arg"]["freeTimes"] <=0){
                                        if(darkerType != "0"){//|| userData["status"] == 2
                                            returnData["userData"] = userData["data"];
                                            returnData["freeTimes"] = userData["arg"]["freeTimes"];
                                            cb(null);
                                        }else{
                                            if (ingot - runPay < 0) {
                                                cb("ingotNotEnough");
                                            } else {
                                                userData["data"] += runPay;
                                                returnData["userData"] = {"ingot": ingot - runPay};
                                                returnData["freeTimes"] = userData["arg"]["freeTimes"];
                                                mongoStats.expendStats("ingot", userUid,"127.0.0.1", null, mongoStats.P_DARKER9, runPay);
                                                user.updateUser(userUid, returnData["userData"], cb);
                                            }
                                        }
                                    }else{
                                        if(darkerType != "0"){// || userData["status"] == 2
                                            returnData["freeTimes"] = userData["arg"]["freeTimes"];
                                        }else{
                                            userData["arg"]["freeTimes"]--;
                                            returnData["freeTimes"] = userData["arg"]["freeTimes"];
                                        }
                                        cb(null);
                                    }
                                }else if(type == "1"){//vip界面
                                    if(quitTimes >2){
                                        cb("dbError");
                                    }else{//需求：0-2 3；3-7,6；8-15,9；
                                        darkerType = userData["arg"]["darkerType"];
                                        switch (darkerType){
                                            case "3":
                                            default :
                                                if(vip >= 3){
                                                    darkerType = "3";
                                                    stats.events(userUid,"127.0.0.1",null,mongoStats.P_DARKER2);
                                                }else{
                                                    fkj = true;
                                                }
                                                break;
                                            case "6":
                                                if(vip >= 6){
                                                    darkerType = "6";
                                                    stats.events(userUid,"127.0.0.1",null,mongoStats.P_DARKER4);
                                                }else{
                                                    fkj = true;
                                                }
                                                break;
                                            case "9":
                                                darkerType = "9";
                                                if(vip > 7){
                                                    darkerType = "9";
                                                    stats.events(userUid,"127.0.0.1",null,mongoStats.P_DARKER6);
                                                }else{
                                                    fkj = true;
                                                }
                                                break;
                                        }
                                        if(fkj == false){
                                            while (list.length < mCount) {//需求：1
                                                var randomRate = Math.random();
                                                var q = 0;
                                                for (var j in vipList[darkerType]) {
                                                    q += vipList[darkerType][j]["prob"] - 0;
                                                    if (randomRate <= q) {
                                                        gridIndex = j;
                                                        list.push({"id": vipList[darkerType][j]["id"], "count": vipList[darkerType][j]["count"]});
                                                        break;
                                                    }
                                                }
                                            }
                                            userData["arg"]["gridIndex"] = gridIndex-0;
                                            returnData["gridIndex"] = userData["arg"]["gridIndex"];
                                            userData["arg"]["darkerType"] = "0";//darkerType
                                            returnData["darkerType"] = userData["arg"]["darkerType"];
                                            darkerStatus = 3;
                                            userData["arg"]["darkerStatus"] = darkerStatus;
                                            returnData["status"] = userData["arg"]["darkerStatus"];
                                            returnData["reward"] = list;
                                            userData["arg"]["reward"] = returnData["reward"];
                                            if(userData["arg"]["freeTimes"] >0){
                                                userData["arg"]["freeTimes"]--;
                                                returnData["freeTimes"] = userData["arg"]["freeTimes"];
                                                cb(null);
                                            }else{
                                                if (ingot - runPay < 0) {
                                                    cb("ingotNotEnough");
                                                } else {
                                                    userData["data"] += runPay;
                                                    returnData["userData"] = {"ingot": ingot - runPay};
                                                    returnData["freeTimes"] = userData["arg"]["freeTimes"];
                                                    mongoStats.expendStats("ingot", userUid,"127.0.0.1", null, mongoStats.P_DARKER9, runPay);
                                                    user.updateUser(userUid, returnData["userData"], cb);
                                                }
                                            }
                                        }else{
                                            cb("vipNotEnough");
                                        }

                                    }
//                                async.eachSeries([function(cb){
//
//                                },function(cb){
//
//                                }],function(err,res){});
                                }else{
                                    cb("typeError");
                                }
                            }
                        }
                    });
                },function (cb) {
                    darker.setUserData(userUid, userData, cb);
                },function (cb) {//进背包
                    returnData["rewardList"] = [];
                    async.eachSeries(returnData["reward"], function (reward, esCb) {
                        mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.P_DARKER8, reward["count"]);//活动道具掉落统计
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
        case "quit"://放弃
            async.series([function (cb) {// 取配置
                darker.getConfig(userUid, function (err, res) {
                    if (err) cb(err);
                    else {
                        sTime = res[0] - 0;
                        eTime = res[1] - 0;
                        currentConfig = res[2];
                        freeTimes = currentConfig["freeTimes"];
                        returnData["sTime"] = sTime;
                        returnData["eTime"] = eTime;
                        returnData["config"] = currentConfig;
                        cb(null);
                    }
                });
            },function (cb) {//取用户数据
                darker.getUserData(userUid, sTime, function (err, res) {
                    if (err || res == null)cb("dbError");
                    else {
                        userData = res;
                        userData["arg"]["quitTimes"]++;
                        userData["arg"]["quitTime"] = jutil.now();
                        returnData["quitTimes"] = userData["arg"]["quitTimes"];
                        returnData["quitTime"] = userData["arg"]["quitTime"];
                        userData["status"] = 2;
                        returnData["status"] = userData["status"];
                        switch (userData["arg"]["darkerType"]){
                            case "3":
                            default :
                                    stats.events(userUid,"127.0.0.1",null,mongoStats.P_DARKER3);
                                break;
                            case "6":
                                    stats.events(userUid,"127.0.0.1",null,mongoStats.P_DARKER5);
                                break;
                            case "9":
                                    stats.events(userUid,"127.0.0.1",null,mongoStats.P_DARKER7);
                                break;
                        }
                        userData["arg"]["darkerType"] = "0";
                        returnData["darkerType"] = userData["arg"]["darkerType"];
                        returnData["userFreeTimes"] = userData["arg"]["freeTimes"];
                        cb(null);
                    }
                });
            },function(cb){
                darker.setUserData(userUid, userData, cb);
            }], function (err, res) {
                echo(err, returnData);
            });
            break;
    }function echo(err, res){
        if(err)
            response.echo("practice.darker", jutil.errorInfo(err));
        else
            response.echo("practice.darker",res);
    }
}

exports.start = start;