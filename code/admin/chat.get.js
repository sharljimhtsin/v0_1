/**
 * chat.get 获取聊天
 * User: joseppe
 * Date: 14-4-14
 * Time: 上午10:38
 */

var admin = require("../model/admin");
var chat = require("../model/chat");
var jutil = require("../utils/jutil");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["login"], query["country"]) == false) {
        response.echo("chat.get", admin.AUTH_ERROR);
        return;
    }

    if (jutil.postCheck(postData, "city") == false) {
        response.echo("chat.get", jutil.errorInfo("postError"));
        return;
    }

    var country = query["country"];
    var city = postData["city"];
    chat.getAllMsgList(country, city, function(err, res) {
        if (err) {
            response.echo("chat.get", jutil.errorInfo("dbError"));
        } else {
            var datas = [];
            for(var i in res)
            {
                var ch = res[i].split('|');
                datas.push({'userUid':ch[0], 'userName':jutil.fromBase64(ch[1]), 'msg':jutil.fromBase64(ch[2])});
            }
            response.echo("chat.get", datas);
        }
    });
}

exports.start = admin.adminAPIProxy(start);