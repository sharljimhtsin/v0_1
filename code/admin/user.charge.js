/**
 * Created by apple on 14-4-2.
 */
var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var order = require("../model/order");
var bitUtil = require("../alien/db/bitUtil");
var configManager = require("../config/configManager");
var async = require("async");
var redis = require("../alien/db/redis");
var user = require("../model/user");


function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userModify"], query["country"]) == false) {
        response.echo("user.charge", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid", "productId") == false) {
        response.echo("user.charge", jutil.errorInfo("postError"));
        return;
    }

    var userUid = postData["userUid"];
    var productId = postData["productId"];
    //var payMoney = postData["payMoney"];
    var times = postData["times"];
    var mCountry = query["country"];

    var configData = configManager.createConfig(userUid);
    var mCode = bitUtil.parseUserUid(userUid);
    mCountry = mCode[0];
    var mSystem = "android";
    var platformId;

    admin.addOneOperationLog("userInfo",query,postData);

    async.series([
        function(cb){
            user.getUserPlatformId(userUid, function(err, res) {
                if (err || res == null) {
                    cb("userInvalid");
                } else {
                    platformId = res["platformId"];
                    if (platformId == "ios" || platformId == "kingnetios" || platformId == "thaiios") {
                        mSystem = "ios";
                    }
                    cb(null);
                }
            });
        },
        function(cb){
            async.timesSeries(times, function(n, esCb){
                var orderNo = jutil.guid();
                order.addOrder(orderNo, userUid,productId, function(err, res) {
                    if (err)
                        esCb("dbError");
                    else {
                        var payConfig = configData.getConfig("pay");
                        var goodsConfig = payConfig[mSystem][productId];
                        var getImegga = 0;
                        var payMoney = postData["payMoney"];
                        var ingot = undefined;
                        if (payMoney - 0 > 0) {
                            ingot = getImegga = payMoney * 12;
                        } else if (goodsConfig == null || goodsConfig == undefined) {
                            esCb("configError");
                            return;
                        } else {
                            payMoney = goodsConfig["payMoney"];
                            getImegga = goodsConfig["getImegga"] + goodsConfig["getMoreImegga"];
                        }
                        order.updateOrder(userUid, orderNo, platformId, "test", getImegga, payMoney, 1, "", productId, "", function (err, res) {
                            if (res == 1) {
                                esCb(null);
                            } else
                                esCb(err);
                        }, ingot);
                    }
                });
            }, cb);
        }
    ], function(err, res){
        redis.user(userUid).s("payOrder").del();
        if(err){
            response.echo("user.charge", jutil.errorInfo(err));
        } else {
            response.echo("user.charge",{"status":1});
        }
    });

//    if (mCountry != "a" && mCountry != "b") {
//        response.echo("user.modify", {"ERROR":"不允许更改"});
//        return;
//    }
}
exports.start = admin.adminAPIProxy(start);