/**
 * user.card 用户卡片队列
 * User: joseppe
 * Date: 14-4-9
 * Time: 下午3:23
 */


var admin = require("../model/admin");
var mail = require("../model/mail");
var jutil = require("../utils/jutil");



function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userModify"], query["country"]) == false) {
        response.echo("user.mail.del", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid") == false) {
        response.echo("user.mail.del", jutil.errorInfo("postError"));
        return;
    }

    var userUid = postData["userUid"];
    var id = postData["id"];
    admin.addOneOperationLog("userInfo",query,postData);
    mail.delMail(userUid, id, function(err, res) {
        response.echo("user.mail.del", {"status":1});
    });
}
exports.start = admin.adminAPIProxy(start);