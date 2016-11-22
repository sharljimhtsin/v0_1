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
        response.echo("user.mail", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid") == false) {
        response.echo("user.mail", jutil.errorInfo("postError"));
        return;
    }

    var userUid = postData["userUid"];
    admin.addOneOperationLog("userInfo",query,postData);
    mail.getMailList(userUid, function(err, res) {
        if (err){
            response.echo("user.mail", {"ERROR":"USER_ERROR","info":err});
        } else if(res == null) {
            response.echo("user.mail", []);
        } else {
            response.echo("user.mail", res);
        }
    });
}
exports.start = admin.adminAPIProxy(start);