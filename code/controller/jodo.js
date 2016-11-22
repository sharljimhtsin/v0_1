var jutil = require("../utils/jutil");
var crypto = require("crypto")
var mysql = require("../alien/db/mysql");
var platformConfig = require("../../config/platform");
var http = require("http");
var urlParse = require("url").parse;
var user = require("../model/user");
function check(platformUserId, info, callbackFn) {
    if (jutil.postCheck(info,"username", "sessionId") == false) {
        callbackFn("posterror");
        return ;
    }
//    callbackFn(null, 1)
//    return ;

    var platformId = "jodo";
    var gameuid = info['username'];
    var sessiontoken = info['sessionId'];

    var cpid = platformConfig[platformId]["cpid"];
    var gameid = platformConfig[platformId]["gameid"];
    var channelid = platformConfig[platformId]["channelid"];
    var secretkey = platformConfig[platformId]["secretkey"];
    var url = "http://usercenter.1fpay.com/usercenter/loginverify";
    var urlData = urlParse(url);
    //文档中的格式：sha256(secretkey+cpid+gameid+channelid+pn+sessiontoken+gameuid)
    var postData = "cpid="+cpid+"&gameid="+gameid+"&channelid="+channelid+"&sessiontoken="+sessiontoken+"&gameuid="+gameuid+"&pn=";
    var psw = crypto.createHash('sha256').update(secretkey+cpid+gameid+channelid+sessiontoken+gameuid,"utf8").digest('hex');//1
    //signStr = crypto.createHash('md5').update(signStr+appKey,"utf8").digest('hex');
    postData += "&psw="+psw;
    var options = {
        hostname:urlData.hostname,
        port:urlData.port || 80,
        path:url+"?"+postData,
        method:"GET"
    };

    var req = http.request(options, function(res) {
        res.setEncoding('utf8');

        var mData = '';
        res.on('data', function(chunk) {
            mData += chunk;
        });
        res.on('end', function() {
            try {
                console.log(mData);
                var mDataObj = JSON.parse(mData);
            } catch(err){
                callbackFn("invalidAccount"+err);
                return;
            }
            if (mDataObj && mDataObj["state"]["code"]==0) {
                callbackFn(null, 1);
            } else {
                console.log(mDataObj);
                callbackFn("invalidAccount");
            }
        });
    });
    req.on("error", function(err) {
        console.log("http err", err);
        callbackFn("api httprequest error");
    });
    //req.write("");
    req.end();
}

exports.check = check;