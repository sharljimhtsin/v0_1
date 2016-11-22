/**
 * User: liyuluan
 * Date: 14-2-10
 * Time: 上午11:58
 */

var platformConfig = require("../../config/platform");
var crypto = require("crypto");
var order = require("../model/order");
var queryString = require("querystring");
var Buffer = require('buffer').Buffer;
var jutil = require("../utils/jutil");
var async = require("async");

function start(postData, response, query) {
    console.log("postData: " + JSON.stringify(postData));
//    console.log("地址：：：", response.socket.remoteAddress);
//    console.log("query" + JSON.stringify(query));

    //var postStr = {"order_id":"2014032831988664&billno=edd5d8398c50bf021e99255d76040f64&account=龙珠weiyouxi1&amount=10.00&status=0&app_id=3025&uuid=&zone=1&roleid=8606712381&sign=90c6d4191342779034bb509b1fd9635b"};
    //var postStr = JSON.stringify(postData);
    if(postData == null){
        response.end("fail", "utf-8");
        return;
    }
//    var postStr = "order_id=" + postData["order_id"];
    //postStr = "order_id=" + postStr.substring(11);//传入的字符串有问题，需特殊处理
//    var parseData = queryString.parse(postStr);
    var parseData = postData;
//    console.log("postStr: " + JSON.stringify(postStr));
    console.log("parseData: " + JSON.stringify(parseData));

    var sign = parseData["sign"];

    var order_id = parseData["order_id"];
    var billno = parseData["billno"];
    var account = parseData["account"];
    var amount = parseData["amount"];
    var status = parseData["status"];
    var app_id = parseData["app_id"];
    var uuid = parseData["uuid"];
    var zone = parseData["zone"];
    var roleid = parseData["roleid"];
    var appkey = platformConfig["pp"]["appKey"];

    var validateStr = order_id + "|" + billno + "|" + account + "|" + amount + "|" + status + "|" + app_id + "|" + uuid + "|" + zone + "|" + roleid + "|" + appkey;
//    validateStr = "2014032831108794|f5a3a77cc54955634ca1998ee46a22d4|龙珠weiyouxi1|10.00|0|3025||1|8606712381";
//    sign = "2b0409603a7f957effd1f6d871013673";

    var generateSign = crypto.createHash('md5').update(validateStr,"utf8").digest('hex');
    console.log("generateSign: " + generateSign);
    console.log("sign: " + sign);

    var productId;

    if (sign != generateSign) {
        response.end("fail", "utf-8");
        console.log("sign not match!!!!!!!!!!!");
        return;
    }
    else {
        async.series([
            function(cb){
                order.getOrder(roleid,billno,function(err,res){
                    if(err) cb("dbError");
                    else{
                        productId = res["productId"];
                        cb(null);
                    }
                });
            },
            function(cb){
                order.updateOrder(roleid, billno,"pp","","",amount,status,"",productId, JSON.stringify(postData), function(err, res) {
                    if(err){
                        cb("dbError");
                    }else{
                        cb(null);
                    }
                })
            }
        ],function(err){
           if(err){
               response.end("fail", "utf-8");
           } else{
               response.end("success", "utf-8");
           }
        });
    }
}

exports.start = start;
