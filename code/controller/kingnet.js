/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-5-13
 * Time: 上午11:09
 * To change this template use File | Settings | File Templates.
 */
var post = require("../model/postData");
function check(platformUserId, info, callbackFn) {
    callbackFn(null, null);
    return;
    var token = info["token"];
    var account = info["username"];
    var sendData = {};
    sendData["token"] = token;
    sendData["account"] = account;
    var queryUrl = "http://www.4game.com.tw/mb/checkuser?token=" + token + "&account=" + account;
    post.postData(queryUrl, sendData, function (err, res) {
        if(res !=null && res["ret"] == 0 && res["is_success"] == 1 && res["msg"]["kingnetid"] == platformUserId){ //验证成功
            callbackFn(null, null);
        }else{
            callbackFn(null, null);
        }
    })
}
exports.check = check;