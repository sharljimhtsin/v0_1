/**
 * Created by xiayanxin on 2016/5/30.
 */


var admin = require("../model/admin");
var card = require("../model/card");
var jutil = require("../utils/jutil");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userModify"], query["country"]) == false) {
        response.echo("user.card.del", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid") == false) {
        response.echo("user.card.del", jutil.errorInfo("postError"));
        return;
    }
    var userUid = postData["userUid"];
    var cardUid = postData["cardUid"];
    var datas = [];
    admin.addOneOperationLog("userInfo",query,postData);
    card.delCard(userUid,[cardUid], function (err, res) {
        if (err){
            response.echo("user.card.del", {"ERROR":"USER_ERROR","info":err});
        } else if(res == null) {
            response.echo("user.card.del", []);
        } else {
            response.echo("user.card.del", datas);
        }
    });
}
exports.start = admin.adminAPIProxy(start);