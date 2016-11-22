/**
 * Created by Raul on 2014-11-21.泰文平台注册
 */
var jutil = require("../utils/jutil");
var iosUser = require("../model/iosUser");
var crypto = require("crypto");
var urlParse = require("url").parse;
var mysql = require("../alien/db/mysql");
var platformConfig = require("../../config/platform");
var http = require("http");

function reg(info, callbackFn) {

    if (jutil.postCheck(info,"username","password","platformId") == false) {
        callbackFn("invalidAccount")
    }

    var mCountry = platformConfig[info["platformId"]]["country"];
    var appId = platformConfig[info["platformId"]]["appId"];
    var appKey = platformConfig[info["platformId"]]["appKey"];

    var url = "http://www.gameforest.in.th/mobile/mRegister/";
    var urlData = urlParse(url);

    var username = info['username'];
    var password = info['password'];
    var time = jutil.now();
    var postData = "appid="+appId+"&password="+password+"&time="+time+"&username="+username;

    var signStr = crypto.createHash('md5').update(postData,"utf8").digest('hex');//1
    signStr = crypto.createHash('md5').update(signStr+appKey,"utf8").digest('hex');
    postData += "&sign="+signStr;

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

            if (mDataObj &&  mDataObj["code"]==0) {
                callbackFn(null, 1);
            }
            else {
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
exports.reg = reg;