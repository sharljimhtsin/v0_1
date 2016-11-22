/**
 * 折扣商店--practice.rebateShop
 * User: za
 * Date: 16-1-7 （到14号结）.
 * Time: 下午 19:07
 */

var jutil = require("../utils/jutil");
var async = require("async");
var activityConfig = require("../model/activityConfig");
var reShop = require("../model/practiceRebateShop");
var user = require("../model/user");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "action") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var action = postData["action"];
    var currentConfig;//配置
    var returnData = {};//返回用户初始化数据集合
    var userData = {};//返回用户初始化数据集合
    var list = [];
    var isFirst = false;
    var nowPlan = 0;
    var aList = [];
    var bList = [];
    var reAList = [];
    var reBList = [];
    var mBList = [];
    var manle = false;
    var reNowPlan = 0;
    var limit = 0;
    var limit1 = 0;
    var aShop = [];
    var bShop = [];
    var chooseShop = [];
    var refeshTime = [];
    var autoReFesh = false;
    var payIngot = 0;
    var payGold = 0;
    var limitList = [];
    var limitPlan = 0;
    var planStatus = 0;
    var nowPlanStatus = 0;
    var addPlan = 0;//添加进度条的数值
    var payType = "";
    var rewardData = [];
    var freshTimes = 0;
    var nowFSTime = 0;
    var nowTime = 0;
    switch(action){
        case "get"://取--初始化
        default:
            async.series([function(cb){
                reShop.getConfig(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        currentConfig = res[2];
                        currentConfig["sTime"] = res[0];
                        currentConfig["eTime"] = res[1];
                        returnData["config"] = currentConfig;
                        limit = currentConfig["limitReward"]-0;
                        limit1 = currentConfig["limitReward1"]-0;
                        aShop = currentConfig["aShop"];
                        bShop = currentConfig["bShop"];
                        limitPlan = currentConfig["limitPlan"]-0;
                        refeshTime = currentConfig["refeshTime"];//[9,12,18,21]
                        nowTime = jutil.now();
                        returnData["nowTime"] = nowTime;
                        var Hour = (jutil.now() - jutil.todayTime());
                        //刷新第一个商店
                        for(var x in refeshTime){
                            var x1 = refeshTime[x] * 3600;
                            if(Hour >= x1){
                                autoReFesh = true;
                                freshTimes = jutil.now();
                                break;
                            }
                        }
                        cb(null);
                    }
                });
            }, function(cb) {
//                console.log(currentConfig["sTime"],"2324423");
                reShop.getUserData(userUid, currentConfig["sTime"], function(err,res){
                    if(err)cb(err);
                    else{
                        if (err) cb(err);
                        else {
//                            console.log(res,"23123231");
                            list = res;
                            if(list["arg"] != undefined){
                                reAList = res["arg"]["aList"];
                                reNowPlan = res["arg"]["nowPlan"];
                                nowPlanStatus = res["arg"]["planStatus"]-0;
                                list["arg"]["eTime"] = res["arg"]["eTime"];
                                if(reNowPlan >= limitPlan && nowPlanStatus == 1){//进度条满了，可以购买，状态改为0
                                    manle = true;
                                    var ct = 0;
                                    for(var y in res["arg"]["bList"]){//进度条满，状态为1
                                        if(res["arg"]["bList"][y]["status"] == 1){
                                            ct++;
                                        }
                                    }
                                    if(ct == limit){//没有领过道具
                                        for(var p in res["arg"]["bList"]){//进度条满，状态为0
                                            mBList.push({"id":res["arg"]["bList"][p]["id"],"status":0});
                                        }
                                    }else{
                                        mBList = res["arg"]["bList"];
                                    }
                                }else{
                                    nowFSTime = list["arg"]["freshTimes"];
                                    reBList = res["arg"]["bList"];
                                }
                                cb(null);
                            }else{
                                cb(null);
                            }
                        }
                    }
                });
            },function(cb){
                var xList = [];
                var limit2 = limit - limit1;
                while(aList.length < limit1){//1格
                    var randomRate1 = Math.random();
                    var a = 0;
                    for(var i in aShop){//需求：商城第一格必须为gold兑换
                        a += aShop[i]["prob"] - 0;
                        if (randomRate1 <= a) {
                            if(aShop[i]["costType"] == "gold"){
                                aList.push({"id":i,"status":0});
                                break;
                            }
                        }
                    }
                }
                while(xList.length < limit2){//5格
                    var randomRate2 = Math.random();
                    var p = 0;
                    for(var k in aShop){//需求：商城后五个格子不能为gold兑换
                        p += aShop[k]["prob"] - 0;
                        if (randomRate2 <= p) {
                            if(aShop[k]["costType"] != "gold"){
                                xList.push({"id":k,"status":0});
                                break;
                            }
                        }
                    }
                }
                for(var hh in xList){
                    aList.push({"id":xList[hh]["id"],"status":0});
                }
                while(bList.length < limit){
                    var randomRate3 = Math.random();
                    var q = 0;
                    for(var j in bShop){
                        q += bShop[j]["prob"] - 0;
                        if (randomRate3 <= q) {
                            bList.push({"id":j,"status":1});
                            break;
                        }
                    }
                }
                cb(null);
            },function(cb){//初始化数据
                if (list["arg"] == undefined) {
                    isFirst = true;
                    list["arg"] = {
                        "sTime":currentConfig["sTime"],
                        "eTime":currentConfig["eTime"],
                        "aList": aList,
                        "bList": bList,
                        "nowPlan": nowPlan,
                        "planStatus" : planStatus,
                        "freshTimes" :jutil.now()
                    };
                } else{
                    if(manle){//刷新第二个商店
                        list["arg"] = {
                            "sTime":currentConfig["sTime"],
                            "eTime":currentConfig["eTime"],
                            "aList": reAList,
                            "bList": mBList,
                            "nowPlan": reNowPlan,
                            "planStatus" : nowPlanStatus,
                            "freshTimes" :nowFSTime
                        };
                    }
                }
                cb(null);
            },function(cb) {
//                console.log(list["arg"],"13131");
                if (isFirst || manle) {
//                    console.log("22-28充值总数",list["arg"]);
                    reShop.setUserData(userUid,list["arg"],cb);
                } else {
                    cb(null);
                }
            }],function(err,res){
                returnData["userData"] = list;
                echo(err,returnData);
            });
            break;
        case "buy":
            if (jutil.postCheck(postData, "index","shop") == false) {
                echo("postError");
                return false;
            }
            var index = postData["index"] - 0;
            var shopType = postData["shop"];
            async.series([function(cb){
                reShop.getConfig(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        currentConfig = res[2];
                        currentConfig["sTime"] = res[0];
                        aShop = currentConfig["aShop"];
                        bShop = currentConfig["bShop"];
                        limit = currentConfig["limitReward"]-0;
                        limit1 = currentConfig["limitReward1"]-0;
                        limitList = currentConfig["limitList"];
                        limitPlan = currentConfig["limitPlan"]-0;
                        if(shopType == "normal"){
                            chooseShop = currentConfig["aShop"];
                            cb(null);
                        }else if(shopType == "special"){
                            chooseShop = currentConfig["bShop"];
                            cb(null);
                        }else{
                            cb("valueError");//传入的值有误
                        }
                    }
                });
            },function(cb){//拼数据
                var xList3 = [];
                var limit2 = limit - limit1;
                while(aList.length < limit1){//1格
                    var randomRate1 = Math.random();
                    var a = 0;
                    for(var i in aShop){//需求：商城第一格必须为gold兑换
                        a += aShop[i]["prob"] - 0;
                        if (randomRate1 <= a) {
                            if(aShop[i]["costType"] == "gold"){
                                aList.push({"id":i,"status":0});
                                break;
                            }
                        }
                    }
                }
                while(xList3.length < limit2){//5格
                    var randomRate2 = Math.random();
                    var p = 0;
                    for(var k in aShop){//需求：商城后五个格子不能为gold兑换
                        p += aShop[k]["prob"] - 0;
                        if (randomRate2 <= p) {
                            if(aShop[k]["costType"] != "gold"){
                                xList3.push({"id":k,"status":0});
                                break;
                            }
                        }
                    }
                }
                for(var hh in xList3){
                    aList.push({"id":xList3[hh]["id"],"status":0});
                }
                while(bList.length < limit){
                    var randomRate3 = Math.random();
                    var q = 0;
                    for(var j in bShop){
                        q += bShop[j]["prob"] - 0;
                        if (randomRate3 <= q) {
                            bList.push({"id":j,"status":1});
                            break;
                        }
                    }
                }
                cb(null);
            },function(cb){
                reShop.getUserData(userUid, currentConfig["sTime"], function(err,res){
                    if(err)cb(err);
                    else{
                        userData = res["arg"];
                        if(userData["aList"] == undefined||userData["bList"] == undefined || userData["nowPlan"] == undefined || userData["freshTimes"] == undefined){
                            cb("dbError");
                        } else{
                            reNowPlan = res["arg"]["nowPlan"];
                            reBList = res["arg"]["bList"];
                            reAList = res["arg"]["aList"];
                            nowFSTime = userData["freshTimes"] == 0 ? jutil.now() : userData["freshTimes"];
                            planStatus = res["arg"]["planStatus"];
                            if(shopType == "normal"){
                                if(userData["aList"][index]["status"] == 1){
                                    cb("haveReceive");
                                } else{
                                    userData["aList"][index]["status"] = 1;
                                    nowPlan = userData["nowPlan"]-0;
                                    planStatus = userData["planStatus"]-0;
                                    returnData["index"] = userData["aList"][index]["id"];
                                    rewardData.push({"id":chooseShop[returnData["index"]]["id"],"count":chooseShop[returnData["index"]]["count"]});
                                    cb(null);
                                }
                            } else if(shopType == "special"){
                                if(userData["bList"][index]["status"] == 0){
                                    userData["bList"][index]["status"] = 1;
                                    nowPlan = userData["nowPlan"]-0;
                                    returnData["index"] = userData["bList"][index]["id"];
                                    rewardData.push({"id":chooseShop[returnData["index"]]["id"],"count":chooseShop[returnData["index"]]["count"]});
                                    cb(null);
                                }else{
                                    cb("haveReceive");
                                }
                            }
                        }
                    }
                });
            },function(cb){
                var ind = returnData["index"]-0;
                var payCount = chooseShop[ind]["cost"]-0;
                var payRebate = chooseShop[ind]["rebate"]-0;
                if(chooseShop[ind]["costType"] == "ingot"){
                    payType = "ingot";
                    returnData["type"] ="ingot";
                    payIngot = payCount * payRebate;
                    for(var ll in limitList){
                        if(payIngot >= limitList[ll]["sectionSt"] && payIngot <= limitList[ll]["sectionEd"]){
                            addPlan = limitList[ll]["value"]-0;
                            nowPlan = nowPlan + addPlan;
                        }
                    }
                }else if(chooseShop[ind]["costType"] == "gold"){
                    payType = "gold";
                    returnData["type"] ="gold";
                    payGold = payCount * payRebate;
                    addPlan = limitList[0]["value"]-0;
                    nowPlan = nowPlan + addPlan;
                }
                var bbb = 0;
                for(var b in userData["bList"]){
                    if(userData["bList"][b]["status"] == 1){
                        bbb++;
                    }
                }
                if(nowPlan >= limitPlan && bbb == userData["bList"].length){//进度条已满
                    nowPlan = limitPlan-0;
                    planStatus = 1;
                    userData["planStatus"] = planStatus;
                    for(var p in userData["bList"]){//进度条满，状态为0
                        mBList.push({"id":userData["bList"][p]["id"],"status":0});
                    }
                    userData["bList"] = mBList;
//                    console.log(mBList,"31331231");
                }
//                console.log(nowPlan,limitPlan,"zzzz...");
                if(nowPlan >= limitPlan){
                    nowPlan = limitPlan-0;
                }

                userData["nowPlan"] = nowPlan;
                returnData["nowPlan"] = userData["nowPlan"];
                cb(null);
            },function(cb) {//取用户金币数
                user.getUser(userUid,function(err,res){
                    if(err || res == null){
                        cb("dbError");
                    } else if(res["ingot"] - payIngot < 0){
                        cb("ingotNotEnough");
                    } else if(res["gold"] - payGold < 0){
                        cb("goldNotEnough");
                    }  else {
                        if(payType == "ingot"){
                            user.updateUser(userUid, {"ingot":res["ingot"] - payIngot},cb);//更新玩家金币数据
                            mongoStats.expendStats("ingot", userUid,"127.0.0.1", null, mongoStats.P_REBATESHOP3, payIngot);
                        }else if(payType == "gold"){
                            user.updateUser(userUid, {"gold":res["gold"] - payGold},cb);//更新玩家索尼数据
                            mongoStats.expendStats("gold", userUid,"127.0.0.1", null, mongoStats.P_REBATESHOP2, payGold);
                        }
                    }
                });
            }, function(cb){
                reShop.setUserData(userUid, userData, cb);
            },function(cb){
                returnData["rewardList"] = [];
                returnData["reward"] = rewardData;
                async.eachSeries(returnData["reward"], function (reward, esCb) {
                    mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.P_REBATESHOP1, reward["count"]);
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
                echo(err, returnData);
            });
            break;
    }
    function echo(err, res){
        if(err){
            response.echo("practice.rebateShop", jutil.errorInfo(err));
        } else{
            response.echo("practice.rebateShop",res);
        }
    }
}
exports.start = start;