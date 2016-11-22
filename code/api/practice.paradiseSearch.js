/**
 * 神龙卡片翻翻翻活动的接口--paradiseSearch
 * User: za
 * Date: 15-9-18
 * Time: 下午19:13
 */
var jutil = require("../utils/jutil");
var async = require("async");
var paradise = require("../model/practiceParadiseSearch");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");
var configManager = require("../config/configManager");
var equipment = require("../model/equipment");
var user = require("../model/user");
var teach = require("../model/teach");
var card = require("../model/card");
var formation = require("../model/formation");
var debris = require("../model/debris");
var heroSoul = require("../model/heroSoul");
var hero = require("../model/hero");
var item = require("../model/item");
var skill = require("../model/skill");
var userVariable = require("../model/userVariable");

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
    var userData = {};
    var rewardList = [];
    var ingot = 0;
    var userPoint = 0;
    var openIngot = 0;
    var ghostIngot = 0;
    var specialRewardList = [];
    var list = [];
    var crossCt = 0;
    var pokerCount = 0;
    var status = 0;//0-游戏开始,1-翻牌中,2-游戏中断（放弃），继续不用加状态
    var chooseStatus = 0;
    var showCrossList = [];
    var kk = true;
    var spList = [];
    var showList = [];
    var pay = 0;
    var nowRewardList = [];


    function randomsort(a, b) {//随机打乱数组
        return Math.random()>0.5 ? -1 : 1;//用Math.random()函数生成0~1之间的随机数与0.5比较，返回-1或1
    }
    switch (action){
        case "get"://取数据
        default:
            async.series([function(cb) {// 取配置
                paradise.getConfig(userUid, function(err, res){
                        if (err) cb(err);
                        else {
                            sTime = res[0]-0;
                            eTime = res[1]-0;
                            currentConfig = res[2];
                            rewardList = currentConfig["rewardList"];
                            pokerCount = currentConfig["pokerCount"]-0;
                            specialRewardList = currentConfig["specialRewardList"];
                            for(var pp in specialRewardList){
                                spList.push({"id":specialRewardList[pp]["id"],"status":0});
                            }
                            returnData["sTime"] = sTime;
                            returnData["eTime"] = eTime;
                            returnData["config"] = currentConfig;
                            cb(null);
                        }
                    });
                },function(cb){
                paradise.getUserData(userUid,sTime, false,function(err,res){//取用户数据
                    if(err||res["arg"] == null|| res["arg"]["rewardList"] == undefined)cb("dbError");
                    else {
                        userData = res;
                        returnData["status"]  = userData["status"];
                        returnData["point"] = userData["arg"]["point"];
                        if(userData["arg"]["ghostStatus"] == 1){
                            userData["arg"]["ghostStatus"] = 0;
                            while(list.length < pokerCount){//需求：1,10,100
                                var randomRate = Math.random();
                                var p = 0;
                                for(var i in rewardList){
                                    p += rewardList[i]["prob"] - 0;
                                    if (randomRate <= p) {
                                        list.push({"id":rewardList[i]["id"],"count":rewardList[i]["count"],"status":0});
                                        break;
                                    }
                                }
                            }
                            userData["arg"]["rewardList"] = list;
                            returnData["list"] = userData["arg"]["rewardList"];
                            if(userData["arg"]["specialRewardList"][0]["status"] != undefined){
                                returnData["specialRewardList"] = userData["arg"]["specialRewardList"];
                            }else{
                                var bList = [];
                                for(var xx in userData["arg"]["specialRewardList"]){
                                    bList.push({"id":userData["arg"]["specialRewardList"][xx]["id"],"count":userData["arg"]["specialRewardList"][xx]["count"],"status":0});
                                }
                                userData["arg"]["specialRewardList"] = bList;
                                returnData["specialRewardList"] = userData["arg"]["specialRewardList"];
                            }
                            showList = list.sort(randomsort);
                            userData["arg"]["showList"] = showList;
                            returnData["showList"] = userData["arg"]["showList"];
                            cb(null);
                        }else{
                            returnData["list"] = userData["arg"]["rewardList"];
                            if(userData["arg"]["showList"] == undefined){
                                showList = returnData["list"].sort(randomsort);
                                userData["arg"]["showList"] = showList;
                                returnData["showList"] = userData["arg"]["showList"];
                            }else{
                                returnData["showList"] = userData["arg"]["showList"];
                            }
                            if(userData["arg"]["specialRewardList"][0]["status"] != undefined){
                                returnData["specialRewardList"] = userData["arg"]["specialRewardList"];
                            }else{
                                var bList = [];
                                for(var xx in userData["arg"]["specialRewardList"]){
                                    bList.push({"id":userData["arg"]["specialRewardList"][xx]["id"],"count":userData["arg"]["specialRewardList"][xx]["count"],"status":0});
                                }
                                userData["arg"]["specialRewardList"] = bList;
                                returnData["specialRewardList"] = userData["arg"]["specialRewardList"];
                            }
                            cb(null);
                        }
                    }
                });
            },function(cb){//更新数据
                paradise.setUserData(userUid,userData,cb);
            }],function(err,res){
                echo(err,returnData);
            });
            break;
        case "cross"://翻牌：
            if (jutil.postCheck(postData, "index","status") == false) {
                echo("postError");
                return false;
            }
            var index = postData["index"];//档位
            status = postData["status"];//
            async.series([function(cb) {// 获取活动配置数据
                paradise.getConfig(userUid, function(err, res){
                    if (err) cb(err);
                    else {
                        sTime = res[0];
                        eTime = res[1];
                        currentConfig = res[2];
                        openIngot = currentConfig["openIngot"];
                        pokerCount = currentConfig["pokerCount"]-0;
                        cb(null);
                    }
                });
            },function(cb){//取用户数据
                paradise.getUserData(userUid, sTime, false, function(err,res){
                    if(err||res["arg"] == null || res["arg"]["rewardList"] == undefined)cb("dbError");
                    else {
                        userData = res;

                        userData["status"] = 2;
                        returnData["status"]  = userData["status"];
                        userPoint = userData["arg"]["point"]-0;
                        rewardList = userData["arg"]["rewardList"];
                        showList = userData["arg"]["showList"];
                        specialRewardList = userData["arg"]["specialRewardList"];

                        for(var ii in specialRewardList){
                            spList.push({"id":specialRewardList[ii]["id"],"status":0});
                        }
                        returnData["showCrossList"] = showCrossList;
                        if(rewardList[index]["status"] == 1){
                            cb("haveReceive");
                        }else if(rewardList[index]["status"] == 0){
                            rewardList[index]["status"] = 1;
                            list.push({"id":rewardList[index]["id"],"count":rewardList[index]["count"]});
                            returnData["reward"] = list;
                            var p = 0;
                            for(var x in rewardList){
                                if(rewardList[x]["status"] == 1){
                                    p++;
                                }
                            }

                            if(userData["arg"]["crossCt"] > 6 || p == 1){
                                userData["arg"]["crossCt"] = 0;
                            }
                            userData["arg"]["crossCt"]++;
                            userPoint++;
                            userData["arg"]["showList"] = showList;
                            returnData["showList"] = userData["arg"]["showList"];
                            userData["arg"]["specialRewardList"] = specialRewardList;
                            returnData["specialRewardList"] = userData["arg"]["specialRewardList"];
                            userData["arg"]["point"] = userPoint -0;
                            userData["arg"]["rewardList"] = rewardList;
                            returnData["point"] = userData["arg"]["point"] ;//道具个数
                            returnData["rewardList"] = userData["arg"]["rewardList"];
                            cb(null);
                        }else{
                            cb("dbError");
                        }
                    }
                });
            },function(cb){
                paradise.setUserData(userUid, userData, cb);
            },function (cb) {//进背包
                returnData["rewardList"] = [];
                stats.events(userUid,"127.0.0.1",null,mongoStats.P_PARADISESEARCH1);//翻翻翻点击翻牌的次数统计
                async.eachSeries(returnData["reward"], function (reward, esCb) {
                    mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.P_PARADISESEARCH6, reward["count"]);//翻翻翻道具掉落统计
                    addDropItem(reward["id"], reward["count"], userUid, false, 1, function(err,res){
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
        case "special"://积分奖励：积分达到可以兑换
            if (jutil.postCheck(postData, "gears") == false) {
                echo("postError");
                return false;
            }
            if (postData["gears"] == null || specialArr.indexOf(postData["gears"]) == -1) {//类型判断
                echo("typeError");
                return;
            }
            var gears = postData["gears"];//商城列表（数组下标）
            async.series([function(cb){//取用户配置
                paradise.getConfig(userUid,function(err,res){
                    if (err) cb(err);
                    else {
                        sTime = res[0]-0;
                        eTime = res[1]-0;
                        currentConfig = res[2];
                        specialRewardList = currentConfig["specialRewardList"];
                        cb(null);
                    }
                });
            },function(cb){//取用户数据
                paradise.getUserData(userUid,sTime, false, function (err, res) {
                    if(err||res["arg"] == null)cb("dbError");
                    else {
                        userData = res;
                        userPoint = userData["arg"]["point"];
                        if(userData["arg"]["specialRewardList"][gears]["status"] == 0 && userPoint >= specialRewardList[gears]["point"]){//可领
                            userData["arg"]["specialRewardList"][gears]["status"] = 1;
                            userData["arg"]["point"] = userPoint;
                            var kkkList = [];
                            kkkList.push({"id":specialRewardList[gears]["id"],"count":specialRewardList[gears]["count"]});
                            returnData["reward"] = kkkList;
                            if(gears == 0){
                                stats.events(userUid,"127.0.0.1",null,mongoStats.P_PARADISESEARCH3);//翻翻翻领取第1档奖励的次数
                            }else if(gears == 1){
                                stats.events(userUid,"127.0.0.1",null,mongoStats.P_PARADISESEARCH4);//翻翻翻领取第2档奖励的次数
                            }else{
                                stats.events(userUid,"127.0.0.1",null,mongoStats.P_PARADISESEARCH5);//翻翻翻领取第3档奖励的次数
                            }
                            cb(null);
                        }else if(userData["arg"]["specialRewardList"][gears]["status"] == 1){//已领
                            cb("haveReceive");
                        }
                    }
                });
            },function(cb){//更新数据
                paradise.setUserData(userUid,userData,cb);
            },function (cb) {//进背包
                returnData["rewardList"] = [];
                var configData = configManager.createConfig(userUid);
                async.eachSeries(returnData["reward"], function (reward, esCb) {
                    mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.P_PARADISESEARCH7, reward["count"]);//翻翻翻档次奖励道具掉落统计
                    addDropItem(reward["id"], reward["count"], userUid, false, 1, function(err,res){
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
        case "ghost"://：一键翻牌 扣钱，全翻
            var rList = [];
            async.series([function(cb){//取配置
                paradise.getConfig(userUid,function(err,res){
                    if (err) cb(err);
                    else {
                        sTime = res[0]-0;
                        eTime = res[1]-0;
                        currentConfig = res[2];
                        ghostIngot = currentConfig["ghostIngot"];
                        rList = currentConfig["rewardList"];
                        openIngot = currentConfig["openIngot"];
                        pokerCount = currentConfig["pokerCount"]-0;
                        cb(null);
                    }
                });
            },function(cb){//取玩家身上的金币数
                user.getUser(userUid,function(err,res){
                    if (err || res == null) cb("dbError");
                    else{
                        ingot = res["ingot"];
                        cb(null);
                    }
                });
            },function(cb){//取用户数据
                paradise.getUserData(userUid, sTime, false,function (err, res) {
                    if(err||res["arg"] == null || res["arg"]["rewardList"] == undefined)cb("dbError");
                    else {
                        userData = res;
                        userData["arg"]["ghostStatus"] = 1;
                        if(userData["arg"]["crossCt"] >= 6){
                            userData["arg"]["crossCt"] = 0;
                        }else{
                            userData["arg"]["crossCt"]++;
                        }
                        pay = ghostIngot - userData["arg"]["crossCt"] * openIngot;
                        if(ingot - pay < 0){
                            cb("ingotNotEnough");
                        }else{
                            returnData["ghostPay"] = pay;
                            userData["ingot"] += returnData["ghostPay"];
                            rewardList = userData["arg"]["rewardList"];


                            for(var xxx in rewardList){
                                if(rewardList[xxx]["status"] == 1){
//                                    rewardList[xxx]["count"] = 0;
                                     continue;//翻过的不计算在内
                                }else{
                                    userData["arg"]["point"]++;
                                    rewardList[xxx]["status"] = 1;
                                    nowRewardList.push({"id":rewardList[xxx]["id"],"count":rewardList[xxx]["count"]});
                                }
                            }
                            returnData["list"] = nowRewardList;
                            returnData["point"] = userData["arg"]["point"];
                            while(list.length < pokerCount){
                                var randomRate = Math.random();
                                var p = 0;
                                for(var k in rList){
                                    p += rList[k]["prob"] - 0;
                                    if (randomRate <= p) {
                                        list.push({"id":rList[k]["id"],"count":rList[k]["count"],"status":0});
                                        break;
                                    }
                                }
                            }
                            userData["arg"]["rewardList"] = list;
                            returnData["reward"] = userData["arg"]["rewardList"];
                            showList = list.sort(randomsort);
                            userData["arg"]["showList"] = showList;
                            returnData["showList"] = userData["arg"]["showList"];
                            userData["arg"]["crossCt"] = 0;
                            cb(null);
                        }
                    }
                });
            },function(cb){
                returnData["userData"] = {"ingot":ingot - pay};
                mongoStats.expendStats("ingot", userUid,"127.0.0.1", null, mongoStats.P_PARADISESEARCH8, pay);
                user.updateUser(userUid, returnData["userData"], cb);
            },function(cb){
                paradise.setUserData(userUid,userData,cb);
            },function (cb) {//进背包
                returnData["rewardList"] = [];
                stats.events(userUid,"127.0.0.1",null,mongoStats.P_PARADISESEARCH2);//翻翻翻一键翻牌的次数统计
                async.eachSeries(returnData["list"], function (reward, esCb) {
                    mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.P_PARADISESEARCH6, reward["count"]);//翻翻翻道具掉落统计
                    addDropItem(reward["id"], reward["count"], userUid, false, 1, function(err,res){
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
        case "choose"://0-放弃 类似刷新,1-继续，扣钱,2开始翻牌
            if (jutil.postCheck(postData, "status") == false) {
                echo("postError");
                return false;
            }
            chooseStatus =postData["status"]-0;
            async.series([function(cb){//取配置
                paradise.getConfig(userUid,function(err,res){
                    if (err) cb(err);
                    else {
                        sTime = res[0]-0;
                        eTime = res[1]-0;
                        currentConfig = res[2];
                        openIngot = currentConfig["openIngot"];
                        rewardList = currentConfig["rewardList"];
                        pokerCount = currentConfig["pokerCount"];
                        cb(null);
                    }
                });
            },function(cb){//取用户数据
                paradise.getUserData(userUid, sTime, false,function (err, res) {
                    if(err||res["arg"] == null || res["arg"]["rewardList"] == undefined)cb("dbError");
                    else {
                        userData = res;
                        userData["status"] = 2;
                        ingot = userData["ingot"];
                        if(chooseStatus == 1){//放弃 showCrossList
                            userData["status"] = 0;
                            returnData["status"]  = userData["status"];
                            kk = true;
                            while(list.length < pokerCount){
                                var randomRate = Math.random();
                                var p = 0;
                                for(var i in rewardList){
                                    p += rewardList[i]["prob"] - 0;
                                    if (randomRate <= p) {
                                        list.push({"id":rewardList[i]["id"],"count":rewardList[i]["count"],"status":0});
                                        break;
                                    }
                                }
                            }
                            userData["arg"]["rewardList"] =  list;
                            returnData["reward"] = userData["arg"]["rewardList"];
                            cb(null);
                        }else if(chooseStatus == 2){//继续，扣钱
                            paradise.getUserData(userUid,sTime,false,function(err,res){
                                userData["status"] = 1;
                                returnData["status"]  = userData["status"];
                                returnData["list"] = userData["arg"]["rewardList"];
                                returnData["showList"] = userData["arg"]["showList"];
                                kk = false;
                                cb(null);
                            });
                        }else if(chooseStatus == 3){//开始翻牌
                            userData["status"] = 1;
                            returnData["status"]  = userData["status"];
                            kk = false;
                            cb(null);
                        }else{
                            cb(null);
                        }
                    }
                });
            },function(cb){
                if(!kk){
                    user.getUser(userUid,function(err,res){
                        if (err || res == null) cb("dbError");
                        else if(res["ingot"] - openIngot < 0){
                            cb("ingotNotEnough");
                        } else if(openIngot == 0){
                            cb(null);
                        } else {
                            returnData["userData"] = {"ingot":res["ingot"] - openIngot};
                            userData["ingot"] += openIngot;
                            mongoStats.expendStats("ingot", userUid,"127.0.0.1", null, mongoStats.P_PARADISESEARCH8, openIngot);
                            user.updateUser(userUid, returnData["userData"], cb);
                        }
                    });
                }else{
                    cb(null);
                }
            },function(cb){
                paradise.setUserData(userUid,userData,cb);
            }], function (err, res) {
                echo(err, returnData);
            });
            break;
    }
    function addDropItem(dropId,dropCount,userUid,isPatch,level,callBack) {
        var dropId = dropId + "";
        var resone = [];
        var rData = [];
        dropCount = dropCount || 1;
        dropCount = dropCount - 0;
        var isHero = false;
        if (arguments.length == 7) {
            isHero = callBack;
            callBack = arguments[6];
        }
        var configData = configManager.createConfig(userUid);

        switch (dropId.substr(0, 2)) {
            case "10"://hero 魂魄
                if (isHero == false) {
                    heroSoul.addHeroSoul(userUid, dropId, dropCount, function (err, res) {
                        if (err || res == null) {
                            callBack(err, null);
                        } else {
                            callBack(null, res);
                        }
                    });
                } else {
                    hero.addHero(userUid, dropId, 0, 1, function (err, res) {
                        callBack(err, res);
                    });
                }
                break;
            case "11"://skill 技能  或者技能碎片
                var skillC = configData.getConfig("skill");
                var skillItem = skillC[dropId];
                if (isPatch == 1) { //碎片
                    var pathIndex = Math.floor(Math.random() * (skillItem["patchCount"] - 0)) + 1;
                    debris.addDebris(userUid, dropId, "type" + pathIndex, dropCount, 1, function (err, res) {
                        if (err || res == null) {
                            callBack(err, null);
                        } else {
                            callBack(null, res);
                        }
                    });
                } else {
                    level = level || 1;
                    var exp = 0;
                    if (level > 1) {
                        var skillUpgradeNeedExpConfig = configData.getConfig("skillUpgradeNeedExp");//技能升级需要的经验配置
                        var skillStar = skillC[dropId]["star"];//要升级的技能的星级
                        var skillNeedExpList = skillUpgradeNeedExpConfig[skillStar]["needExp"];//当前技能的每级需要的经验表
                        exp = skillNeedExpList[level - 1] - 0;
                    }
                    async.timesSeries(dropCount, function (n, cb) {
                        skill.addSkill(userUid, dropId, exp, level, function (err, res) {
                            if (err || res == null) {
                                cb(err, null);
                            } else {
                                resone.push(res);
                                cb(null, res);
                            }
                        });
                    }, function (err, ress) {
                        callBack(err, resone);
                    });
                }
                break;
            case "12"://装备
            case "13"://装备
            case "14"://装备
                async.timesSeries(dropCount, function (n, cb) {
                    equipment.addEquipment(userUid, dropId, level, function (err, res) {
                        if (err || res == null) {
                            cb(err);
                        } else {
                            resone.push(res);
                            cb(null);
                        }
                    });
                }, function (err, ress) {
                    callBack(err, resone);
                });
                break;
            case "15"://item
                item.updateItem(userUid, dropId, dropCount, function (err, res) {
                    if (err || res == null) {
                        callBack(err, null);
                    } else {
                        callBack(null, res);
                    }
                });
                break;
            case "17"://卡片
                var cardList = [];
                for(var i = 0; i < dropCount; i++){
                    cardList.push(dropId);
                }
                card.addCardList(userUid, cardList, function (err, res) {
                    if (err) {
                        callBack(err, null);
                    } else {
                        callBack(null, res);
                    }
                });
                break;
            default:
                if (dropId == "gold") {
                    user.addUserData(userUid, "gold", dropCount, callBack);
                } else if (dropId == "ingot") {
                    user.addUserData(userUid, "ingot", dropCount, callBack);
                } else if (dropId == "honor") {
                    userVariable.getVariable(userUid, "honor", function (err, res) {
                        if (err)callBack(err);
                        else {
                            var val = 0;
                            if (res == null)  val = dropCount
                            else val = (res - 0) + dropCount;
                            userVariable.setVariable(userUid, "honor", val, function (err, res) {
                                if (err) callBack(err);
                                else callBack(null, {"honor": val})
                            });
                        }
                    });
                } else if (dropId == "worldBossTeach") {
                    async.times(dropCount, function (n, cb) {
                        teach.addWorldBossTeach(userUid, level || 1, function (err, res) {
                            rData.push(res);
                            cb(null);
                        });
                    }, function (err, res) {
                        callBack(err, rData);
                    });
                } else if (dropId == "teach") {
                    var time = isPatch?jutil.now()-86400:jutil.now();
                    async.times(dropCount, function (n, cb) {
                        teach.addTeach(userUid, level || 1, time, function (err, res) {
                            rData.push(res);
                            cb(null);
                        });
                    }, function (err, res) {
                        callBack(err, rData);
                    });
                } else {
                    callBack(null, null);
                }
                break;
        }
    }
    function echo(err, res){
        if(err){
            response.echo("practice.paradiseSearch", jutil.errorInfo(err));
        } else{
            response.echo("practice.paradiseSearch", res);
        }
    }
}
exports.start = start;

var specialArr = [0,1,2];