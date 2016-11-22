/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-5-12
 * Time: 下午6:26
 * 凯英账户登陆器
 * To change this template use File | Settings | File Templates.
 */
var https = require("https");
var urlParse = require("url").parse;
var async = require("async");
var jutil = require("../utils/jutil");
var post = require("../model/postData");
function start(postData, response, query) {
    if (postData == null) {
        postData = {};
    }

    console.log("进入kingnet.login");
    var userName = postData["userName"]; //如果是凯英用户则是用户名  如果是fb用户是用户id
    var passWord = postData["pw"];//如果是凯英用户则是密码  如果是fb用户是“”
    var rid = postData["rid"]; //用户来源
    var isLogin = postData["isLogin"];
    var currPlayerId = postData["currPlayerId"] ? postData["currPlayerId"] : -1;//当前应用的fb玩家id
    var token = "";
    var returnData = {};
    async.series([
        function (cb) {//获取token
            var sendData = {};
            sendData["account"] = userName;
            sendData["secret"] = "Xd0LKeu7XIqlY3UCplTafeHYVdzQG9He_7BhQoxFdRbsEBdQW0ihIYomFh7OlBWdXHc3vo3sJd4";
            var queryUrl = "http://www.4game.com.tw/mb/getAccessToken?account=" + sendData["account"] + "&secret=" + sendData["secret"];
            post.postData(queryUrl, sendData, function (err, res) {
                if (err) cb(err, null);
                else {
                    if (res["is_success"] == 1 && res["ret"] == 0 && res["msg"]["token"] != null) {//请求成功
                        token = res["msg"]["token"];
                        returnData["token"] = token;
                        cb(null, null);
                    } else {
                        console.log("kingnet..............." + JSON.stringify(res));
                        cb(res["msg"], null);
                    }
                }
            });
        },
        function (cb) {//登录，或者注册 返回kingnetId
            var data = {};
            data["rid"] = rid;
            data["account"] = userName;
            data["password"] = passWord;
            data["token"] = token;
            data["currid"] = currPlayerId;
            console.log("login:data: " + JSON.stringify(data));
            var url = isLogin == 1 ? "http://www.4game.com.tw/mb/login" : "http://www.4game.com.tw/mb/register";
            post.postData(url, data, function (err, res) {
                if (err) cb(err, null);
                else {
                    if (res["is_success"] == 1 && res["ret"] == 0 && res["msg"]["kingnetid"] != null) {//请求成功
                        returnData["kingnetid"] = res["msg"]["kingnetid"];
                        if (res["msg"].hasOwnProperty("fbid")) {
                            returnData["fbid"] = res["msg"]["fbid"];
                        }
                        cb(null, null);
                    } else {
                        console.log("kingnet..............." + JSON.stringify(res));
                        cb(res["msg"], null);
                    }
                }
            })
        }
    ], function (err, res) {
        if (err) {
            response.echo("kingnet.login", {"ERROR": "error", "info": jutil.toBase64(err)});
        } else {
            console.log("returnData: " + JSON.stringify(returnData));
            response.echo("kingnet.login", returnData);
        }
    });
}
exports.start = start;