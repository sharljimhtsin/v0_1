/**
 * Created with JetBrains WebStorm.
 * 武道会擂台赛api
 * User: za
 * Date: 16-1-21
 * Time: 上午10:21
 * To change this template use File | Settings | File Templates.
 */

var user = require("../model/user");
var jutil = require("../utils/jutil");
var async = require("async");
var formation = require("../model/formation");
var hero = require("../model/hero");
var battle = require("../model/battle");
var gal = require("../model/gallants");
var configManager = require("../config/configManager");
var userVariable = require("../model/userVariable");
var battleModel = require("../model/battle");
var modelUtil = require("../model/modelUtil");
var achievement = require("../model/achievement");
var stats = require("../model/stats");
var vitality = require("../model/vitality");
var item = require("../model/item");
var mongoStats = require("../model/mongoStats");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "action") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var action = postData["action"];
    var configData = configManager.createConfig(userUid);
    var galConfig = configData.getConfig("arena");
    var returnData = {};
    var userData = {};
    var heroData = {};
    var galData = {};
    var list = {};
    var galList = {};
    var type = "";
    var index = 0;
    var heroId = "";
    var myHeroId = "";//守擂的英雄
    var guardSTime = 0;//守擂开始时间
    var guardETime = 0;//守擂结束时间
    var userIngot = 0;
    var rewardList = [];
    var payTime = 0;//守擂时长
    var gData = {};//深拷贝集合
    var doubleStatus = 0;
    var isOpen = 0;
    switch (action) {
        case "get"://取数据--初始化
        default:
            async.series([function (cb) {//取配置
                returnData["galConfig"] = galConfig;
                cb(null);
            }, function (cb) {
                gal.getUserData(userUid, function (err, res) {
                    if (err)cb(err);
                    else {
                        list = res;
                        cb(null);
                    }
                });
            }, function (cb) {
                if (list["arg"] == undefined) {
                    galList = {
                        "heroId": "",
                        "canChooseStatus": 0,
                        "canBattleStatus": 0,
                        "canGuardStatus": 0,
                        "doubleStatus": 0,
                        "isOpen":0,
                        "guardSTime": 0,
                        "guardETime": 0,
                        "rewardList": []
                    };
                    galData = galConfig;
                    gData = jutil.deepCopy(galData);
                    for (var xx in gData) {
                        for (var j in gData[xx]) {
                            var item = galConfig[xx][j];
                            rewardList = item["reward"];
                            rewardList.push({"id":item["hero"]["id"],"count":item["soulCount"]});
                            gData[xx][j] = jutil.deepCopy(galList);
                            gData[xx][j]["rewardList"] = rewardList;
                        }
                    }

                    list["arg"] = gData;
                    list["arg"]["easy"][1]["isOpen"] = 1;
                    list["arg"]["easy"][1]["canBattleStatus"] = 1;
                    gal.setUserData(userUid, list["arg"], cb);
                } else {
                    cb(null);
                }
            }], function (err, res) {
                returnData["userData"] = list["arg"];
                echo(err, returnData);
            });
            break;
        case "choose"://选伙伴   ***********数据结构需要去除heroId*************
            if (jutil.postCheck(postData, "type", "index","heroId") == false) {//heroId
                echo("postError");
                return false;
            }
            type = postData["type"];
            index = postData["index"];
             heroId = postData["heroId"];
            async.series([
                function(cb){//取hero的heroUid
                    hero.getHero(userUid,function(err,res){
                        if(err)cb(err);
                        else{
                            heroData = res;
                            for(var x in heroData){
                                if(heroData[x]["heroId"] == heroId){
//                                    returnData["heroData"] = heroData[x];
                                    myHeroId = heroData[x]["heroId"];
                                    break;
                                }
                            }
                            cb(null);
                        }
                    });
                },
                function (cb) {
                    gal.getUserData(userUid, function (err, res) {
                        if (err)cb(err);
                        else {
                            if (res["arg"] == undefined)cb("dbError");
                            else {
                                galData = res["arg"];
                                if(heroId == 0){
                                    galData[type][index]["heroId"] = "";
                                    galData[type][index]["canChooseStatus"] = 0;
                                    returnData["userData"] = galData;
                                    cb(null);
                                }else{
                                    if (galData[type][index]["canChooseStatus"] == 1 && myHeroId == galData[type][index]["heroId"]) {//1.战斗中 2.守擂未结束
                                        cb("queue disabled");//队列已锁定
                                    } else {
                                        galData[type][index]["heroId"] = myHeroId;
                                        galData[type][index]["canChooseStatus"] = 1;
                                        returnData["userData"] = galData;
                                        if (type == "easy" && index == 1) {
                                            galData[type][index]["canBattleStatus"] = 1;//easy1开启战斗
                                        }
                                        cb(null);
                                    }
                                }
                            }
                        }
                    });
                }, function (cb) {
//                    console.log(galData[type][index]["canChooseStatus"],"pppppppppp");
                    gal.setUserData(userUid, galData, cb);
                }], function (err, res) {
                echo(err, returnData);
            });
            break;
        case "battle"://参战
            if (jutil.postCheck(postData, "type", "index") == false) {
                echo("postError");
                return false;
            }
            type = postData["type"];
            index = postData["index"];
            var XY;
            var needPlus = true;
            async.series([
                function (cb) {
                    gal.getLable(userUid,function(err,res){
                        if(err)cb(err);
                        else{
                            if(res == null){
                                res = "easy_1";
                                XY = res;
                            }else{
                                XY = res;
                            }
                            cb(null);
                        }
                    });
            },
                function (cb) {
                gal.getUserData(userUid, function (err, res) {
                    if (err)cb(err);
                    else {
                        if (res["arg"] == undefined)cb("dbError");
                        else {
                            galData = res["arg"];
                            //符合条件才能战斗
                            if (galData[type][index] == undefined)cb("battleWrong");
                            else {//"easy"：第一关默认开启；第一关未打过，不能开启第2关，以此类推，直到三关全部守擂成功后，才能全开关卡
                                if (galData[type][index]["canBattleStatus"] == 1) {//可以战斗
                                    myHeroId = galData[type][index]["heroId"];
                                    cb(null);
                                } else {//不可战斗
                                    cb("mapUnopened");//mapUnopened
                                }
                            }
                        }
                    }
                });
            },
            function (cb) {
                function compare(x, y) {
//                    if (XY == "END") {
//                        return true;
//                    }
                    var map = {"easy": 1, "normal": 2, "hard": 3};
                    var xArr = x.split("_");
                    var yArr = y.split("_");
                    var xNum = map[xArr[0]] - 0 + xArr[1];
                    var yNum = map[yArr[0]] - 0 + yArr[1];
                    if (xNum > yNum) {
                        return true;
                    } else if (xNum == yNum) {
                        return false;
                    } else {
                        needPlus = false;
                        return false;
                    }
                }

                var point = type + "_" + index;
//                console.log(compare(point, XY),XY == "END","233232",point,XY);
//                if (compare(point, XY) || XY == "END") {
//                    cb("postError");
//                } else {
//                    cb();
//                }
                    cb();
            },
                function (cb) {
                    gal.battle(userUid, type, index, function (err, res) {
                        if (err)cb(err);
                        else {
                            returnData["battleData"] = res;
                            returnData["userData"] = galData;
                            if (res["isWin"] == true) {//胜利后把战斗标记加上
                                guardSTime = jutil.now();
                                guardETime = guardSTime + galConfig[type][index]["rewardTime"];
                                galData[type][index]["guardSTime"] = guardSTime;
                                galData[type][index]["guardETime"] = guardETime;
                                galData[type][index]["heroId"] = myHeroId;
                                if(type == "easy" && index == "3"){
                                    galData[type][index]["canBattleStatus"] = 1;
                                    galData["normal"][1]["canBattleStatus"] = 1;
                                    galData[type][index]["isOpen"] = 1;
                                    galData["normal"][1]["isOpen"] = 1;
                                    galData[type][index]["canChooseStatus"] = 1;//不能选英雄
                                    galData[type][index]["canGuardStatus"] = 1;//可以守擂
                                    galData[type][index]["isOwner"] = 1;//可以守擂
                                    stats.events(userUid,"127.0.0.1",null,mongoStats.A_GALLANTS3);
                                    cb(null);
                                }else if(type == "normal" && index == "3"){
                                    galData[type][index]["canBattleStatus"] = 1;
                                    galData["hard"][1]["canBattleStatus"] = 1;
                                    galData[type][index]["isOpen"] = 1;
                                    galData["hard"][1]["isOpen"] = 1;
                                    galData[type][index]["canChooseStatus"] = 1;//不能选英雄
                                    galData[type][index]["canGuardStatus"] = 1;//可以守擂
                                    galData[type][index]["isOwner"] = 1;//可以守擂
                                    stats.events(userUid,"127.0.0.1",null,mongoStats.A_GALLANTS6);
                                    cb(null);
                                }else if(type == "hard" && index == "2"){
                                    galData[type][index]["canBattleStatus"] = 1;
                                    galData[type][index]["isOpen"] = 1;
                                    galData[type][index]["canChooseStatus"] = 1;//不能选英雄
                                    galData[type][index]["canGuardStatus"] = 1;//可以守擂
                                    galData[type][index]["isOwner"] = 1;//可以守擂
                                    stats.events(userUid,"127.0.0.1",null,mongoStats.A_GALLANTS8);
                                    cb(null);
                                }else{
                                    var ct = index-0+1;
                                    galData[type][index]["canBattleStatus"] = 1;
                                    galData[type][ct]["canBattleStatus"] = 1;
                                    galData[type][index]["isOpen"] = 1;
                                    galData[type][ct]["isOpen"] = 1;
                                    galData[type][index]["canChooseStatus"] = 1;//不能选英雄
                                    galData[type][index]["canGuardStatus"] = 1;//可以守擂
                                    galData[type][index]["isOwner"] = 1;//可以守擂
                                    if(type == "easy" && index == "1"){
                                        stats.events(userUid,"127.0.0.1",null,mongoStats.A_GALLANTS1);
                                    }else if(type == "easy" && index == "2"){
                                        stats.events(userUid,"127.0.0.1",null,mongoStats.A_GALLANTS2);
                                    }else if(type == "normal" && index == "1"){
                                        stats.events(userUid,"127.0.0.1",null,mongoStats.A_GALLANTS4);
                                    }else if(type == "normal" && index == "2"){
                                        stats.events(userUid,"127.0.0.1",null,mongoStats.A_GALLANTS5);
                                    }else if(type == "hard" && index == "1"){
                                        stats.events(userUid,"127.0.0.1",null,mongoStats.A_GALLANTS7);
                                    }
                                    cb(null);
                                }
                            } else {
                                cb(null);
                            }
                        }
                    });
                },
                function (cb) {
                    gal.setUserData(userUid, galData, cb);
                },
                function (cb) {
                    var nextXY = "easy_1";
                    switch (XY) {
                        case "easy_1":
                            nextXY = "easy_2";
                            break;
                        case "easy_2":
                            nextXY = "easy_3";
                            break;
                        case "easy_3":
                            nextXY = "normal_1";
                            break;
                        case "normal_1":
                            nextXY = "normal_2";
                            break;
                        case "normal_2":
                            nextXY = "normal_3";
                            break;
                        case "normal_3":
                            nextXY = "hard_1";
                            break;
                        case "hard_1":
                            nextXY = "hard_2";
                            break;
                        case "hard_2":
//                            nextXY = "END";
                            nextXY = "hard_2";
                            break;
                    }
                    if (needPlus) {
                        gal.save(userUid,nextXY,cb);
                    } else {
                        cb();
                    }
                }], function (err, res) {
                echo(err, returnData);
            });
            break;
        case "guard"://守擂 每组结束时间与当前时间比较
            if (jutil.postCheck(postData, "type", "index") == false) {
                echo("postError");
                return false;
            }
            type = postData["type"];
            index = postData["index"];
            payTime = galConfig[type][index]["rewardTime"] - 0;
            async.series([function (cb) {
                gal.getUserData(userUid, function (err, res) {
                    if (err)cb(err);
                    else {
                        if (res["arg"] == undefined)cb("dbError");
                        else {
                            galData = res["arg"];
                            guardSTime = galData[type][index]["guardSTime"] - 0;
                            guardETime = galData[type][index]["guardETime"] - 0;
                            if (galData[type][index]["canGuardStatus"] == 1 && guardETime <= jutil.now() && guardETime != 0) {//守擂结束,可以发奖
                                galData[type][index]["canGuardStatus"] = 0;//不可守擂
                                galData[type][index]["canChooseStatus"] = 0;//可以选英雄
                                galData[type][index]["canBattleStatus"] = 1;
                                galData[type][index]["isOpen"] = 1;
                                galData[type][index]["isOwner"] = 2;
                                galData[type][index]["heroId"] = "";
                                returnData["reward"] = galData[type][index]["rewardList"];
                                cb(null);
                            } else {
//                                returnData["reward"] = [];
                                cb("timeNotMatch");
                            }
                        }
                    }
                });
            }, function (cb) {
                returnData["userData"] = galData;
                gal.setUserData(userUid, galData, cb);
            }, function (cb) {
                returnData["rewardList"] = [];
                async.eachSeries(returnData["reward"], function (reward, esCb) {
                    mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.A_GALLANTS9, reward["count"]);
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
        case "time":
            if (jutil.postCheck(postData, "type", "index") == false) {
                echo("postError");
                return false;
            }
            type = postData["type"];
            index = postData["index"];
            gal.getUserData(userUid, function (err, res) {
                if (err)echo(err);
                else {
                    if (res["arg"] == undefined)echo("dbError");
                    else {
                        galData = res["arg"];
                        guardSTime = galData[type][index]["guardSTime"];
                        guardETime = galData[type][index]["guardETime"];
                        returnData = {"guardSTime": guardSTime, "guardETime": guardETime,"Now":jutil.now(),"heroId":galData[type][index]["heroId"]};
                        echo(err, returnData);
                    }
                }
            });
            break;
        case "expedite"://加速守擂 消耗加速道具
            if (jutil.postCheck(postData, "type", "index") == false) {
                echo("postError");
                return false;
            }
            type = postData["type"];
            index = postData["index"];
            var itemId = "153671";
            payTime = galConfig[type][index]["rewardTime"];
            async.series([function (cb) {
                item.getItem(userUid, itemId, function (err, res) {
                    if (err)cb(err);
                    else if (res == null || res["number"] - 0 - 1 < 0) {
                        cb("itemIsNoEnough");
                    } else {
                        cb(null);
                    }
                });
            }, function (cb) {
                gal.getUserData(userUid, function (err, res) {
                    if (err)cb(err);
                    else {
                        if (res["arg"] == undefined)cb("dbError");
                        else {
                            galData = res["arg"];
                            guardETime = galData[type][index]["guardETime"] - 0;
                            if (guardETime - jutil.now() >= 14400 && guardETime != 0) {//加速守擂只有在4小时以上才可使用
                                galData[type][index]["guardETime"] -= 3600;
                                returnData["guardSTime"] = galData[type][index]["guardSTime"];
                                returnData["guardETime"] = galData[type][index]["guardETime"];
                                returnData["Now"] = jutil.now();
                                cb(null);
                            } else {
                                cb("timeNotMatch");//不能加速守擂
                            }
                        }
                    }
                });
            }, function (cb) {
                gal.setUserData(userUid, galData, cb);
            }, function (cb) {
                mongoStats.expendStats(itemId, userUid,"127.0.0.1", null, mongoStats.A_GALLANTS10, 1);
                item.updateItem(userUid, itemId, -1, cb);
            }], function (err, res) {
                echo(err, returnData);
            });
            break;
        case "double"://双倍奖励 消耗伊美加币
            if (jutil.postCheck(postData, "type", "index") == false) {
                echo("postError");
                return false;
            }
            type = postData["type"];
            index = postData["index"];
            var double = galConfig["double"] - 0;
            async.series([function (cb) {
                user.getUser(userUid, function (err, res) {
                    if (err)cb(err);
                    else {
                        if (res["ingot"] - double < 0)cb("ingotNotEnough");
                        else {
                            userIngot = res["ingot"] - 0;
                            cb(null);
                        }
                    }
                });
            }, function (cb) {
                gal.getUserData(userUid, function (err, res) {
                    if (err)cb(err);
                    else {
                        if (res["arg"] == undefined)cb("dbError");
                        else {
                            galData = res["arg"];
                            guardSTime = galData[type][index]["guardSTime"];
                            guardETime = galData[type][index]["guardETime"];
                            doubleStatus = galData[type][index]["doubleStatus"];
    //                            if (((jutil.now() < guardSTime && jutil.now() > guardETime) || ( guardSTime == 0 || guardETime == 0)) || doubleStatus == 1) {//1.不在守擂时间里 2.已经点过双倍按钮

                            if(doubleStatus == 1||jutil.now() > guardETime || jutil.now() < guardSTime){//状态为1或不在守擂时间内的斗不能购买双倍
                                cb("timeNotMatch");
                            } else {
                                galData[type][index]["doubleStatus"] = 1;
                                var reward = galData[type][index]["rewardList"];
                                var rewardData = [];
                                for (var i in reward) {
                                    rewardData.push({"id": reward[i]["id"], "count": reward[i]["count"] * 2});
                                }
                                galData[type][index]["rewardList"] = rewardData;
                                returnData["doubleStatus"] = 1;
                                cb(null);
                            }
                        }
                    }
                });
            }, function (cb) {
                returnData["userIngot"] = {"ingot": userIngot - double};
                stats.events(userUid,"127.0.0.1",null,mongoStats.A_GALLANTS11);
                mongoStats.expendStats("ingot", userUid,"127.0.0.1", null, mongoStats.A_GALLANTS12, double);
                user.updateUser(userUid, returnData["userIngot"], cb);
            }, function (cb) {
                gal.setUserData(userUid, galData, cb);
            }], function (err, res) {
                echo(err, returnData);
            });
            break;
    }
    function echo(err, res) {
        if (err) {
            response.echo("gallants.getSoul", jutil.errorInfo(err));
        } else {
            response.echo("gallants.getSoul", res);
        }
    }
}
exports.start = start;