/**
 * Created by xiazhengxin on 2015/1/30 21:28.
 *
 * 爱思充值平台,充值购买验证.
 */

var ursa = require("ursa");
var platformConfig = require("../../config/platform");
var order = require("../model/order");
var configManager = require("../config/configManager");
var async = require("async");
var variable = require("../model/userVariable");
var mysql = require("../alien/db/mysql");
var jutil = require("../utils/jutil");
var fs = require('fs');
var child_process = require("child_process")

function start(postData, response, query) {
    fs.appendFile('payOrder.log', "i4:" + jutil.now() + " | " + JSON.stringify(postData) + "\n" + JSON.stringify(query) + "\n", 'utf8');
    if (jutil.postCheck(postData, "order_id", "billno", "account", "amount", "status", "app_id", "role", "zone", "sign") == false) {
        response.end("fail", "utf-8");
        return;
    }
    /*    -----BEGIN PUBLIC KEY-----
     MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQClJSCoxApaRQZLh8HoUTtbQ2nxj23cfDFYEGNQ
     ZG46oUes5fexv70S40WhVZzWiGMs8V4PXM6NeHeQ433k22OsYqPvmlX3OzYUu2GgpZ1FqWmH2JSC
     6rs6Tr7/0duW+cmHijdlRe0qIDW4g0H7wnJXwwXs0Jv1bMm9NkXuYa9hZQIDAQAB
     -----END PUBLIC KEY-----*/
    var publicKey = platformConfig["i4"]["AppSecret"];//公钥
    checkSignViaNative(postData, publicKey, function (err, res) {
        if (err) {
            console.log("签名验证失败");
            response.end("fail", "utf-8");
        } else {
            console.log("签名验证成功");
            var uid = postData["account"];
            var count = postData["amount"];
            var orderNo = postData["billno"];
            var args = orderNo.split("#");
            var app_id = postData["app_id"];
            var userUid = postData["role"];
            order.updateOrder(userUid, args[0], "i4", app_id, count, args[1], 1, "", 0, JSON.stringify(postData), function (err, res) {
                if (res == 1) {
                    console.log("result:success");
                    response.end("success", "utf-8");
                }
                else {
                    console.log("result:failed");
                    response.end("fail", "utf-8");
                }
            });
        }
    });
}

function checkSignViaNative(postData, publicKey, cb) {
    var phpexec = "/usr/local/php/bin/php";
    var path = require.resolve("./information.node");
    path = require("path").dirname(path) + "/";
    var phpfile = fs.realpathSync(path + "../libs/payplatform_demo_php/notify_url.php");
    postData["publicKey"] = convertPubkeyToPem(publicKey);
    var phpargs = new Buffer(JSON.stringify(postData));
    var cmd = phpexec + " " + phpfile + " " + phpargs.toString("base64");
    console.log(cmd);
    child_process.exec(cmd, function (err, stdout, stderr) {
        console.log("stdout " + stdout + ";");
        console.log("stderr " + stderr + ";");
        if (err || stdout == "fail") {
            cb("err");
        } else {
            cb(null);
        }
    });
}

//获取签名数据
function getSignData(postData) {
    var keys = [];
    for (var k in postData) {
        keys.push(k);
    }
    keys.sort();
    console.log("keys:" + keys);
    var returnStr = "";
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key == "sign")
            continue;
        if (i == 0)
            returnStr += key + "=" + postData[key];
        else
            returnStr += "&" + key + "=" + postData[key];
    }
    console.log("signData:" + returnStr);
    return returnStr;
}

//验证签名数据
function validateSignature_verify(signData, signTarget, rsaPublicKey) {
    rsaPublicKey = convertPubkeyToPem(rsaPublicKey);
    var pub = ursa.createPublicKey(rsaPublicKey);
    console.log(ursa.isKey(pub));
    console.log(ursa.isPrivateKey(pub));
    console.log(ursa.isPublicKey(pub));
    var verifier = ursa.createVerifier("sha1");
    verifier.update(new Buffer(signData));
    return verifier.verify(pub, signTarget, 'base64');
}

//验证签名数据
function validateSignature_decrypt(post, sign, rsaPublicKey) {
    rsaPublicKey = convertPubkeyToPem(rsaPublicKey);
    var key = ursa.createPublicKey(rsaPublicKey);
    console.log(ursa.isKey(rsaPublicKey));
    console.log(ursa.isPrivateKey(rsaPublicKey));
    console.log(ursa.isPublicKey(rsaPublicKey));
    var inputLen = sign.length;
    var offSet = 0;
    var i = 0;
    var maxDecryptBlock = 1024 / 8;
    var de = '';
    var cache = '';

    // 对数据分段解密
    while (inputLen - offSet > 0) {
        if (inputLen - offSet > maxDecryptBlock) {
            cache = key.publicDecrypt(sign.substr(offSet, maxDecryptBlock), 'base64', 'utf8');
        } else {
            cache = key.publicDecrypt(sign.substr(offSet, inputLen - offSet), 'base64', 'utf8');
        }
        de = de + cache;
        i++;
        offSet = i * maxDecryptBlock;
    }
    console.log("RAS decrypt is " + de);
    var kvs = {};
    var paras = de.split("&");
    for (var para in paras) {
        para = paras[para];
        var kvz = para.split("=");
        kvs[kvz[0]] = kvz[1];
    }
    if (kvs["billno"] == post['billno'] && kvs["amount"] == post['amount'] && kvs["status"] == post['status']) {
        return true;
    } else {
        return false;
    }
}

function convertPubkeyToPem(pubKey) {
    var public_key_string = "";
    var count = 0;
    for (var i = 0; i < pubKey.length; i++) {
        if (count < 63) {
            public_key_string += pubKey[i];
            count++;
        } else {
            public_key_string += pubKey[i] + "\r\n";
            count = 0;
        }
    }
    public_key_string = "-----BEGIN PUBLIC KEY-----\r\n" + public_key_string + "\r\n-----END PUBLIC KEY-----";
    console.log("pubPem:" + public_key_string);
    return public_key_string;
}

exports.start = start;