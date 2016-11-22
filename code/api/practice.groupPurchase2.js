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

function start(postData, response, query) {
    if (jutil.postCheck(postData, "action") == false) {
        response.echo("practice.groupPurchase2", jutil.errorInfo("postError"));
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
            groupPurchase.getConfig(userUid, groupPurchase.GROUPPURCHASE2, function (err, res) {
                if(err){
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
                        response.echo("practice.groupPurchase2", jutil.errorInfo("postError"));
                        return;
                    }
                    if (count - 0 <= 0) cb("postError");
                    else {
                        Buy(userUid, count, activityConfig, function (err, res) {
                            if (err) cb(err);
                            else {
                                returnValue["itemData"] = res["resultItemData"];
                                returnValue["newUserData"] = {"ingot": res["resultUserIngot"]};
                                cb(null);
                            }
                        });
                    }
                    break;
                default :
                    cb("postError");
                    break;
            }
        },
        function(cb) {//全服购买数
            var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
            redis[rk](userUid).s(groupPurchase.GROUPPURCHASE2+":buyCount:"+key).get(function(err, res){
                if(err){
                    cb(err);
                } else {
                    buyCount = res - 0;//全服购买数
                    cb(null);
                }
            });
        },
        function(cb) {//用户购买数
            var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210
            redis[rk](userUid).h(groupPurchase.GROUPPURCHASE2+":userBuyCount:"+key).get(userUid,function(err, res){
                if(err){
                    cb(err);
                } else {
                    userBuyCount = res - 0;//用户购买数
                    cb(null);
                }
            });
        },
        function(cb) {
            if (action == "buy") {// 只有购买才触发
                groupPurchase.groupPurchaseSendReward(userUid, buyCount, groupPurchase.GROUPPURCHASE2, "buy", function (err, res) {
                    cb(null);
                });
            }else{
                cb(null);
            }
        },
        function(cb) {
            returnValue["buyCount"] = buyCount;
            returnValue["userBuyStatus"] = (userBuyCount > 0) ? 1 : 0;
            cb(null);
        }
    ], function (err, res) {
        if (err) {
            response.echo("practice.groupPurchase2", jutil.errorInfo(err));
        } else {
            response.echo("practice.groupPurchase2",returnValue);
        }
    })
}

function Buy(userUid, count, activityConfig, callbackFn) {
    var itemId = activityConfig["sale"]["id"];
    var itemCount = count;
    var presentPrice = (activityConfig["sale"]["presentPrice"] - 0)*itemCount;

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
                                cb(null);
                                var mongoStats = require("../model/mongoStats");
                                mongoStats.expendStats("ingot", userUid, '127.0.0.1', null, mongoStats.E_GROUPPURCHASE_BUY, presentPrice);
                                stats.expendStats("ingot",userUid,"127.0.0.1",null,mongoStats.groupPurchase_count,presentPrice);
                            }
                        });
                    }
                }
            });
        },
        function (cb) {
            mongoStats.dropStats(itemId, userUid, "127.0.0.1", null, mongoStats.GROUPPURCHASE_BUY, itemCount);
            stats.dropStats(itemId,userUid,"127.0.0.1",null,mongoStats.groupPurchase,itemCount);
            item.updateItem(userUid, itemId, itemCount, function (err, res) {
                if (err) cb(err);
                else {
                    resultItemData = res;
                    cb(null);
                }
            })
        },
        function (cb) {// 保存购买记录
            groupPurchase.addGroupPurchaseUser(userUid, groupPurchase.GROUPPURCHASE2, itemCount, cb)
        }
    ], function (err, res) {
        callbackFn(err, {"resultItemData": resultItemData, "resultUserIngot": resultUserIngot});
    })
}

exports.start = start;