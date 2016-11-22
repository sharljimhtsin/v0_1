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
    if (admin.checkAuth(authorize, ["userView"], query["country"]) == false) {
        response.echo("user.mail.edit", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid") == false) {
        response.echo("user.mail.edit", jutil.errorInfo("postError"));
        return;
    }

    var userUid = postData["userUid"];
    var id = postData["id"];
    admin.addOneOperationLog("userInfo",query,postData);
    mail.updateMail(userUid, id, postData, function(err, res) {
        response.echo("user.mail.edit", {"status":1});
    });
}
exports.start = admin.adminAPIProxy(start);