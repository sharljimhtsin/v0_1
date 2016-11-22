/**
 * Created with JetBrains WebStorm.
 * User: joseppe
 * 泰文支付验证
 * Date: 14-12-18
 * Time: 下午2:49
 * To change this template use File | Settings | File Templates.
 */
var crypto = require("crypto");
var platformConfig = require("../../config/platform");
var order = require("../model/order");
var jutil = require("../utils/jutil");
var async = require("async");
var variable = require("../model/userVariable");
var mysql = require("../alien/db/mysql");
function start(postData, response, query) {
    var fs = require('fs');
    fs.appendFile('payOrder.log',JSON.stringify(query)+"\n",'utf8');
    console.log("jodoData......." + JSON.stringify(query));
    if(jutil.postCheck(query , "uid", "serverid", "rolename", "price", "ext", "orderid", "cporderid" , "ts", "psw") == false) {
        response.end(JSON.stringify({"state":{"code" : 1000 , "msg" : "參數錯誤"}}), "utf-8");
        return;
    }
    var platformId = 'jodo';

    var uid = query["uid"];//jodoUid pUserId
    var serverid = query["serverid"];
    var rolename = query["rolename"];
    var price = query["price"];//充值金额，现实货币
    var ext = query["ext"];
    var orderid = query["orderid"];
    var cporderid = query["cporderid"];
    var ts = query["ts"];
    var psw = query["psw"];
    var stringA = ext != null ? ext.split("#") : [];

    var cpid = platformConfig[platformId]["cpid"];
    var gameid = platformConfig[platformId]["gameid"];
    var channelid = platformConfig[platformId]["channelid"];
    var secretkey = platformConfig[platformId]["secretkey"];

    var shaSign = crypto.createHash('sha256').update(secretkey+uid+serverid+rolename+price+ext+orderid+cporderid+ts,"utf8").digest('hex');
    var roleuid = stringA[0];
    var number = stringA[1] - 0;
    var goodId = stringA[2];

    if(psw != shaSign) { //MD5校验成功
        console.log("sha256驗證失敗");
        console.log("md5Sign:" + shaSign);
        response.end(JSON.stringify({"state":{"code" : 1000 , "msg" : "加密验证失败"}}), "utf-8");
    }else {
        order.updateOrder(roleuid, cporderid, platformId, uid, number, price, 1, ts, goodId,JSON.stringify(query), function(err, res) {
            if (res == 1){
                console.log("jodo充值成功");
                response.end(JSON.stringify({"state":{"code" : 0 , "msg" : "充值成功"}}), "utf-8");
            }
            else {
                console.log("jodo充值失敗");
                response.end(JSON.stringify({"state":{"code" : 1000 , "msg" : "充值失敗"}}), "utf-8");
            }
        }, undefined, undefined, orderid);
    }
}
exports.start = start;