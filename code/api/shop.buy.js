/**
 * 购买物品
 * shop.buy
 * User: liyuluan
 * Date: 13-12-23
 * Time: 下午6:35
 */

var jutil = require("../utils/jutil");
var user = require("../model/user");
var shop = require("../model/shop");
var modelUtil = require("../model/modelUtil");
var box = require("../model/box");
var async = require("async");
var mongoStats = require("../model/mongoStats");
var redis = require("../alien/db/redis");
var stats = require("../model/stats");
var fs = require('fs');

/**
 * 参数
 *      shopUid 商品ID
 *      count 购买数量
 *
 * 返回
 *      newUserData 玩家当前元宝数据
 *      cost 玩家花费的元宝数
 *      itemData 所购买的元宝数据
 *
 *
 * @param postData
 * @param response
 * @param query
 */

function start(postData, response, query) {
    if (jutil.postCheck(postData, "shopUid", "count") == false) {
        response.echo("shop.buy", jutil.errorInfo("postError"));
        return;
    }

    if (postData["count"] < 1) {
        response.echo("shop.buy", jutil.errorInfo("postError"));
        return;
    }

    var shopUid = postData["shopUid"];
    var userUid = query["userUid"];
    var buyCount = postData["count"];

    var gUserData = null;
    var gShopItem = null;

    var buyResult = null;
    var newIngotData = null;

    async.auto({
        "getUser": function (cb) {
            user.getUser(userUid, function (err, res) {
                if (err || res == null) cb("dbError");
                else {
                    gUserData = res;
                    cb(null);
                }
            });
        },
        "getShopItem": function (cb) {
            shop.getShopItem(userUid, shopUid, function (err, res) {
                if (err) cb("dbError");
                else if (res == null) {
                    cb("notSold");
                } else {
                    gShopItem = res;
                    cb(null);
                }
            });
        },
        "buyVerify": ["getUser", "getShopItem", function (cb) {
            var nowTime = jutil.now();
            if (gUserData["ingot"] - 0 < gShopItem["buyPrice"] * buyCount) {
                cb("noRMB");
            } else if (nowTime < gShopItem["sTime"] || nowTime > gShopItem["eTime"] || gShopItem["close"] == 1) {
                cb("notSold");
            } else if (gUserData["vip"] < gShopItem["vip"] && gShopItem["vip"] > 0) {//vip等级不足
                cb("vipNotEnough");
            } else if (gShopItem["count"] > 0 && buyCount > gShopItem["count"]) { //如果大于可购买数量
                cb("notSold");
            } else if(gShopItem["isActivity"]==1 && gShopItem["isReset"]==1) { // 活动限购数每日重置
                var nowDate = new Date(jutil.now() * 1000);
                var buyLogKey = "buyLog" + nowDate.getFullYear() + "" + (nowDate.getMonth() + 1) + "" + nowDate.getDate();
                redis.user(userUid).s(buyLogKey).getObj(function (err, res) {
                    if (err) cb("dbError");
                    else if(res == null) cb(null);
                    else {
                        var todayBuyCount = 0;
                        for (var key in res) {
                            if (res[key]["shopUid"] == shopUid) {
                                todayBuyCount = res[key]["count"];
                            }
                        }

                        if(todayBuyCount - 0 + buyCount > gShopItem["count"]){
                            cb("notSold");
                        }else{
                            cb(null);
                        }
                    }
                });
            } else if (gShopItem["count"] > 0) {// 活动限购数每日不重置或非活动购
                shop.getBuylogItem(userUid, shopUid, function (err, res) {
                    if (err) cb("dbError");
                    else {
                        if (res == null) cb(null);
                        else if (res["count"] - 0 + buyCount > gShopItem["count"]) {
                            cb("notSold");
                        } else {
                            cb(null);
                        }
                    }
                });
            } else {
                cb(null);
            }
        }],
        "buy": ["buyVerify", function (cb) {
            var mItemId = gShopItem["itemId"].toString();
            stats.dropStats(mItemId,userUid,response.ip,null,mongoStats.SHOP_BUY_count,buyCount);
            mongoStats.dropStats(mItemId, userUid, response.ip, null, mongoStats.SHOP_BUY, buyCount);
            modelUtil.addDropItemToDB(mItemId, buyCount, userUid, false, 1, function (err, res) {
                buyResult = res;
                cb(null);
            });
        }],
        "pay": ["buy", function (cb) {
            newIngotData = {"ingot": gUserData["ingot"] - gShopItem["buyPrice"] * buyCount};
            user.updateUser(userUid, newIngotData, function (err, res) {
                fs.appendFile('bug.log', jutil.now() + userUid + " | " + JSON.stringify(newIngotData) + "\n" + JSON.stringify(gUserData) + "\n" + JSON.stringify(gShopItem) + "\n" + buyCount, 'utf8');
                if (err) console.error(userUid, newIngotData, err.stack);
                cb(null);
            });
        }],
        "addBuyLog": ["pay", function (cb) {
            shop.setBuylog(userUid, shopUid, buyCount, function (err, res) {
                if (err) console.error(userUid, shopUid, buyCount, err.stack);

                cb(null);
            });
        }],
        "addBuyLogRedis": ["addBuyLog", function (cb) { // 用户今日购买数量
            var nowDate = new Date(jutil.now() * 1000);
            var buyLogKey = "buyLog"+nowDate.getFullYear()+""+(nowDate.getMonth()+1)+""+nowDate.getDate();

            redis.user(userUid).s(buyLogKey).getObj(function(err,res) {
                //console.log(userUid,buyLogKey,err,res)
                if (err || res == null) {
                    var resultData = {};
                    resultData[shopUid] = {};
                    resultData[shopUid]["shopUid"] = shopUid;
                    resultData[shopUid]["count"] = buyCount;

                    redis.user(userUid).s(buyLogKey).setObj(resultData,function(err,res){
                        redis.user(userUid).s(buyLogKey).expire(2592000);
                        cb(null);
                    });

                } else {
                    var findKey = false;
                    for(var key in res){
                        if(res[key]["shopUid"] == shopUid){
                            res[key]["count"] = res[key]["count"] + buyCount;
                            findKey = true;
                        }
                    }

                    if(findKey==false) {
                        res[shopUid] = {};
                        res[shopUid]["shopUid"] = shopUid;
                        res[shopUid]["count"] = buyCount;
                    }

                    redis.user(userUid).s(buyLogKey).setObj(res,function(err,res){
                        cb(null);
                    });
                }
            });
        }],
        "addBoxLog": ["addBuyLog", function (cb) {
            var itemId = gShopItem["itemId"].toString();
            if (itemId == 150301 || itemId == 150302 || itemId == 150401 || itemId == 150402 || itemId == 150403 || itemId == 150404) {
                box.getUserBox(userUid, function (err, res) {
                    if (err) {
                        console.error(userUid, err.stack);
                        cb(null);
                        return;
                    }
                    var mData = {};
                    if (res == null) {
                        mData["b" + itemId] = buyCount;
                    } else {
                        mData["b" + itemId] = res["b" + itemId] - 0 + buyCount;
                    }
                    box.updateUserBox(userUid, mData, function (err, res) {
                        if (err) console.error(userUid, mData, err.stack);
                        else {
                            cb(null);
                        }
                    });
                });
            } else {
                cb(null);
            }
        }]
    }, function (err) {
        if (err) response.echo("shop.buy", jutil.errorInfo(err));
        else {
            var resultData = {};
            resultData["newUserData"] = newIngotData;
            resultData["cost"] = gShopItem["buyPrice"] * buyCount;
            resultData["itemData"] = buyResult;
            response.echo("shop.buy", resultData);
            mongoStats.expendStats("ingot", userUid, response.ip, gUserData, mongoStats.E_ITEM, gShopItem["buyPrice"] * buyCount);
        }
    });
}


exports.start = start;