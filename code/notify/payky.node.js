/**
 * Created by apple on 14-4-16.
 */
var ursa = require('ursa');
var crypto = require("crypto");
var order = require("../model/order");
function start(postData, response, query) {
    if (postData == null || postData["sign"] == undefined) {
        response.end("failed");
        return;
    }
    console.log("postData: " + JSON.stringify(postData));
    var obj = postData;//parsePostData(postData);
    var publicKey = "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDHs7OYjHL/0jTBWFXhyS49vOCFkW5KmJsvUNB1LbdQvuFGZq73OgRhnJoj1zOhvmFo+M91e4CYUyof39ZuBa0ULeqvLgXLPjWwWzYx8bHVa/xnZkVHCzOBIU004R8ftmY+HgOej5EhSFtqMmiyDLBRorkX9gxkIpWeALtocshQ9QIDAQAB";
    var signData = getSignData(obj);
    var isValid = validateSignature(signData,obj["sign"],publicKey);
    if (isValid) {
        var resultData = decodeData(obj["notify_data"],publicKey);
        var resultObj = parseQueryData(resultData.toString());
        console.log("resultObj:" + JSON.stringify(resultObj));
        var orderSeqObj = parseOrderNoSeq(resultObj["dealseq"]);
        if (resultObj["payresult"] == 0) {
            order.updateOrder(orderSeqObj["userUid"], orderSeqObj["orderNo"],"ky",obj["uid"],1,resultObj["fee"],resultObj["payresult"],"",orderSeqObj["productId"], JSON.stringify(postData), function(err, res) {
                if (res == 1) {
                    console.log("result:success");
                    response.end("success");
                }
                else {
                    console.log("result:failed");
                    response.end("failed");
                }
            });
        } else {
            response.end("failed");
        }
    } else {
        console.log("result:failed");
        response.end("failed");
    }
}

function parsePostData(data) {
    var d = data["sign"];
    var paramArr = d.split("&");
    var sign = paramArr.shift();
    var returnObj = {};
    returnObj["sign"] = sign;
    for (var i = 0; i < paramArr.length; i++) {
        var p = paramArr[i];
        var pArr = p.split('=');
        var k = pArr[0];
        pArr.shift();
        returnObj[k] = pArr.join('=');
    }
    return returnObj;
}

function parseOrderNoSeq(seq) {
    var obj = {};
    var arr = seq.split("#");
    obj["orderNo"] = arr[0];
    obj["userUid"] = arr[1];
    obj["productId"] = arr[2];
    return obj;
}

function parseQueryData(data) {
    var returnObj = {};
    var paramArr = data.split("&");
    for (var i = 0; i < paramArr.length; i++) {
        var p = paramArr[i];
        var pArr = p.split('=');
        var k = pArr[0];
        pArr.shift();
        returnObj[k] = pArr.join('=');
    }
    return returnObj;
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
    for (var i = 0; i < keys.length; i ++) {
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

//解密数据
function decodeData(encData, publicKey) {
    publicKey = convertPubkeyToPem(publicKey);
    var pub = ursa.createPublicKey(publicKey);
    return pub.publicDecrypt(new Buffer(encData, 'base64'));
}

exports.start = start;