/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * 凯英支付验证
 * Date: 14-5-16
 * Time: 下午4:14
 * To change this template use File | Settings | File Templates.
 */
var ursa = require('ursa');
var crypto = require("crypto");
var platformConfig = require("../../config/platform");
var order = require("../model/order");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var async = require("async");
var variable = require("../model/userVariable");
var mysql = require("../alien/db/mysql");

function start(postData, response, query) {
    var fs = require('fs');
    fs.appendFile('payOrder.log',"kk:" + jutil.now() + " | " +JSON.stringify(postData)+"\n"+JSON.stringify(query)+"\n",'utf8');

    if(jutil.postCheck(postData , "notifyId" , "partnerOrder" ,"productName" , "productDesc" , "price" , "count" , "attach" ,"sign" ) == false) {
		response.end("result=FAIL&resultMsg=参数错误", "utf-8");
        return;
    }

    var publicKey = "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCmreYIkPwVovKR8rLHWlFVw7YDfm9uQOJKL89Smt6ypXGVdrAKKl0wNYc3/jecAoPi2ylChfa2iRu5gunJyNmpWZzlCNRIau55fxGW0XEu553IiprOZcaw5OuYGlf60ga8QT6qToP0/dpiL/ZbmNUO9kUhosIjEu22uFgR+5cYyQIDAQAB";//公钥
	var sign = postData["sign"];
	var signData = "notifyId="+postData["notifyId"]+"&partnerOrder="+postData["partnerOrder"]+"&productName="+postData["productName"]+"&productDesc="+postData["productDesc"]+"&price="+postData["price"]+"&count="+postData["count"]+"&attach="+postData["attach"];
	
    var isValid = validateSignature(signData,sign,publicKey);
    if (isValid) {
		
        var uid = postData["userId"];
        var count = postData["count"];
        var orderMoney = (postData["price"]-0) / 100;
        var attach = postData["attach"];
        var stringA = attach != null ? attach.split("#") : [];
        var orderNo = stringA[0];
        var productId =  stringA[1];
        var userUid =  stringA[2];
		
        order.updateOrder(userUid, orderNo, "kk", uid, count, orderMoney, 1, "", productId, JSON.stringify(postData), function(err, res) {
            if (res == 1) {
                console.log("result:success");
                response.end("result=OK&resultMsg=成功", "utf-8");
            }
            else {
                console.log("result:failed");
				response.end("result=FAIL&resultMsg=发货失败", "utf-8");
            }
        });
        console.log("签名验证成功");
    } else {
        console.log("签名验证失败");
		response.end("result=FAIL&resultMsg=签名验证失败", "utf-8");
    }

}

//验证签名数据
function validateSignature(signData, signTarget, rsaPublicKey) {

    rsaPublicKey = convertPubkeyToPem(rsaPublicKey);
    var pub = ursa.createPublicKey(rsaPublicKey);
    var verifier = ursa.createVerifier("sha1");
    verifier.update(new Buffer(signData));
    return verifier.verify(pub,signTarget,'base64');
}

function convertPubkeyToPem(pubKey) {
    var public_key_string = "";
    var count=0;
    for(var i = 0; i<pubKey.length; i++){
        if(count<63){
            public_key_string += pubKey[i];
            count++;
        }else{
            public_key_string += pubKey[i] + "\r\n";
            count=0;
        }
    }
    public_key_string = "-----BEGIN PUBLIC KEY-----\r\n" + public_key_string + "\r\n-----END PUBLIC KEY-----";
    console.log("pubPem:" + public_key_string);
    return public_key_string;
}


exports.start = start;