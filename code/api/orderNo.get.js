/**
 * Created by apple on 14-2-10.订单支付
 */
var jutil = require("../utils/jutil");
var order = require("../model/order");
var async = require("async");
var configManager = require("../config/configManager");
var variable = require("../model/userVariable");
var platformConfig = require("../../config/platform");
var activityConfig = require("../model/activityConfig");
var crypto = require("crypto");
var user = require("../model/user");

function start(postData, response, query) {
    if (jutil.postCheck(postData,"productId", "productProps", "platform") == false) {
        response.echo("orderNo.get",jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];
    var orderNo = jutil.guid();

    var productId = postData["productId"];
    var productProps = postData["productProps"];
    var platform = postData["platform"];//ios:appStore android:非appStore
    var configData = configManager.createConfig(userUid);
    var returnData;
    var userData;
    var ratio;
    var firstChargeKey = "firstCharge";
    var isFirstCharge = true;
    async.series([
        function (cb) {
            if (platform == "usaa") {
                cb("ERR");
            } else {
                cb();
            }
        },
        function (cb) {
            order.addOrder(orderNo, userUid, productId, function (err, res) {
                if (err)
                    cb("dbError");
                else {
                    returnData = res;
                    cb(null);
                }
            });
        },
        function (cb) {
            user.getUser(userUid, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    userData = res;
                    cb(null);
                }
            });
        },
        function (cb) {
            if (platform == "meizu" || platform == "ljmeizu") {
                activityConfig.getConfig(userUid, "firstCharge", function(err, res){
                    if (!err && res != null && res[0]) {
                        var activityArg = parseInt(res[1]);
                        if (isNaN(activityArg)) activityArg = 0;
                        if (activityArg == -1) {
                            firstChargeKey = res[2] || res[3]["1"];
                        } else {
                            firstChargeKey = res[3][activityArg] || res[3]["1"];
                        }
                        firstChargeKey = firstChargeKey["key"];
                    }
                    cb(err, res);
                });
            } else {
                cb(null);
            }
        },
        function (cb) {
            if (platform == "meizu" || platform == "ljmeizu") {
                variable.getVariable(userUid, firstChargeKey, function(err, res) {
                    if (!err && res != null)
                        isFirstCharge = false;
                    cb(err, res);
                });
            } else {
                cb(null);
            }
        },
        function (cb) {
            if (platform == "meizu" || platform == "ljmeizu") {
                var payConfig = configData.getConfig("pay");
                ratio = payConfig["firstPayRatio"];
                var count = productProps["getImegga"];
                if(isFirstCharge){
                    count += productProps["getImegga"] * (ratio - 1) + productProps["getMoreImegga"] * ratio;
                } else {
                    count += productProps["getMoreImegga"];
                }
                var app_id = platformConfig[platform]["AppID"];
                var cp_order_id = orderNo;
                var uid = userData["pUserId"];
                var product_id = "0";
                var product_subject = count;
                var product_body = "";
                var product_unit = "";
                var buy_amount = 1;
                var product_per_price = productProps["payMoney"];
                var total_price = productProps["payMoney"];
                var create_time = jutil.now();
                var pay_type = "0";
                var user_info = userUid;
                var sign = "";
                var sign_type = "md5";
                var payKey = platformConfig[platform]["AppSecret"];
                var data = {
                    "app_id": app_id,
                    "buy_amount": buy_amount,
                    "cp_order_id": cp_order_id,
                    "create_time": create_time,
                    "pay_type": pay_type,
                    "product_body": product_body,
                    "product_id": product_id,
                    "product_per_price": product_per_price,
                    "product_subject": product_subject + "个伊美加币",
                    "product_unit": product_unit,
                    "total_price": total_price,
                    "uid": uid,
                    "user_info": user_info
                }
                sign = genSign(data, payKey);
                returnData["sign"] = sign;
                returnData["sign_type"] = sign_type;
                returnData["create_time"] = create_time;
            }
            cb(null);
        }
    ],function(err) {
        if (err)
            response.echo("orderNo.get", jutil.errorInfo(err));
        else {
            response.echo("orderNo.get", returnData);
        }
    });
}

function md5_chs(data) {
    var Buffer = require("buffer").Buffer;
    var buf = new Buffer(data);
    var str = buf.toString("binary");
    var crypto = require("crypto");
    return crypto.createHash("md5").update(str).digest("hex");
}

function genSign(paraList, key) {
    var string = "";
    for (var para in paraList) {
        var value = paraList[para];
        if (para == "sign" || para == "sign_type") {
            continue;
        }
        string = string + para + "=" + value + "&";
    }
    string = string.substr(0, string.length - 1);
    return md5_chs(string + ":" + key);
}

exports.start = start;