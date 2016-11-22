/**
 * Created with JetBrains WebStorm.
 * User: za 南美平台支付sdk
 * Date: 15-7-28
 * Time: 下午14:42
 * 南美 Jankin 调用
 * To change this template use File | Settings | File Templates.
 */
var crypto = require("crypto");
var platformConfig = require("../../config/platform");
var order = require("../model/order");
var jutil = require("../utils/jutil");
var Buffer = require('buffer').Buffer;
var user = require("../model/user");
var async = require("async");

function start(postData, response, query) {
    var fs = require('fs');
    fs.appendFile('payOrder.log', "baxi:" + jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');
    console.log("baxi...POST...." + JSON.stringify(postData));
    console.log("baxi...GET...." + JSON.stringify(query));

    //MD5校验：$sign=md5(“serverid=”.$sid.”&userid=”.$uid.”&key=”.$key.”&timestamp=”.$time);
    //请求参数：userid,serverid,orderid,amount,currency,timestamp,sign,gold,Key
    if (jutil.postCheck(postData, "userid", "serverid", "orderid", "amount", "currency", "timestamp", "sign", "gold", "key", "reseverd") == false) {// "serial", "amount", "status", "app_order_id", "app_user_id", "sign"
        response.end("fail", "utf-8");
        return;
    }
    var userid = postData["userid"];//用户id
    var serverid = postData["serverid"];//服务器id
    var orderid = postData["orderid"];//订单id
    var amount = postData["amount"];//总计
    var currency = postData["currency"];//充值币种
    var timestamp = postData["timestamp"];//时间戳
    var sign = postData["sign"];//标记
    var gold = postData["gold"];//游戏币
    var appKey = postData["key"];
//    var itemunit = postData["itemunit"];//透传参数
    var reseverd = postData["reseverd"];//透传参数
    var args = reseverd.split("|");// useruid|uin|goodsCount|goodsId  roleId+"|"+orderId+"|"+"|"+argsv[2]+"|"+unitPrice; UID
    var pId = "";


//    http://webdragonball.shazamgame.com/notify/paybx.node?
    // userid=306&serverid=2&orderid=1194&amount=3.99000¤cy=USD×tamp=1440661347&sign=1bea4f3cd5fdd04e2f43e0ffc25e1916&gold=300&key=5462dij5654t73gk919a8456edhgdvb6&
    // reseverd=60146319388|2ef9f668135c7877575307765126dba1|1|11.0  UID  订单号 档位 价格

    //$sign=md5(“serverid=”.$sid.”&userid=”.$uid.”&key=”.$key.”&timestamp=”.$time);
//    var validateStr = userid + serverid + orderid + amount + currency + timestamp + sign + gold + appKey;(原代码格式)
    var validateStr = "serverid=" + serverid + "&userid=" + userid + "&key=" + appKey + "&timestamp=" + timestamp;
    var buf = new Buffer(1024);
    var len = buf.write(validateStr, 0);
    var result = buf.toString('binary', 0, len);
    var md5Sign = crypto.createHash('md5').update(result).digest('hex');
    console.log(md5Sign);
    response.writeHead(200, {'Content-Type': 'text/plain', "charset": "utf-8"});

//    var md5Sign = crypto.createHash('md5').update(toSignStr, "utf8").digest('hex');
    if (sign != md5Sign) {
        console.log("sign not match");
        response.end("fail", "utf-8");
    } else {
        console.log("sign matched");
        //userUid, orderNo, platformId, uin, goodsCount, orderMoney, payStatus, createTime, goodsId, callbackFn, ingot, kda, order_id
        console.log(userid, "userid", args[0], "userUid");
        async.series([function (cb) {
            user.getUser(args[0], function (err, res) {
                if (err)cb(err);
                else {
                    pId = res["platformId"];
                    cb(null);
                }
            });
        }, function (cb) {
            order.updateOrder(args[0], args[1], pId, userid, 1, args[3], 1, timestamp, args[2], function (err, res) {// , JSON.stringify(postData)
                if (res == 1) {
                    console.log("order updated");//订单更新成功
                    cb("success");
//                    response.end("success", "utf-8");
                } else if (res == 2) {
                    console.log("order repeat");//订单重复
                    cb("order repeat");
//                    response.end("repeat", "utf-8");
                } else {
                    console.log(res);
                    console.log("order update fail");//订单更新失败
//                    response.end("fail", "utf-8");
                    cb("fail");
                }
            });
        }], function (msg) {
            response.end(msg, "utf-8");
        });
    }
}

exports.start = start;