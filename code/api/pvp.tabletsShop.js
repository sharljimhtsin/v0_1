/**
 * 神位争夺（跨服战）宇宙商店 - 首页
 * User: peter.wang
 * Date: 14-11-21
 * Time: 上午10:50
 */

var async = require("async");
var redis = require("../alien/db/redis");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var item = require("../model/item");
var user = require("../model/user");
var userVariable = require("../model/userVariable");
var gsData = require("../model/gsData");
var gsTabletsUser = require("../model/gsTabletsUser");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "refresh") == false) {
        response.echo("pvp.tabletsShop", jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];
    var refresh = postData["refresh"];

    var configData  = configManager.createConfig(userUid);

    var issueId = 0;
    var activityConfig = {};
    var returnValue = {};
    async.series([
        function(cb){// 开服时间条件
            gsTabletsUser.checkUserServerStatus(userUid, function (err, res) {
                if (err) cb(err);
                else if (res == 0) cb("postError");
                else {
                    cb(null);
                }
            });
        },
        function(cb){// 是否活动中
            gsData.getCurIssueId(userUid, gsData.GS_TABLETSCOMPETE, function (err, res) {
                if (err) cb(err);
                else if (res == 0) cb("gpActivityEnd");
                else {
                    issueId = res;
                    cb(null);
                }
            });
        },
        function(cb){ // 活动配制
            gsData.getActivityConfig(userUid,gsData.GS_TABLETSCOMPETE,function(err,res){
                activityConfig = res[2];
                cb(null);
            })
        },
        function(cb) {
            switch (refresh) {
                case 0: // 进入店铺
                case 1: // 刷新店铺
                    myShop(userUid, issueId, activityConfig, refresh, function (err, res) {
                        if (err) cb(err);
                        else {
                            returnValue = res;
                            returnValue["freshCost"] = activityConfig["shop"]["freshCost"];
                            cb(null);
                        }
                    });
                    break;
                default :
                    cb("postError");
                    break;
            }
        },
        function(cb){// 每个单元格购买状态
            var cells = activityConfig["shop"]["cell"];
            var forEachList = [];
            for(var key in cells){
                forEachList.push((key));
            }
            returnValue["cellBuyState"] = {};
            async.forEachSeries(forEachList,function(cellId,forEachFn){
                redis.user(userUid).h(gsTabletsUser.getGSRedisKey(issueId, "buyGoodsLog")).get(cellId,function(err,res){
                    if(err) forEachFn(err);
                    else{
                        returnValue["cellBuyState"][cellId] = res - 0;
                        forEachFn(null);
                    }
                });
            },function(err,res){
                cb(err);
            })
        }
    ],function(err,res){
        if (err) {
            response.echo("pvp.tabletsShop",  jutil.errorInfo(err));
        } else {
            response.echo("pvp.tabletsShop",  returnValue);
        }
    })
}

function myShop(userUid, issueId, activityConfig, refresh, callbackFn) {
    var returnValue = {};
    async.series([
        function (cb) { // 是否扣费
            if(refresh==0) cb(null);
            else {
                user.getUser(userUid, function (err, res) {
                    if (err) cb(err);
                    else {
                        var refreshCost = activityConfig["shop"]["freshCost"] - 0;
                        var resultUserIngot = res["ingot"] - 0 - refreshCost;
                        if (resultUserIngot < 0) cb("ingotNotEnough");
                        else {
                            var newIngot = {"ingot": resultUserIngot};
                            user.updateUser(userUid, newIngot, function (err, res) {
                                if (err) cb(err);
                                else {
                                    var mongoStats = require("../model/mongoStats");
                                    mongoStats.expendStats("ingot", userUid, '127.0.0.1', null, mongoStats.E_TABLETS_SHOPREFRESH, refreshCost);

                                    returnValue["newUserData"] = newIngot;
                                    cb(null);
                                }
                            });
                        }
                    }
                });
            }
        },
        function (cb) { // 是否刷新商品
            redis.user(userUid).s(gsTabletsUser.getGSRedisKey(issueId, "shopGoods")).getObj(function (err, res) {
                if (err) cb(err);
                else if (res == null || refresh == 1) {//商品已过期或者用户强刷
                    getCellGoods(userUid, issueId, activityConfig, function (err, res) {
                        if (err) cb(err);
                        else {
                            returnValue["cell"] = res;
                            cb(null);
                        }
                    })
                } else {
                    returnValue["cell"] = res;
                    cb(null);
                }
            });
        },
        function (cb) { // 荣誉点(honor)
            userVariable.getVariable(userUid, "honor", function (err, res) {
                if(err) cb(err);
                else{
                    returnValue["honor"] = res - 0;
                    cb(null);
                }
            });
        },
        function (cb) { // 勇者徽章
            item.getItem(userUid, "153201", function(err,res){
                if(err) cb(err);
                else if(res==null) {
                    returnValue["153201"] = 0;
                    cb(null);
                }else {
                    returnValue["153201"] = res["number"];
                    cb(null);
                }
            })
        },
        function (cb) { // 下次刷新时间
            userVariable.getVariable(userUid, issueId+":TCNextReShop", function (err, res) {
                if (err) cb(err);
                else {
                    returnValue["refreshTime"] = activityConfig["shop"]["freshTime"] - 0;
                    returnValue["nextRefreshTime"] = res - 0 + (activityConfig["shop"]["freshTime"] - 0);//下次刷新时间
                    returnValue["haveSecond"] = returnValue["nextRefreshTime"] - 0 - jutil.now();//距刷新剩余秒数
                    returnValue["haveSecond"] = (returnValue["haveSecond"]-0>0)?  returnValue["haveSecond"]:0;
                    cb(null);
                }
            });
        }
    ], function (err, res) {
        callbackFn(err,returnValue);
    });
}

function getCellGoods(userUid, issueId, activityConfig,callbackFn) {
    userVariable.setVariable(userUid, issueId+":TCNextReShop", jutil.now(), function (err, res) {
        if (err) callbackFn(err);
        else {
            var cells = activityConfig["shop"]["cell"];
            var returnCells = {};
            for (var key in cells) {
                var curcell = cells[key];
                var randomRate = Math.random();
                var compareRate = 0;
                for (var c in curcell) {
                    compareRate += curcell[c]["prob"] - 0;
                    if (randomRate <= compareRate) {
                        returnCells[key] = curcell[c];
                        break;
                    }
                }
            }

            redis.user(userUid).s(gsTabletsUser.getGSRedisKey(issueId, "shopGoods")).setObj(returnCells, function (err, res) {
                //设置有效期
                var freshTime = activityConfig["shop"]["freshTime"]-0;
                redis.user(userUid).s(gsTabletsUser.getGSRedisKey(issueId, "shopGoods")).expire(freshTime);

                //清除购买记录
                redis.user(userUid).h(gsTabletsUser.getGSRedisKey(issueId, "buyGoodsLog")).del();

                callbackFn(err, returnCells);
            })
        }
    });
}

exports.start = start;