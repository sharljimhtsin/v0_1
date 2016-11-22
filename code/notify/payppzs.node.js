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
    var fs = require('fs');
    fs.appendFile('payOrder.log',"ppzs:" + jutil.now() + " | " +JSON.stringify(postData)+"\n"+JSON.stringify(query)+"\n",'utf8');

    if(postData == null){
        response.end("fail", "utf-8");
        return;
    }

    var parseData = postData;

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
    var appkey = platformConfig["ppzs"]["appKey"];

    var validateStr = order_id + "|" + billno + "|" + account + "|" + amount + "|" + status + "|" + app_id + "|" + uuid + "|" + zone + "|" + roleid + "|" + appkey;

    var generateSign = crypto.createHash('md5').update(validateStr,"utf8").digest('hex');

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
