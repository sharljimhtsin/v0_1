var jutil = require("../utils/jutil");
var platformConfig = require("../../config/platform");
var urlParse = require("url").parse;
var http = require('http');
var redis = require("../alien/db/redis");

var sinaVerifyUrl = "http://i.game.weibo.cn/appsvc/distsvc/1/user/verify?";
var sinaVerifyUrl360 = "http://i.game.weibo.cn/appsvc/distsvc/1/user/gettoken?";
var dragonBallAppKey = 3675576059;

/**
 * @param postData
 * @param response
 * @param query
 */

function start(postData,response,query) {
    if (jutil.postCheck(postData,"platformId", "token") == false) {
        response.echo("androidLogin.verify",jutil.errorInfo("postError"));
        return;
    }
    console.log(JSON.stringify(postData));
    var platformId = postData["platformId"];
    console.log("androidLogin.verify", "PlatformId:" + platformId);
    var country = platformConfig[platformId]["country"];
    var cid = platformConfig[platformId]["sinaCid"];
    console.log("androidLogin.verify", "Cid:"+cid);
    console.log("androidLogin.verify", "Country:"+country);
    var token = postData["token"];
    var requestUrl='';

    if(platformId == 'a360') {
        var request360 = sinaVerifyUrl360 + "cid=" + cid + "&appkey=" + dragonBallAppKey + "&code=" + token;

        var urlData = urlParse(request360);
        var options = {
            hostname:urlData.hostname,
            port:urlData.port || 80,
            path:urlData.path,
            method:"GET"
        };
        var token='';
        var body360='';

        var req = http.request(options, function(res) {
            console.log("Got response: " + res.statusCode);
            res.on('data',function(d){
                body360 += d;
            }).on('end', function(){
                    console.log("androidLogin.verify", "Get token response:" + body360);
                    try {
                        body360 = JSON.parse(body360);
                    } catch (err) {
                        console.error(body360);
                        response.echo("androidLogin.verify", JSON.stringify({"ERROR": "jsonerror", "info": "json errorW"}));
                        return;
                    }

                    if(body360["code"] && body360["code"]  != "0") {
                        console.log("androidLogin.verify", "Get token failed" + JSON.stringify(body360));
                        response.echo("androidLogin.verify", "Get token failed" + JSON.stringify(body360));
                        return;
                    }

                    token = body360["access_token"];
                    requestUrl = sinaVerifyUrl + "cid=" + cid + "&token=" + token + "&appkey=" + dragonBallAppKey;
                    console.log("androidLogin.verify", "RequestURL:"+requestUrl);

                    var urlData = urlParse(requestUrl);
                    var options = {
                        hostname:urlData.hostname,
                        port:urlData.port || 80,
                        path:urlData.path,
                        method:"GET"
                    };

                    var body = '';
                    var req2 = http.request(options, function(res2) {
                        console.log("Got response: " + res2.statusCode);
                        res2.on('data',function(d){
                            body += d;
                        }).on('end', function(){
                                try {
                                    var str = body;
                                    body = JSON.parse(body);
                                } catch (err) {
                                    console.error(str);
                                    response.echo("androidLogin.verify",  JSON.stringify({"ERROR": "jsonerror", "info": "json errorW"}));
                                    return;
                                }

                                if(body["user_id"] && body["user_id"]  != "") {
                                    var platformToken = jutil.randomString();
                                    redis.login(country).s("platformToken:" + body["user_id"]).set(platformToken);
                                    console.log('androidLogin.verify', "platformToken:" + body["user_id"]);
                                    body["platformToken"] = platformToken;
                                    body["token"] = token;
                                    body["user_name"] = jutil.toBase64(body["user_name"]);
                                }
                                body = JSON.stringify(body);
                                response.echo("androidLogin.verify", body);
                                console.log(body);
                            });

                    }).on('error', function(e) {
                            console.log("Got error: " + e.message);
                        })

                    req2.end();
                });

        }).on('error', function(e) {
                console.log("Got error: " + e.message);
        })
        req.end();

    } else {
        requestUrl = sinaVerifyUrl + "cid=" + cid + "&token=" + token + "&appkey=" + dragonBallAppKey;
        if (jutil.postCheck(postData,"uid") != false) {
            requestUrl = requestUrl + "&uid=" + postData["uid"];
        }

        console.log("androidLogin.verify", "RequestURL:"+requestUrl);

        var urlData = urlParse(requestUrl);
        var options = {
            hostname:urlData.hostname,
            port:urlData.port || 80,
            path:urlData.path,
            method:"GET"
        };

        var body = '';
        var req = http.request(options, function(res) {
            console.log("Got response: " + res.statusCode);
            res.on('data',function(d){
                body += d;
            }).on('end', function () {
                console.log("body:" + body);
                try {
                    body = JSON.parse(body);
                } catch(err) {
                    console.log("verify failed:platformId:" + platformId + " return:" + body);
                    response.echo("androidLogin.verify", JSON.stringify({"status":1}));//验证失败
                }
                if(body["user_id"] && body["user_id"]  != "") {
                    var platformToken = jutil.randomString();
                    redis.login(country).s("platformToken:" + body["user_id"]).set(platformToken);
                    console.log('androidLogin.verify', "platformToken:" + body["user_id"]);
                    body["platformToken"] = platformToken;
                    body["user_name"] = jutil.toBase64(body["user_name"]);
                }
                body = JSON.stringify(body);
                response.echo("androidLogin.verify", body);
                console.log(body);
            });
        }).on('error', function(e) {
                console.log("Got error: " + e.message);
            })

        req.end();
    }
}

exports.start = start;