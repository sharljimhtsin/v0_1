/**
 * Created with JetBrains WebStorm.
 * 宝石迷阵api
 * User: za
 * Date: 16-2-26
 * Time: 上午10:15(预计一周)
 * To change this template use File | Settings | File Templates.
 */

var user = require("../model/user");
var jutil = require("../utils/jutil");
var async = require("async");
var bej = require("../model/practiceBejeweled");
var modelUtil = require("../model/modelUtil");
var formation = require("../model/formation");
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
    var moveCount = 0;//消掉的宝石阵个数
    var buyCount = 0;//购买的步数
    var returnData = {};
    var userData = {};
    var list = {};
    var isFirst = false;
    var bejData = {};
    var userIngot = 0;
    var bejeweledType = 0;//宝石阵的类型个数
    var bejeweledLine = 0;//宝石阵的行数
    var bejeweledLimit = 0;//宝石阵内宝石总个数
    var curMoveList = {};
    var payConfig = [];
    var ghostPayConfig = [];//一键配置
    var specialConfig = {};//积分奖励配置
    var myPoint = 0;//用户的积分
    var reward = "";//奖励个数
    var myStep = 0;//现有步数
    var buyStepTimes = 0;//步数购买次数
    var LimitInPayTimes = 0;//购买步数的次数上限
    var payIngot = 0;//消费的金币数
    var specialStatusList = [];//积分奖励状态列表
    var ghostTimesLimit = 0;
    var rewardList = [];
    var recordList = [];
    var ghostTimes = 0;//一键次数
    var ghostReward = {};//一键获得的奖励
    var ghostGetPoint = 0;//一键获得的积分
    var rankReward = {};
    var rankList = [];
    var specialList = [];
    var LimitInRank = 0;//进排行榜的下限
    var moveLimit = 0;
    var index = 0;
    var freeStep = 0;//免费步数
    var curfreeStep = 0;
    var moveList = [];//保存移动后的宝石阵列数据
    var bejList = [];

    switch(action){//specialStatus--0未领，1已领 freeMoveCount--每日免费移动的步数
        case "get"://取数据--初始化 "bejList"--[[][][][][]]  {"config":{...},"userData":{"bejList":[1-25随机打乱二维数组],"specialStatus":[0,0,0],"point":0,"ghostTimes":3,"freeMoveCount":5}}
        default:
            async.series([function(cb){
                bej.getConfig(userUid,function(err,res){
                    if(err)cb(err);
                    else{
                        currentConfig = res[2];
                        bejeweledType = currentConfig["bejeweledType"]-0;
                        bejeweledLine = currentConfig["bejeweledLine"]-0;
                        ghostTimesLimit = currentConfig["ghostTimesLimit"]-0;
                        specialList = currentConfig["specialList"];
                        returnData["config"] = currentConfig;
                        curfreeStep = currentConfig["freeStep"]-0;
                        specialConfig = currentConfig["specialList"];
                        cb(null);
                    }
                });
            },function(cb){
                    bej.getUserData(userUid,function(err,res){
                        if(err)cb(err);
                        else{
                            list = res;
                            cb(null);
                        }
                    });
            },function(cb){//随机生成【0-5】,5组的二位数组
                bejList = bej.checkedUnRepeat(bejeweledLine,bejeweledType);
                cb(null);
            },function(cb){
                bejData = {"bejList":[],"point":0,"step":0,"buyStepTimes":0,"specialStatusList":[],"ghostStatus":0,"rankStatus":0,"ghostTimes":0,"recordList":[],"rankList":[]};
                bejData["bejList"] = bejList;
                var spList = Object.keys(specialList);
                for(var k in spList){
                    spList[k] = 0;
                }
                bejData["specialStatusList"] = spList;
                bejData["step"] = curfreeStep;
                cb(null);
            },function(cb){//初始化数据
                if (list["arg"] == undefined) {
                    isFirst = true;
                    list["arg"] = bejData;
                    cb(null);
                }else{
                    cb(null);
                }
            },function(cb) {
                if (isFirst) {
                    bej.setUserData(userUid,list["arg"],cb);
                } else {
                    cb(null);
                }
            }],function(err,res){
                returnData["userData"] = list["arg"];
                echo(err,returnData);
            });
            break;
        case "move"://移动消除宝石
            if (jutil.postCheck(postData,"list") == false) {
                echo("postError");
                return false;
            }
            var mList;
            mList = postData["list"];
            async.series([function(cb){
                bej.getUserData(userUid,function(err,res){
                    if(err)cb(err);
                    else{
                        if(res["arg"]["bejList"] == undefined)cb("dbError");
                        else{
                            list = res["arg"];
                            list["bejList"] = mList;
                            list["step"]--;
                            returnData["bejList"] = list["bejList"];
                            cb(null);
                        }
                    }
                });
            },function(cb){
                bej.setUserData(userUid,list,cb);
            }],function(err,res){
                echo(err,returnData);
            });
            break;
        case "remove"://消除: 消除宝石后领奖 传入:"count"--消掉宝石的个数//
            if (jutil.postCheck(postData,"count","list") == false) {
                echo("postError");
                return false;
            }
            moveCount = postData["count"]-0;
            moveList = postData["list"];
            var myDataPoint = 0;
            async.series([function(cb){
                bej.getConfig(userUid,function(err,res){
                    if(err)cb(err);
                    else{
                        currentConfig = res[2];
                        curMoveList = currentConfig["moveList"];
                        moveLimit = currentConfig["moveLimit"]-0;
                        LimitInRank = currentConfig["LimitInRank"]-0;
                        specialConfig = currentConfig["specialList"];
                        if(moveCount >= moveLimit){
                            reward = curMoveList[moveLimit]["reward"];
                            myPoint = curMoveList[moveLimit]["getPoint"]-0;
                            cb(null);
                        }else{
                            if(moveCount < 3){
                                cb("dbError");
                            }else{
                                reward = curMoveList[moveCount]["reward"];
                                myPoint = curMoveList[moveCount]["getPoint"]-0;
                                cb(null);
                            }
                        }
                    }
                });
            },function(cb){
                bej.getUserData(userUid,function(err,res){
                    if(err)cb(err);
                    else{
                        if(res["arg"] == undefined)cb("dbError");
                        else{
                            list = res["arg"];
                            myDataPoint = list["point"]-0;
                            myStep = list["step"]-0;
                            returnData["reward"] = reward;
                            recordList = list["recordList"];
                            for(var i in reward){
                                recordList.push({"id":reward[i]["id"],"count":reward[i]["count"]});
                            }
                            var uniqList = {};
                            for(var x in recordList){
                                x = recordList[x];//x--value
                                var key = x["id"];//Object.keys(x)[0];//key--key
                                if(uniqList.hasOwnProperty(key)){
                                    uniqList[key] = uniqList[key] + x["count"];
                                }else{
                                    uniqList[key] = x["count"];
                                }
                            }
                            var pList = [];
                            var qKey = Object.keys(uniqList);
                            for(var t in qKey){
                                pList.push({"id":qKey[t],"count":uniqList[qKey[t]]});
                            }
                            list["point"] = myDataPoint + myPoint;
                            list["recordList"] = pList;
                            list["step"] = myStep;
                            list["bejList"] = moveList;

                            for(var s in specialConfig){
                                if(list["point"] >= specialConfig[s]["needPoint"] && list["specialStatusList"][s] != 2){
                                    list["specialStatusList"][s] = 1;
                                }
                            }
                            returnData["specialStatusList"] = list["specialStatusList"];
                            returnData["point"] = list["point"];
                            returnData["list"] = list["bejList"];
                            cb(null);
                        }
                    }
                });
            },function(cb){
                if(list["point"] > LimitInRank){
                    bej.add(userUid,list["point"],cb);
                }else{
                    cb(null);
                }
            },function(cb){
                bej.setUserData(userUid,list,cb);
            },function(cb){
                returnData["rewardList"] = [];
                async.eachSeries(returnData["reward"], function(reward, esCb){
                    mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.A_BEJ2, reward["count"]);
                    modelUtil.addDropItemToDB(reward["id"], reward["count"], userUid, false, 1, function(err, res){
                        if (err) {
                            esCb(err);
                            console.error(reward["id"], reward["count"], err.stack);
                        } else {
                            if(res instanceof Array){
                                for(var i in res){
                                    returnData["rewardList"].push(res[i]);
                                }
                            } else {
                                returnData["rewardList"].push(res);
                            }
                            esCb(null);
                        }
                    });
                }, cb);
            }],function(err,res){
                echo(err,returnData);
            });
            break;
        case "buy"://购买步数 传入:"count"//步数
            if (jutil.postCheck(postData,"count") == false) {
                echo("postError");
                return false;
            }
            buyCount = postData["count"]-0;
            async.series([function(cb){//取配置
                bej.getConfig(userUid,function(err,res){
                    if(err)cb(err);
                    else{
                        currentConfig = res[2];
                        payConfig = currentConfig["payList"];
                        LimitInPayTimes = currentConfig["LimitInPayTimes"]-0;
                        cb(null);
                    }
                });
            },function(cb){//取数据
                bej.getUserData(userUid,function(err,res){
                    if(err)cb(err);
                    else{
                        if(res["arg"] == undefined)cb("dbError");
                        else{
                            bejData = res["arg"];
                            buyStepTimes = bejData["buyStepTimes"]-0;// + buyCount;//购买次数
                            if(buyStepTimes + buyCount > LimitInPayTimes){
                                cb("noEnoughBuyTimes");//今日可购买次数达到上限
                            }else{
//                                var kk = [];
                                var upCount = 0;
                                for(var i = 1;i <= buyCount;i++){
                                    upCount++;
                                    buyStepTimes ++;
                                    for(var p in payConfig){
                                        if(payConfig[p]["s"] <= buyStepTimes && buyStepTimes <= payConfig[p]["e"]){
//                                            kk.push(payConfig[p]["pay"]);
                                            payIngot += payConfig[p]["pay"];
//                                            kk.push(payConfig[p]["pay"]);
                                            break;
                                        }
                                    }
                                }
//                                console.log(buyStepTimes,"wc....",payIngot,kk);
                                var bStepTimes = buyStepTimes-0;
//                                console.log(payIngot,"44444",buyStepTimes,bStepTimes);
                                bejData["buyStepTimes"] = bStepTimes;
                                bejData["step"] += upCount;
//                                console.log(payIngot,"2",bejData["step"],bejData["buyStepTimes"]);
                                cb(null);
                            }
                        }
                    }
                });
            },function(cb){//取用户金币数据
                user.getUser(userUid,function(err,res){
                    if(err)cb(err);
                    else{
                        if(res["ingot"] - payIngot < 0)cb("dbError");
                        else{
                            userIngot = res["ingot"]-0 - payIngot;
                            mongoStats.expendStats("ingot", userUid,"127.0.0.1", null, mongoStats.A_BEJ1, payIngot);
                            cb(null);
                        }
                    }
                });
            },function(cb){
                bej.setUserData(userUid,bejData,cb);
            },function(cb){
                returnData["userData"] = {"ingot":userIngot};
                user.updateUser(userUid,returnData["userData"],cb);
            }],function(err,res){
                echo(err,returnData);
            });
            break;
        case "rewardRecord"://当天奖励展示
            async.series([function(cb){
                bej.getUserData(userUid,function(err,res){
                    if(err || res["arg"] == undefined)cb(err);
                    else{
                        bejData = res["arg"];
                        var aList = {};
                        var bList = [];
                        for(var x in bejData["recordList"]){
                            x = bejData["recordList"][x];
                            var key = x["id"];
                            if(aList.hasOwnProperty(key)){
                                aList[key] = aList[key] + x["count"];
                            }else{
                                aList[key] = x["count"];
                            }
                        }

                        var cList = Object.keys(aList);
                        for(var y in cList){
                            var cou = aList[cList[y]];
                            bList.push({"id":cList[y],"count":cou});
                        }
                        bejData["recordList"] = bList;
                        returnData["recordList"] = bejData["recordList"];
                        cb(null);
                    }
                });
            },function(cb){
                bej.setUserData(userUid,bejData,cb);
            }],function(err,res){
                echo(err,returnData);
            });
            break;
        case "ghost"://一键消除
            async.series([function(cb){//取配置
                bej.getConfig(userUid,function(err,res){
                    if(err)cb(err);
                    else{
                        currentConfig = res[2];
                        bejeweledType = currentConfig["bejeweledType"]-0;//5种类型
                        bejeweledLine = currentConfig["bejeweledLine"]-0;//5行宝石阵
                        bejeweledLimit = currentConfig["bejeweledLimit"]-0;//宝石总个数
                        ghostReward = currentConfig["moveList"][bejeweledLimit];
                        rewardList = ghostReward["reward"];//一键获得的奖励
                        ghostGetPoint = ghostReward["getPoint"]-0;//一键获得的积分
                        ghostPayConfig = currentConfig["ghostPay"];//一键金币消耗的配置
                        LimitInRank = currentConfig["LimitInRank"]-0;//进排行榜的下限
                        ghostTimesLimit = currentConfig["ghostTimesLimit"]-0;//一键的次数上限
                        specialConfig = currentConfig["specialList"];
//                        console.log(key,bejeweledType,bejeweledLine,bejeweledLimit,ghostReward,rewardList,ghostGetPoint,ghostPayConfig);
                        cb(null);
                    }
                });
            },function(cb){//随机生成【0-5】,5组的二位数组
                bejList = bej.checkedUnRepeat(bejeweledLine,bejeweledType);
                cb(null);
            },function(cb){//取数据
                bej.getUserData(userUid,function(err,res){
                    if(err)cb(err);
                    else{
                        bejData = res["arg"];
                        ghostTimes = bejData["ghostTimes"]-0;
                        myStep = bejData["step"]-0;
                        if(ghostTimesLimit - ghostTimes <= 0)cb("timesNotEnough");//一键3次用完
                        else{
//                        if(ghostPayConfig[ghostTimes] == undefined){//测试代码
//                            payIngot = ghostPayConfig[2]-0;
//                        }
                            payIngot = ghostPayConfig[ghostTimes]-0;
                            ghostTimes++;
                            bejData["ghostTimes"] = ghostTimes;
                            myPoint = bejData["point"]-0;
                            bejData["bejList"] = bejList;
                            bejData["point"] =  myPoint + ghostGetPoint;
                            bejData["step"] =  myStep;
                            for(var p in rewardList){
                                bejData["recordList"].push({"id":rewardList[p]["id"],"count":rewardList[p]["count"]});
                            }
                            for(var s in specialConfig){
                                if(bejData["point"] >= specialConfig[s]["needPoint"] && bejData["specialStatusList"][s] != 2){
                                    bejData["specialStatusList"][s] = 1;
                                }
                            }
                            cb(null);
                        }
                    }
                });
            },function(cb){//取用户金币数据
                user.getUser(userUid,function(err,res){
                    if(err)cb(err);
                    else{
                        if(res["ingot"] - payIngot < 0)cb("ingotNotEnough");
                        else{
                            userIngot = res["ingot"]-0;
                            cb(null);
                        }
                    }
                });
            },function(cb){
//                console.log(userIngot,payIngot,"243423234");
                returnData["myIngot"] = {"ingot":userIngot - payIngot};
                stats.events(userUid,"127.0.0.1",null,mongoStats.A_BEJ6);
                mongoStats.expendStats("ingot", userUid,"127.0.0.1", null, mongoStats.A_BEJ1, payIngot);
                user.updateUser(userUid,returnData["myIngot"],cb);
            },function(cb){
                if(bejData["point"] > LimitInRank){
                    bej.add(userUid,bejData["point"],cb);
                }else{
                    cb(null);
                }
            },function(cb){
                returnData["bejData"] = bejData;
                bej.setUserData(userUid,bejData,cb);
            },function(cb){
                returnData["rewardList"] = [];
                returnData["reward"] = rewardList;
                async.eachSeries(returnData["reward"], function(reward, esCb){
                    mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.A_BEJ2, reward["count"]);
                    modelUtil.addDropItemToDB(reward["id"], reward["count"], userUid, false, 1, function(err, res){
                        if (err) {
                            esCb(err);
                            console.error(reward["id"], reward["count"], err.stack);
                        } else {
                            if(res instanceof Array){
                                for(var i in res){
                                    returnData["rewardList"].push(res[i]);
                                }
                            } else {
                                returnData["rewardList"].push(res);
                            }
                            esCb(null);
                        }
                    });
                }, cb);
            }],function(err,res){
                echo(err,returnData);
            });
            break;
        case "specialList"://积分奖励 index 0-2
            if (jutil.postCheck(postData,"index") == false) {
                echo("postError");
                return false;
            }
            index = postData["index"]-0;//参数须为0-2
            async.series([function(cb){//取配置
                bej.getConfig(userUid,function(err,res){
                    if(err)cb(err);
                    else{
                        currentConfig = res[2];
                        specialConfig = currentConfig["specialList"];
                        if(index> 2 || index < 0){
                            cb("typeError");
                        }else{
                            cb(null);
                        }
                    }
                });
            },function(cb){//取数据
                bej.getUserData(userUid,function(err,res){
                    if(err)cb(err);
                    else{
                        bejData = res["arg"];
                        myPoint = bejData["point"]-0;//积分
                        specialStatusList = bejData["specialStatusList"];
                        if(specialStatusList[index] == 2){
                            cb("haveReceive");//今日已领取过
                        }else{
                            var needPoint = specialConfig[index]["needPoint"]-0;
                            if(myPoint >= needPoint && bejData["specialStatusList"][index] == 1){//可以领
                                bejData["specialStatusList"][index] = 2;
//                                myPoint = myPoint - needPoint;
                                bejData["point"] = myPoint-0;
                                rewardList = specialConfig[index]["reward"];
                                for(var y in rewardList){
                                    bejData["recordList"].push({"id":rewardList[y]["id"],"count":rewardList[y]["count"]});
                                }
                                switch (index){
                                    case "0":
                                    default :
                                        stats.events(userUid,"127.0.0.1",null,mongoStats.A_BEJ3);//宝石迷阵第一档奖励领取
                                        break;
                                    case "1":
                                        stats.events(userUid,"127.0.0.1",null,mongoStats.A_BEJ4);//宝石迷阵第二档奖励领取
                                        break;
                                    case "2":
                                        stats.events(userUid,"127.0.0.1",null,mongoStats.A_BEJ5);//宝石迷阵第三档奖励领取
                                        break;
                                }
                                cb(null);
                            }else{
                                cb("pointNotEnough");
                            }
                        }
                    }
                });
            },function(cb){
                bej.setUserData(userUid,bejData,cb);
            },function (cb) {
                returnData["rewardList"] = [];
                returnData["reward"] = rewardList;
                async.eachSeries(returnData["reward"], function (reward, esCb) {
                    mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.A_BEJ2, reward["count"]);
                    modelUtil.addDropItemToDB(reward["id"], reward["count"], userUid, false, 1, function (err, res) {
                        if (err) {
                            esCb(err);
                            console.error(reward["id"], reward["count"], reward["isPatch"], reward["level"], err.stack);
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
            }],function(err,res){
                echo(err,returnData);
            });
            break;
        case "rank"://排行榜显示数据：[{"userUid":"XXX","heroId":"XXX","point":100,"reward":[{"id":"XXX","count":1}]},...]
            var rData = [];
            var isOrigin = false;
            async.series([function(cb){//取配置
                bej.getConfig(userUid,function(err,res){
                    if(err)cb(err);
                    else{
                        currentConfig = res[2];
                        rankReward = currentConfig["rankReward"];
                        cb(null);
                    }
                });
            },function(cb){
                bej.getRankList(userUid,function(err,res){
                    if(err)cb(err);
                    else{
                        if(res == null){
                            returnData["rankData"] = [];
                            isOrigin = true;
                            cb(null);
                        }else{
                            rankList = res;
                            bej.getUserData(userUid,function(err,res){
                                if(err)cb(err);
                                else{
                                    if(res == null||res["arg"] == undefined)cb("dbError");
                                    else{
                                        bejData = res["arg"];
                                        var top = 0;
                                        async.eachSeries(rankList, function (rankData, esCb) {
                                            top++;
                                            rankData["top"] = top;
                                            rankData["reward"] = rankReward[top];
                                            user.getUser(rankData["userUid"], function (err, res) {
                                                if (err || res == null) {
                                                    esCb("dbError");
                                                } else {
                                                    rankData["userName"] = res["userName"];
                                                    formation.getUserHeroId(rankData["userUid"], function (err, res) {
                                                        rankData["heroId"] = res;
                                                        rData.push(rankData);
                                                        esCb(err);
                                                    });
                                                }
                                            });
                                        }, cb);
                                    }
                                }
                            });
                        }
                    }
                });
            },function(cb){
                if(!isOrigin){
                    bejData["rankList"] = rData;
                    returnData["rankData"] = bejData["rankList"];
                    bej.setUserData(userUid,bejData,cb);
                }else{
                    cb(null);
                }
            }],function(err,res){
                echo(err,returnData);
            });
            break;
    }function echo(err, res){
        if(err){
            response.echo("practice.bejeweled", jutil.errorInfo(err));
        } else{
            response.echo("practice.bejeweled",res);
        }
    }
}
exports.start = start;