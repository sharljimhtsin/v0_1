/**
 * 团购活动（跨服）
 * User: joseppe
 * Date: 15-03-03
 * Time: 下午15:55
 */

var async = require("async");
var redis = require("../alien/db/redis");
var jutil = require("../utils/jutil");
var user = require("../model/user");
var item = require("../model/item");
var mongoStats = require("../model/mongoStats");
var groupPurchase = require("../model/groupPurchase");
var stats = require("../model/stats");
var bitUtil = require("../alien/db/bitUtil");
var formation = require("../model/formation");
var activityData = require("../model/activityData");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "action") == false) {
        response.echo("practice.groupPurchase3", jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];
    var action = postData["action"];
    var count = postData["count"];

    var sTime = 0;
    var eTime = 0;
    var activityConfig = {};
    var key = 1;
    var isAll = 0;
    var buyCount = 0;
    var userBuyCount = 0;
    var returnValue = {};
    async.series([
        function (cb) { // 活动配制
            groupPurchase.getConfig(userUid, groupPurchase.GROUPPURCHASE3, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    sTime = res[0];
                    eTime = res[1];
                    activityConfig = res[2];
                    key = activityConfig["key"];
                    isAll = parseInt(activityConfig["isAll"]) || 0;
                    cb(null);
                }
            })
        },
        function (cb) {
            switch (action) {
                case "index":
                    returnValue["config"] = activityConfig;
                    returnValue["eTime"] = eTime;
                    cb(null);
                    break;
                case "refresh":
                    cb(null);
                    break;
                case "buy":
                    if (jutil.postCheck(postData, "count") == false) {
                        response.echo("practice.groupPurchase3", jutil.errorInfo("postError"));
                        return;
                    }
                    if(eTime - jutil.now() < 86400*2){
                        returnValue["buyStatus"] = 1;
                        cb("outTime");
                        return;
                    }else{
                        if (count - 0 <= 0) cb("postError");
                        else {
                            Buy(userUid, count, activityConfig, function (err, res) {
                                if (err) cb(err);
                                else {
                                    returnValue["itemData"] = res["resultItemData"];
                                    returnValue["newUserData"] = {"ingot": res["resultUserIngot"]};
                                    returnValue["buyStatus"] = 0;
                                    cb(null);
                                }
                            });
                        }
                    }
                    break;
                case "rank":
                    var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210--跨服|全平台|单服
                    redis[rk](userUid).z(groupPurchase.GROUPPURCHASE3 + ":userBuyCountRank:" + key).revrange(0, 19, "WITHSCORES", function (err, res) {
                        var topList = [];
                        for (var i = 0; i < res.length; i += 2) {
                            var number = res[i + 1];
                            topList.push({"userUid": res[i], "number": number});
                        }
                        returnValue["topList"] = topList;
                        cb(null);
                    });
                    break;
                default :
                    cb("postError");
                    break;
            }
        },
        function (cb) {//全服购买数
            var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
            redis[rk](userUid).s(groupPurchase.GROUPPURCHASE3 + ":buyCount:" + key).get(function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    buyCount = res - 0;//全服购买数
                    cb(null);
                }
            });
        },
        function (cb) {//用户购买数
            var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
            redis[rk](userUid).h(groupPurchase.GROUPPURCHASE3 + ":userBuyCount:" + key).get(userUid, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    userBuyCount = res - 0;//用户购买数
                    cb(null);
                }
            });
        },
        function(cb){
            if(action == "rank"){
                var top = 1;
                async.eachSeries(returnValue["topList"], function(item, esCb){
                    item["top"] = top;
                    top++;
                    user.getUser(item["userUid"], function(err, res){
                        item["userName"] = res["userName"];//jutil.fromBase64(res["userName"]);
                        var mArr = bitUtil.parseUserUid(item["userUid"]);
                        try {
                            var serverList = require("../../config/" + mArr[0] + "_server.json")["serverList"];
                        } catch(err) {
                            esCb(null);
                            return;
                        }
                        item["serverName"] = serverList[mArr[1]]["name"];
                        formation.getUserHeroId(item["userUid"], function(err, res){
                            item["heroId"] = res;
                            esCb(err);
                        });
                    })
                }, cb);
            }else{
                cb(null);
            }
        },
        function(cb){
            if(action == "rank"){
                groupPurchase.getRankRewardStatus(userUid, eTime, key, function(err,res){
                    if (err) cb(err);
                    else {
                        console.log(res,"rank...");
                        if(res == null){
                            returnValue["rewardStatus"] = 0;
                        }else{
                            if(res == 0 && eTime - jutil.now() <= 86400*2){
                                returnValue["rewardStatus"] = 1;
                            }else{
                                returnValue["rewardStatus"] = res -0;
                            }
                        }
                        console.log(returnValue["rewardStatus"],"21");
                        redis.user(userUid).s("rankRewardStatus:" + activityData.PRACTICE_GROUPPURCHASE3 + key).set(returnValue["rewardStatus"], cb);
                    }
                });
            }else{
                cb(null);
            }
        },
        function (cb) {
            if (action == "buy") {// 只有购买才触发
                groupPurchase.groupPurchaseSendReward(userUid, buyCount, groupPurchase.GROUPPURCHASE3, "buy", function (err, res) {
                    cb(null);
                });
            } else {
                cb(null);
            }
        },
        function (cb) {
            returnValue["buyCount"] = buyCount;
            returnValue["userBuyStatus"] = (userBuyCount > 0) ? 1 : 0;
            cb(null);
        }
    ], function (err, res) {
        if (err) {
            response.echo("practice.groupPurchase3", jutil.errorInfo(err));
        } else {
            response.echo("practice.groupPurchase3", returnValue);
        }
    })
}

function Buy(userUid, count, activityConfig, callbackFn) {
    var itemId = activityConfig["sale"]["id"];
    var itemCount = count;
    var presentPrice = (activityConfig["sale"]["presentPrice"] - 0) * itemCount;

    var resultUserIngot = 0;
    var resultItemData = {};
    async.series([
        function (cb) { // 伊美加币是否充足
            user.getUser(userUid, function (err, res) {
                if (err) cb(err);
                else {
                    resultUserIngot = res["ingot"] - 0 - presentPrice;
                    if (resultUserIngot < 0) cb("ingotNotEnough");
                    else {
                        var newIngot = {"ingot": resultUserIngot};
                        user.updateUser(userUid, newIngot, function (err, res) {
                            if (err) cb(err);
                            else {
                                var mongoStats = require("../model/mongoStats");
                                mongoStats.expendStats("ingot", userUid, '127.0.0.1', null, mongoStats.P_GROUPPURCHASE3_1, presentPrice);
                                stats.expendStats("ingot", userUid, "127.0.0.1", null, mongoStats.groupPurchase_count, presentPrice);
                                cb(null);
                            }
                        });
                    }
                }
            });
        },
        function (cb) {
            mongoStats.dropStats(itemId, userUid, "127.0.0.1", null, mongoStats.P_GROUPPURCHASE3_2, itemCount);
            stats.dropStats(itemId, userUid, "127.0.0.1", null, mongoStats.groupPurchase, itemCount);
            item.updateItem(userUid, itemId, itemCount, function (err, res) {
                if (err) cb(err);
                else {
                    resultItemData = res;
                    cb(null);
                }
            })
        },
        function (cb) {// 保存购买记录
            groupPurchase.addGroupPurchaseUser(userUid, groupPurchase.GROUPPURCHASE3, itemCount, cb)
        }
    ], function (err, res) {
        callbackFn(err, {"resultItemData": resultItemData, "resultUserIngot": resultUserIngot});
    })
}

exports.start = start;