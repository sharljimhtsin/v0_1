/**
 * Created with JetBrains WebStorm.
 * User: joseppe
 * Date: 14-12-17
 * Time: 下午22:02
 * To change this template use File | Settings | File Templates.
 */

/******************************************************************************
 * 重力修炼室
 */

var userVariable = require("../model/userVariable");
var configManager = require("../config/configManager");
var user = require("../model/user");
var jutil = require("../utils/jutil");
var async = require("async");
var redis = require("../alien/db/redis");
var mongoStats = require("../model/mongoStats");
var hero = require("../model/hero");
var mysql = require("../alien/db/mysql");
var formation = require("../model/formation");
var stats = require("../model/stats");
var bitUtil = require("../alien/db/bitUtil");

/**
 * 获取元气
 * @param userUid
 * @param callbackFn
 * @private
 */
function getGravity(userUid, callbackFn) {
    var returnData = {"charge":0,"ingot":0,"gold":0};
    async.series([
        function(cb){
            userVariable.getVariable(userUid, "gravityCharge", cb);
        },
        function(cb){
            redis.user(userUid).s("gravityTimes:ingot").get(cb);
        },
        function(cb){
            redis.user(userUid).s("gravityTimes:gold").get(cb);
        }
    ], function(err, res){
        returnData["charge"] = res[0] == null?0:res[0]-0;
        returnData["ingot"] = res[1] == null?0:res[1]-0;
        returnData["gold"] = res[2] == null?0:res[2]-0;
        callbackFn(err, returnData);
    });

}

function skipRedisModule(userUid) {
    var list = ["i"];
    var args = bitUtil.parseUserUid(userUid);
    if (list.indexOf(args[0]) >= 0) {
        return true;
    }
    return false;
}


/**
 * 获取英雄
 * @param userUid
 * @param heroUid
 * @param callbackFn
 * @private
 */
function getHero(userUid, heroUid, callbackFn) {
    var heroData;
    async.series([
        function(cb) { //验证充能的hero 必须存在编队中
            formation.getUserFormation(userUid,function(err,res) {
                if (err) cb("dbError");
                else {
                    var formationList = res;
                    var isBreak = false;
                    for (var key in formationList) {
                        if (formationList[key]["heroUid"] == heroUid) {
                            isBreak = true;
                            break;
                        }
                    }
                    if (isBreak) cb (null);
                    else cb("notInFormation");
                }
            });
        },
        function(cb){
            hero.getHero(userUid, function(err, res){
                if (err || res == null || !res.hasOwnProperty(heroUid))
                    cb("dbError");
                else
                    cb(null);
            });
        },
        function(cb){
            getHeroData(userUid, heroUid, function(err, res){
                heroData = res;
                cb(err);
            });
        }
    ], function(err, res){
        callbackFn(err, heroData);
    });
}

/**
 * 获取英雄表数据
 * @param userUid
 * @param heroUid
 * @param callbackFn
 * @private
 */
function getHeroData(userUid, heroUid, callbackFn) {
    redis.user(userUid).h("heroGravity").getJSON(heroUid, function (err, res) {
        if (err) {
            callbackFn(err);
        } else if (res == null || skipRedisModule(userUid)) {
            var sql = "SELECT * FROM heroGravity WHERE userUid = " + mysql.escape(userUid) + " AND heroUid = " + mysql.escape(heroUid);
            mysql.game(userUid).query(sql, function (err, res) {
                if (err || res.length == 0) {
                    callbackFn(err, getHeroDefaultData(userUid, heroUid));
                } else {
                    var heroData = res[0];
                    if (skipRedisModule(userUid)) {
                        callbackFn(null, heroData);
                    } else {
                        redis.user(userUid).h("heroGravity").setJSON(heroData["heroUid"], heroData, function (err, res) {
                            callbackFn(null, heroData);
                        });
                    }
                }
            });
        } else {
            callbackFn(null, res);
        }
    });
}

/**
 * 设置英雄表数据
 * @param userUid
 * @param heroUid
 * @param heroData
 * @param callbackFn
 * @private
 */
function setHeroData(userUid, heroUid, heroData, callbackFn) {
    var sqlWhere = "userUid = " + mysql.escape(userUid) + " AND heroUid = " + mysql.escape(heroUid);
    mysql.dataIsExist(userUid, "heroGravity", sqlWhere, function(err, res){
        if (err) {
            callbackFn(err,null);
        } else {
            var sql;
            var newData;
            if (res == 1) { //已存在的编队号
                newData = heroData;
                sql = "UPDATE heroGravity SET ? WHERE " +  sqlWhere;
            } else {
                newData = getHeroDefaultData(userUid, heroUid);
                for(var i in heroData){
                    if(newData.hasOwnProperty(i)){
                        newData[i] = heroData[i];
                    }
                }
                sql = "INSERT INTO heroGravity SET ? ";
            }
            newData["userUid"] = userUid;
            newData["heroUid"] = heroUid;
            mysql.game(userUid).query(sql, newData, function (err,res) {
                if (err) {
                    callbackFn(err,null);
                } else {
                    redis.user(userUid).h("heroGravity").setJSON(newData["heroUid"], newData, function(err, res) {
                        callbackFn(err,newData);
                    });
                }
            });
        }

    });
}

function delHeroData(userUid, heroUids, callbackFn) {
    var sql = "DELETE FROM heroGravity WHERE userUid=? AND heroUid IN(?)";
    mysql.game(userUid).query(sql, heroUids, function (err,res) {
        if (err) {
            callbackFn(err,null);
        } else {
            for (var i = 0; i < heroUids.length; i++) {
                redis.user(userUid).h("heroGravity").hdel(heroUids[i], function(err, res) {
                    if (err) {
                        redis.user(userUid).h("heroGravity").del();
                    }
                });
            }
            callbackFn(null);
        }
    });
}

function getHeroDefaultData(userUid, heroUid) {
    return {"heroUid":heroUid,"userUid":userUid,"bigVigour":1,"vigour":0,"hp":0,"attack":0,"defence":0,"spirit":0,"hpp":0,"attackp":0,"defencep":0,"spiritp":0,"crit":0,"tough":0,"dodge":0,"hit":0,"break":0,"preventBreak":0,"critDamage":0};
}

/**
 * 充能
 * @param userUid
 * @param type
 * @private
 */
function charge(userUid, type, callbackFn) {
    var charge = 0;
    var configData = configManager.createConfig(userUid);
    var gravityConfig = configData.getConfig("gravityTrain");
    var count = 0;
    var times = 0;
    var userData;

    async.series([
        function(cb){//取使用次数并判断
            user.getUser(userUid, function(err, res){
                if(err || res == null){
                    cb("noUser");
                } else {
                    userData = res;
                    cb(null);
                }
            });
        },
        function(cb){//取使用次数并判断
            redis.user(userUid).s("gravityTimes:"+type).get(function(err, res){
                if(err){
                    cb(err);
                }else if(res != null && res-0 >= gravityConfig[type+"Time"][userData["vip"]]){
                    cb("noTimes");
                } else {
                    if(res != null)
                        times = res-0;
                    times++;
                    cb(null);
                }
            });
        },
        function(cb){//取使用次数并判断
            count = gravityConfig[type][times]["cost"];
            if(userData[type] - count < 0){
                var errInfo = type=="ingot"?"noIngot":"noGold";
                cb(errInfo);
            } else {
                //count = userData[type] - gravityConfig[type][times]["cost"];
                cb(null);
            }
        },
        function(cb){//取元气
            userVariable.getVariable(userUid, "gravityCharge", function(err, res){
                if (err) cb(err);
                else {
                    if(res != null)
                        charge = res - 0;
                    cb(null);
                }
            });
        },
        function(cb){//扣除ingot
            userData = type=="ingot"?{"ingot":userData[type] - count}:{"gold":userData[type] - count};
            user.updateUser(userUid, userData, function(err, res){
                if(err){
                    cb("dbError");
                } else {
                    mongoStats.expendStats(type, userUid,"127.0.0.1", null, mongoStats.E_GRAVITY, count);
                    cb(null);
                }
            });
        },
        function(cb){//扣除次数
            redis.user(userUid).s("gravityTimes:"+type).incr(function(err, res){
                redis.user(userUid).s("gravityTimes:"+type).expire(jutil.todayTime() + 86400 - jutil.now(), cb);
            });
        },
        function(cb){//增加元气
            var r = Math.random();
            var max = 0;
            for(var i in gravityConfig[type][times]["getGenkiProb"]){
                max += gravityConfig[type][times]["getGenkiProb"][i]-0;
                if(r < max){
                    charge += i-0;
                    break;
                }
            }
            userVariable.setVariable(userUid, "gravityCharge", charge, cb);
        }
    ], function(err, res){
        callbackFn(err, {"charge":charge,"userData":userData,"times":times});
    });
}

function vigour(userUid, heroUid, callbackFn){
    var configData = configManager.createConfig(userUid);
    var gravityConfig = configData.getConfig("gravityTrain");
    var heroData;
    //var newHeroData = {};
    var charge = 0;
    async.series([
        function(cb){//取英雄数据
            getHero(userUid, heroUid, function(err, res){
                if(err){
                    cb(err);
                } else {
                    heroData = res;
                    cb(null);
                }
            });
        },
        function(cb){//取元气
            userVariable.getVariable(userUid, "gravityCharge", function(err, res){
                if(err || res == null){
                    cb(err);
                } else {
                    charge = res-0;
                    cb(null);
                }
            });
        },
        function(cb){//判断是否可以使用
            var vigour = heroData["vigour"];
            var bigVigour = heroData["bigVigour"];

            if(gravityConfig["useGenki"][bigVigour] == undefined){
                cb("isBest");
            } else{
                var vigourConfig = gravityConfig["useGenki"][bigVigour]["content"][vigour];
                if(vigourConfig == undefined){
                    cb("configError");
                } else if(charge - vigourConfig["cost"] < 0){
                    cb("noEnough");
                } else {
                    charge -= vigourConfig["cost"];
                    mongoStats.expendStats("gravityCharge", userUid,"127.0.0.1", null, mongoStats.E_GRAVITY1, vigourConfig["cost"]);
                    vigour = vigour-0+1;
                    if(gravityConfig["useGenki"][bigVigour]["content"][vigour] == undefined){
                        bigVigour = bigVigour-0+1;
                        vigour = 0;
                    }
                    if(vigourConfig.hasOwnProperty("addAttrRatioType")){
                        heroData[vigourConfig["addAttrRatioType"]+"p"] = heroData[vigourConfig["addAttrRatioType"]+"p"] -0 + vigourConfig["addAttrRatio"]*10000;
                    }
                    switch (bigVigour){
                        case 1:
                        default:
                            stats.events(userUid,"127.0.0.1",null,mongoStats.E_GRAVITY2, bigVigour, vigour, heroUid);//重力训练室升级到1脉的人数
                            break;
                        case 2:
                            stats.events(userUid,"127.0.0.1",null,mongoStats.E_GRAVITY3, bigVigour, vigour, heroUid);//重力训练室升级到2脉的人数
                            break;
                        case 3:
                            stats.events(userUid,"127.0.0.1",null,mongoStats.E_GRAVITY4, bigVigour, vigour, heroUid);//重力训练室升级到3脉的人数
                            break;
                        case 4:
                            stats.events(userUid,"127.0.0.1",null,mongoStats.E_GRAVITY5, bigVigour, vigour, heroUid);//重力训练室升级到4脉的人数
                            break;
                        case 5:
                            stats.events(userUid,"127.0.0.1",null,mongoStats.E_GRAVITY6, bigVigour, vigour, heroUid);//重力训练室升级到5脉的人数
                            break;
                        case 6:
                            stats.events(userUid,"127.0.0.1",null,mongoStats.E_GRAVITY7, bigVigour, vigour, heroUid);//重力训练室升级到6脉的人数
                            break;
                        case 7:
                            stats.events(userUid,"127.0.0.1",null,mongoStats.E_GRAVITY8, bigVigour, vigour, heroUid);//重力训练室升级到7脉的人数
                            break;
                        case 8:
                            stats.events(userUid,"127.0.0.1",null,mongoStats.E_GRAVITY9, bigVigour, vigour, heroUid);//重力训练室升级到8脉的人数
                            break;
                        case 9:
                            stats.events(userUid,"127.0.0.1",null,mongoStats.E_GRAVITY10, bigVigour, vigour, heroUid);//重力训练室升级到9脉的人数
                            break;
                        case 10:
                            stats.events(userUid,"127.0.0.1",null,mongoStats.E_GRAVITY11, bigVigour, vigour, heroUid);//重力训练室升级到10脉的人数
                            break;
                    }
                    heroData[vigourConfig["addAttrType"]] = heroData[vigourConfig["addAttrType"]] -0 + vigourConfig["addAttr"];
                    heroData["vigour"] = vigour;
                    heroData["bigVigour"] = bigVigour;
                    cb(null);
                }
            }
        },
        function(cb){
            userVariable.setVariable(userUid, "gravityCharge", charge, cb);
        },
        function(cb){//存英雄数据
            setHeroData(userUid, heroUid, heroData, function(err, res){
                heroData = res;
                cb(err, null);
            });
        }
    ], function(err, res){
        callbackFn(err, {"heroData":heroData,"charge":charge});
    });
}

function getHeroList(userUid, callbackFn) {
    redis.user(userUid).h("heroGravity").getAllJSON(function (err, res) {
        if (err) {
            callbackFn(err);
        } else if (res == null || skipRedisModule(userUid)) {
            var sql = "SELECT * FROM heroGravity WHERE userUid = " + mysql.escape(userUid);
            mysql.game(userUid).query(sql, function (err, res) {
                if (err) {
                    callbackFn(err);
                } else if (res.length == 0) {
                    callbackFn(null, res);
                } else {
                    var heroList = {};
                    for (var i in res) {
                        heroList[res[i]["heroUid"]] = res[i];
                    }
                    if (skipRedisModule(userUid)) {
                        callbackFn(null, heroList);
                    } else {
                        redis.user(userUid).h("heroGravity").setAllJSON(heroList, function (err, res) {
                            callbackFn(err, res);
                        });
                    }
                }
            });
        } else {
            callbackFn(null, res);
        }
    });
}

exports.getGravity = getGravity;
exports.getHero = getHero;
exports.charge = charge;
exports.vigour = vigour;
exports.getHeroList = getHeroList;
exports.setHeroData = setHeroData;
exports.getHeroData = getHeroData;
exports.delHeroData = delHeroData;