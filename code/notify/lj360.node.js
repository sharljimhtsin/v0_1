/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-4-28
 * Time: 下午4:25
 * 360安卓调用
 * To change this template use File | Settings | File Templates.
 */
var crypto = require("crypto");
var platformConfig = require("../../config/platform");
var order = require("../model/order");
function start(postData, response, query) {
    var fs = require('fs');
    fs.appendFile('payOrder.log', JSON.stringify(query) + "\n", 'utf8');
    console.log("lj360...POST...." + JSON.stringify(postData));
    console.log("lj360...GET...." + JSON.stringify(query));
    var obj = {};
    var sortArr = [];
    var sign_str = "";
    obj["app_key"] = query["app_key"]; //应用appkey
    obj["product_id"] = query["product_id"]//所购商品id
    obj["amount"] = query["amount"];// 总价 以分为单位------------单位是分  注意
    obj["app_ext1"] = query["app_ext1"];//应用扩展信息1
    obj["app_ext2"] = query["app_ext2"];//应用扩展信息2
    obj["app_uid"] = query["app_uid"];//应用内用户id
    obj["user_id"] = query["user_id"];//360账号id
    obj["order_id"] = query["order_id"]//支付订单号
    obj["gateway_flag"] = query["gateway_flag"];//如果支付返回成功，返回success一个用需要确认是success才给用户价钱
    obj["sign_type"] = query["sign_type"];//定值MD5
    obj["app_order_id"] = query["app_order_id"];//应用订单号
    var app_secret = platformConfig["lj360"]["app_secret"];
    for (var key in obj) {
        if (obj[key] != null && obj[key] != 0) {
            sortArr.push(key);
        }
    }
    sortArr.sort();
    for (var i = 0; i < sortArr.length; i++) {
        var key = sortArr[i];
        if (sign_str == "") sign_str = obj[key];
        else {
            sign_str += "#" + obj[key];
        }
    }
    sign_str += "#" + app_secret;
    var sign_return = query["sign_return"];//应用回传给订单核实接口的参数  不加入签名校验计算
    var sign = query["sign"];
    var md5Sign = crypto.createHash('md5').update(sign_str, "utf8").digest('hex');
    if (sign != md5Sign) {
        console.log("sign not match");
        response.end(JSON.stringify({"error_code": "5", "error_msg": "sign无效"}), "utf-8");
    } else {
        console.log("sign matched");
        order.updateOrder(obj["app_uid"], obj["app_order_id"], "lj360", obj["user_id"], "", Math.floor(obj["amount"] / 100), 1, "", "",JSON.stringify(query), function (err, res) {
            if (res == 1) {
                console.log("order updated");
                response.end("ok", "utf-8");
            } else {
                console.log("order update fail");
                response.end("notOk", "utf-8");
            }
        });
    }
}
exports.start = start;