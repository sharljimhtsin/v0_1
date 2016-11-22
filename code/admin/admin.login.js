/**
 * admin.login
 * User: liyuluan
 * Date: 14-1-29
 * Time: 下午3:29
 */


var admin = require("../model/admin");
var jutil = require("../utils/jutil");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "name", "password") == false) {
        response.echo("admin.login",{"ERROR":"请输入用户名或密码"});
        return;
    }
    var mName = postData["name"];
    var mPassword = postData["password"];

    var mCountry = postData["country"];

    admin.loginCheck(mName, mPassword, mCountry, function(err, res) {
        if (err)  response.echo("admin.login",{"ERROR":"用户名或密码错误"});
        else {
            response.echo("admin.login", res);
        }
    });
}
exports.start = start;