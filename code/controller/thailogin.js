var jutil = require("../utils/jutil");
var iosUser = require("../model/iosUser");
var crypto = require("crypto")
var mysql = require("../alien/db/mysql");
var platformConfig = require("../../config/platform");
var http = require("http");
var urlParse = require("url").parse;
var user = require("../model/user");
function check(platformUserId, info, callbackFn) {
    if (jutil.postCheck(info,"username") == false) {
        callbackFn("posterror");
        return ;
    }
//    callbackFn(null, 1)
//    return ;

    var platformId = "thai";
    var user_id = info['username'];

    var appId = platformConfig[platformId]["appId"];
    var appKey = platformConfig[platformId]["appKey"];
    var url = "http://www.gameforest.in.th/sdk/verify/";
    var urlData = urlParse(url);
    //文档中的格式：md5(md5(appid=1001&password=e3ceb5881a0a1fdaad01296d7554868d&time=1411043863&username=abc@11.com) + KEY)
    var postData = "app_id="+appId+"&user_id="+user_id;
    var signStr = crypto.createHash('md5').update(postData,"utf8").digest('hex');//1
    signStr = crypto.createHash('md5').update(signStr+appKey,"utf8").digest('hex');
    postData += "&sign="+signStr;
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
                //console.log(mData);
                var mDataObj = JSON.parse(mData);
            } catch(err){
                callbackFn("invalidAccount"+err);
                return;
            }
            //console.log(mDataObj["code"]);
            if (mDataObj && mDataObj["code"]==0) {
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