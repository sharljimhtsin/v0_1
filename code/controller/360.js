/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-4-28
 * Time: 下午6:34
 * To change this template use File | Settings | File Templates.
 */
var http = require("http");
var urlParse = require("url").parse;
var crypto = require("crypto");
var platformConfig = require("../../config/platform");
var async = require("async");
function check(platformUserId, info, callbackFn) {
    var authorizationCode = info["authorizationCode"]; //通过authorizationCode换取Access Token
    var grant_type = "authorizationCode";
    var client_id = platformConfig["360"]["appKey"];
    var client_secret = platformConfig["360"]["app_secret"];
    var redirect_uri = "oob";
    var returnData = {};
    var url = "https://openapi.360.cn/oauth2/access_token?grant_type=authorization_code&code=" + authorizationCode+"&client_id=" +
        client_id + "&client_secret=" + client_secret+ "&redirect_uri=" + redirect_uri;
    var urlData = urlParse(url);
    var accessToken;
    var options = {
        hostname:urlData.hostname,
        port:urlData.port || 80,
        path:urlData.path,
        method:"GET"
    };
    async.series([
        function (cb){ //获取AccessToken
            var req = http.request(options, function(res) {
                var mStatusCode = res.statusCode;
                res.setEncoding('utf8');
                var mData = '';
                var sTime = Date.now();

                res.on('data', function(chunk) {
                    mData += chunk;
                });
                res.on('end', function() {
                    var mTime = Date.now() - sTime;
                    var mDataObj = JSON.parse(mData);
                    console.log("time:" + mTime);
                    if (mDataObj && mDataObj["access_token"] != null)//验证成功
                    {
                        accessToken = mDataObj["access_token"];
                        returnData["refresh_token"] = mDataObj["refresh_token"];
                        cb(null, null);
                    }
                    else
                    cb("invalidAccount",null);
                });
            });
            req.on("error", function(err) {
                cb(err,null);
            });

            req.end();
        },
        function (cb){//获取用户信息
            var urlUser = "https://openapi.360.cn/user/me.json?access_token=" + accessToken+"&fields=id,name"
            var urlUserData = urlParse(urlUser);
            var options2 = {
                hostname:urlUserData.hostname,
                port:urlUserData.port || 80,
                path:urlUserData.path,
                method:"GET"
            };
            var req = http.request(options2, function(res) {
                res.setEncoding('utf8');
                var mData = '';
                var sTime = Date.now();

                res.on('data', function(chunk) {
                    mData += chunk;
                });
                res.on('end', function() {
                    var mTime = Date.now() - sTime;
                    var mDataObj = JSON.parse(mData);
                    console.log("time:" + mTime);
                    if (mDataObj != null && mDataObj["id"] != null)//验证成功
                    {
                        returnData["userId"] = mDataObj["id"];
                        returnData["userName"] = mDataObj["name"];
                        cb(null, null);
                    }
                    else
                        cb("invalidAccount",null);
                });
            });
            req.on("error", function(err) {
                cb(err,null);
            });
            req.end();
        }
    ],function(err,res){
        if(err){
            callbackFn(err,null);
        }else{
            callbackFn(null,returnData);
        }
    })
}

exports.check = check;