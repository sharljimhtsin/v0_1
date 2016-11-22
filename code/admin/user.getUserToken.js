/**
 * user.getUserToken
 * User: liyuluan
 * Date: 14-3-31
 * Time: 下午7:19
 */


var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var userToken = require("../model/userToken");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userModify"], query["country"]) == false) {
        response.echo("user.getUserToken", admin.AUTH_ERROR);
        return;
    }

    if (jutil.postCheck(postData, "userUid") == false) {
        response.echo("user.getUserToken", jutil.errorInfo("postError"));
        return;
    }
    var country = query["country"];
    var city = postData["city"];
    var userUid = postData["userUid"];

    userToken.getToken(userUid,function(err,res) {
        if (err) {
            response.echo("user.getUserToken", jutil.errorInfo("dbError"));
        } else {
            response.echo("user.getUserToken", {"token":res});
        }
    });
}


exports.start = admin.adminAPIProxy(start);