/**
 * user.setGag 用户禁言
 * User: joseppe
 * Date: 14-4-14
 * Time: 下午5:19
 */


var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var chat = require("../model/chat");



function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userView"], query["country"]) == false) {
        response.echo("chat.setGag", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "uidArr") == false) {
        response.echo("chat.setGag", jutil.errorInfo("postError"));
        return;
    }
    var isGag = postData["gag"]
    var uidArr = postData["uidArr"];
    var country = query["country"];
    var city = postData["city"];

    var resList = [];
    for(var i in uidArr){
        resList[i] = 1;
        if(isGag){
            chat.gag(uidArr[i], function(err,res){});
        } else {
            chat.ungag(uidArr[i], function(err,res){});
        }
    }
    response.echo("chat.setGag", uidArr);
}
exports.start = admin.adminAPIProxy(start);