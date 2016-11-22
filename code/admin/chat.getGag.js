/**
 * user.getGag 获取禁言列表
 * User: joseppe
 * Date: 14-4-15
 * Time: 下午4:46
 */


var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var chat = require("../model/chat");



function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userView"], query["country"]) == false) {
        response.echo("chat.getGag", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "city") == false) {
        response.echo("chat.getGag", jutil.errorInfo("postError"));
        return;
    }
    var country = query["country"];
    var city = postData["city"];

    chat.getGagList(country, city, function(err,res){
        var data = [];
        for(var userUid in res){
            data.push({'userUid':userUid});
        }
        response.echo("chat.getGag", data);
    });
}
exports.start = admin.adminAPIProxy(start);