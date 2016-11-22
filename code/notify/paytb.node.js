/**
 * User: liyuluan
 * Date: 14-2-10
 * Time: 上午11:58
 */

var platformConfig = require("../../config/platform");
var crypto = require("crypto");
var order = require("../model/order");
var Buffer = require('buffer').Buffer;
var async = require("async");

function start(postData, response, query) {
    console.log("query: " + JSON.stringify(query));
    if(query == null){
        response.end(JSON.stringify({"status":"fail"}), "utf-8");
        return;
    }

    var sign = query["sign"];

    var source = query["source"];//tongbu
    var trade_no = query["trade_no"];//订单号
    var amount = query["amount"];//充值金额(分)
    var partner = query["partner"];//appId
    var paydes = query["paydes"];//订单描述
    var debug = query["debug"];//是否调试模式
    var tborder = query["tborder"];//pp订单号
    var appKey = platformConfig["tb"]["appKey"];

    //特殊处理
    if(trade_no == "1eae97fb7da3e96669e92fca8ff36d0a" || trade_no == "9066989411d4a8f29e5f44512182e680" || trade_no == "33625bfa401c62a06471d2362aae488f"){
        response.end(JSON.stringify({"status":"success"}), "utf-8");
        return;
    }

    var validateStr =
            "source="  + source + "&" +
            "trade_no=" + trade_no + "&" +
            "amount="   + amount + "&" +
            "partner="  + partner + "&" +
            "paydes="   + paydes + "&" +
            "debug="    + debug + "&" +
            "tborder="  + tborder + "&" +
            "key="      + appKey;
    console.log("validateStr: " + validateStr);
    var generateSign = crypto.createHash('md5').update(validateStr,"utf8").digest('hex');
    console.log("generateSign: " + generateSign);
    console.log("sign: " + sign);

    var productId;
    var userUid = paydes;//平台未提供userUid的通信，改为在paydes中传输

    if (sign != generateSign) {
        response.end(JSON.stringify({"status":"fail"}), "utf-8");
        console.log("sign not match!!!!!!!!!!!");
    }
    else {
        async.series([
            function(cb){
                order.getOrder(userUid,trade_no,function(err,res){
                    if(err) cb("dbError");
                    else{
                        productId = res["productId"];
                        cb(null);
                    }
                });
            },
            function(cb){
                order.updateOrder(userUid, trade_no,"tb","","",Math.floor(amount * 0.01),1,"",productId, JSON.stringify(query), function(err, res) {
                    if(err){
                        cb("dbError");
                    }else{
                        cb(null);
                    }
                })
            }
        ],function(err){
            if(err){
                response.end(JSON.stringify({"status":"fail"}), "utf-8");
            } else{
                response.end(JSON.stringify({"status":"success"}), "utf-8");
            }
        });
    }
}

exports.start = start;
