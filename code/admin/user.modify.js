/**
 * 修改用户的基本信息
 * user.modify
 * User: liyuluan
 * Date: 14-1-29
 * Time: 下午1:11
 */


var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var user = require("../model/user");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userModify"], query["country"]) == false) {
        response.echo("user.modify", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid", "userData") == false) {
        response.echo("user.modify", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("userInfo", query, postData);
    var userUid = postData["userUid"];
    var userData = postData["userData"];
    var mCountry = query["country"];
    delete userData["momentum"];
    user.updateUser(userUid, userData, function(err, res) {
        if (err) response.echo("user.modify", {"ERROR":"用户数据更改出错"});
        else {
            response.echo("user.modify", {"result":1});
        }
    });
}
exports.start = admin.adminAPIProxy(start);