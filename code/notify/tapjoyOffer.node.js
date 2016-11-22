/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-7-2
 * Time: 下午5:30
 * To change this template use File | Settings | File Templates.
 */
var crypto = require("crypto");
var platformConfig = require("../../config/platform");
var order = require("../model/order");
var jutil = require("../utils/jutil");
var async = require("async");
var variable = require("../model/userVariable");
var mysql = require("../alien/db/mysql");
var user = require("../model/user");
var redis = require("../alien/db/redis");
function start(postData, response, query) {
    var secret_key = "y5GlrZZtvxDRa80piVtr"; //私钥
    console.log("tapjoy....................." + JSON.stringify(query));
    //query = {"snuid":"undefined","currency":"1","mac_address":"d022be6308cb","display_multiplier":"1.0","id":"f4412c9f-15eb-4b8a-b142-8bd976d2e310","verifier":"290c96bfd7c5931159ec68a809276f9d"}
    if(jutil.postCheck(query , "snuid" , "currency" ,"mac_address","id") == false) {
        response.end("403", "utf-8");
        return;
    }
    var id = query["id"];
    var snuid = query["snuid"];
    var mac_address = query["mac_address"];
    var currency = query["currency"];
    var sig = query["verifier"];
    var signStr = id + ":" + snuid + ":" + currency + ":" + secret_key;
   // var signStr = "#{" + id + "}:#{" + snuid + "}:#{" + currency + "}:#{" + secret_key + "}";
    var md5Sign = crypto.createHash('md5').update(signStr,"utf8").digest('hex');
    var updateUser = {};
    if(snuid == "undefined" || snuid == undefined) {
        response.end("403", "utf-8");
        return;
    }
    if(md5Sign != sig) {
        response.end("403", "utf-8");
    } else {
        var key = snuid + ":" + id;
        async.series([
            function(cb) {
                redis.user(snuid).s(key).getObj(function(err,res){
                    if(err){
                        cb("error",null);
                    }else{
                        if(res != null) {
                            response.end("403", "utf-8");
                        } else {
                            cb(null,null);
                        }
                    }
                });
            },
            function(cb) { //添加伊美加币
                user.getUser(snuid , function(err,res) {
                    if(err) {
                        cb("error" , null);
                    } else {
                        updateUser["ingot"] = (res["ingot"] - 0) + (currency - 0);
                        cb(null , null);
                    }
                });
            },
            function(cb) { //添加伊美加币
                user.updateUser(snuid , updateUser , function(err,res) {
                    if(err) {
                        cb("error" , null);
                    } else {
                        cb(null , null);
                    }
                });
            },
            function(cb) {
                var data = {"currency" : currency};
                redis.user(snuid).s(key).setObj(data,function(err,res){
                    if(err){
                        cb("writeWrong",null);
                    }else{
                        cb(null,res);
                    }
                });
            }
        ],function(err,res) {
            if(err) {
                if(err != "writeWrong") {
                    response.end("403", "utf-8");
                }
            } else {
                response.end("200", "utf-8");
            }
        })
    }
}
exports.start = start;