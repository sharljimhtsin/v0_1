var platformConfig = require("../../config/platform");
var crypto = require("crypto");
var order = require("../model/order");
var appSecret = "40ce72d1fafcf8d58ee9ff973f76bcc3";

function start(postData, response, query) {
    console.log("androidPay.node", "Callback Parameters:" + JSON.stringify(query));
    console.log("地址：：：", response.socket.remoteAddress);
    var status = query["status"];//订单状态
    var channel = query["channel"];//渠道
    var uid = query["uid"];//支付用户ID
    var appKey = query["appkey"];//AppKey
    var channelOrderId = query["channel_order_id"];//渠道订单ID
    var cpExt = query["cpext"];//CP自定义参数(用户ID#物品ID)
    var orderId = query["cp_order_id"];//订单ID
    var amount = query["amount"];//支付金额
    var actualAmount = query["actual_amount"];//实际支付金额
    var updateTime = query["updatetime"];//更新时间
    var sign = query["sign"];//签名
    var platform = '';

    var validateStr = "actual_amount|" + actualAmount + "|amount|" + amount + "|appkey|" + appKey + "|channel|" + channel + "|channel_order_id|" + channelOrderId + "|cp_order_id|" + orderId + "|cpext|" + cpExt + "|status|" + status + "|uid|" + uid + "|updatetime|" + updateTime + "|" + appSecret;
    var generateSign = crypto.createHash('sha1').update(validateStr).digest('hex');

    if(status != 1) {
        console.log("androidPay.node", "Status is not successful. Status Code " + status);
        response.end("Status Failed", "utf-8");
    } else if (sign != generateSign) {
        console.log("androidPay.node", "ValidateStr:" + validateStr);
        console.log("androidPay.node", "Sign无效:" + generateSign + " | " + sign);
        response.end("Sign Failed", "utf-8");
    } else {
        amount = amount / 100;
        var extArr = cpExt.split("|");
        var userUid = extArr[1];
        if(!extArr[2] || extArr[2] == '') {
            console.log("androidPay.node", "goodsId invalid");
            response.end("goodsId invalid", "utf-8");
        }
        var goodsId = extArr[2];
        var platform = '';
        console.log("androidPay.node", "userUid:" + userUid);
        console.log("androidPay.node", "goodsId:" + goodsId);

        for (var row in platformConfig) {
            if(platformConfig[row]['sinaCid']) {
                if(platformConfig[row]['sinaCid'] == channel) {
                    platform = row;
                    console.log("androidPay.node", "Platform:" + platform);
                }
            }
        }

        if(!platform) {
            console.log("androidPay.node", "No platform");
            response.end("Channel code error", "utf-8");
        } else {
            if(platform == 'ucweb') {
                orderId = extArr[3];
            }
            console.log("androidPay.node", "orderId:" + orderId);

            order.updateOrder(userUid, orderId, platform, uid, 1, amount, status, updateTime, goodsId, JSON.stringify(query), function (err, res) {
                console.log(err);
                if (res == 1) {
                    console.log("androidPay.node", "Pay Successful");
                    response.end("success", "utf-8");
                } else {
                    console.log("androidPay.node", "Pay failed");
                    response.end("Failed", "utf-8");
                }

            })
        }


    }
}



exports.start = start;
