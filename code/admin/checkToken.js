/**
 * TOKEN校验类。对需要身份验证的方法进行校验
 *
 * http://127.0.0.1:8900/admin?method=server.list&uid=1&country=a&pw=dbzgob&dPW=nodejs
 *
 * User: liyuluan
 * Date: 13-10-10
 * Time: 下午2:37
 */

var TOKEN_INVALID = '{"tokenCheck":{"ERROR":"tokenInvalid","info":"会活无效或过期"}}';
var IP_INVALID = '{"tokenCheck":{"ERROR":"ipInvalid","info":"该IP地址不允许访问"}}';
var allow_dPW = true; //是否开启 develop密码

var whileList = ["127.0.0.1", "172.24"];

var adminModel = require("../model/admin");

function check(queryMethod, postData, query, request, callbackFn) {
    var ip = request.headers['x-forwarded-for'] ||
        request.connection.remoteAddress ||
        request.socket.remoteAddress || "127.0.0.1";
    var allow = true;
    for(var i in whileList){
        if(ip.indexOf(whileList[i]) != -1){
            allow = true;
        }
    }
    if(!allow){
        callbackFn("ERROR",IP_INVALID);
        return ;
    }
    if (queryMethod == "admin.login") {
        callbackFn(null,true);
        return;
    }
    var uid = query["uid"];
    var pw = query["pw"];
    var country = query["country"];
    var dPW = query["dPW"];
    var gmPW = query["gmPW"];

    //必须传入dPW 或 gmPW否则直接
    if ((allow_dPW == true && dPW == "nodejs") || gmPW == "C9DA987779C51F22") {
        adminModel.checkUser(country, uid, pw, function(err, res) {
            if (err) callbackFn("ERROR", TOKEN_INVALID);
            else {
                callbackFn(null, true);
            }
        });
    } else {
        callbackFn("ERROR",TOKEN_INVALID);
    }
}

exports.check = check;