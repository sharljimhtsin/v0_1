var crypto = require("crypto");
//var ursa = require('ursa');
var http = require("http");
var urlParse = require("url").parse;
var platformConfig = require("../../config/platform");

function check(platformUserId, info, callbackFn) {
    if (info == null || info["uid"] == null || info["ucid"] == null || info["uuid"] == null) {
        callbackFn("invalidAccount", 0);
        console.log("anfan_login", "invalidAccount1");
        return;
    }

    var publicKey = "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDebKpTt0Qm79N2jvtmkrgsfurmSQFMLtJxNCKCpNd6zFaqyPCrJwU3IALxDA6pxF6vnrKPwiBHwjzpOVl/xVkmWYGpYbI1h1y57Ufr4x7+ldvWas8HM7m3jjRAo5sx/pLgzNqfbKDtl49LeaZGSl7ETlfOewL99w7X9y6b6y8VIwIDAQAB";//公钥

    var postData = {};
    postData["uid"] = info["uid"];
    postData["ucid"] = info["ucid"];
    postData["uuid"] = info["uuid"];
    postData["appId"] = platformConfig["anfan"]["appId"];
    postData = getSignData(postData);


    var md5Str = postData + "&signKey="+platformConfig["anfan"]["appKey"];
    var md5Sign = crypto.createHash('md5').update(md5Str,"utf8").digest('hex');

    postData = postData + "&sign="+md5Sign;

    console.log("--------------",md5Sign)
    console.log("--------------",postData)

    var url = "http://api.qcwan.com/info/uc";
    var urlData = urlParse(url);

    var options = {
        hostname:urlData.hostname,
        port:urlData.port || 80,
        path:urlData.path,
        method:"POST",
        headers: {
            "Content-Type": 'application/x-www-form-urlencoded',
            "Content-Length": postData.length
        }
    };

    var req = http.request(options, function(res) {
        res.setEncoding('utf8');

        var mData = '';
        res.on('data', function(chunk) {
            mData += chunk;
        });
        res.on('end', function() {
            try {
                var mDataObj = JSON.parse(mData);
            } catch(err){
                callbackFn("invalidAccount"+err);
                return;
            }

            if (mDataObj &&  mDataObj["returnCode"]==0) {
                var resultData = {};
                resultData["platformUserId"] = JSON.parse(mDataObj["msg"])["ucid"];

                console.log("anfan_login1", mDataObj,resultData);
                callbackFn(null, resultData);
            }
            else {
//                var resultData = {};
//                resultData["platformUserId"] = mDataObj["msg"]["ucid"];
//                callbackFn(null, resultData);
                console.log("anfan_login2","status", JSON.stringify(mDataObj));
                callbackFn("invalidAccount");
            }
        });
    });

    req.on("error", function(err) {
        callbackFn(err);
    });

    req.write(postData + "\n");
    req.end();
}


//获取签名数据
function getSignData(postData) {
    var keys = [];
    for (var k in postData) {
        keys.push(k);
    }
    keys.sort();

    var returnStr = "";
    for (var i = 0; i < keys.length; i ++) {
        var key = keys[i];
        if (i == 0)
            returnStr += key + "=" + postData[key];
        else
            returnStr += "&" + key + "=" + postData[key];
    }
    return returnStr;
}

//解密数据
function decodeData(encData, publicKey) {
    publicKey = convertPubkeyToPem(publicKey);
    var pub = ursa.createPublicKey(publicKey);
    return pub.publicDecrypt(new Buffer(encData, 'hex'));
}

exports.check = check;