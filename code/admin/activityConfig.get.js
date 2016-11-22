/**
 * activityConfig.get
 * User: liyuluan
 * Date: 14-3-13
 * Time: 下午4:54
 */


var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");


function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["login"], query["country"]) == false) {
        response.echo("activityConfig.get", admin.AUTH_ERROR);
        return;
    }

    if (jutil.postCheck(postData, "city") == false) {
        response.echo("activityConfig.get", jutil.errorInfo("postError"));
        return;
    }

    admin.addOneOperationLog("activityM",query,postData);
    var country = query["country"];
    var city = postData["city"];

    activityConfig.getAllConfigByCC(country, city, function(err, res) {
        if (err) response.echo("activityConfig.get", jutil.errorInfo("dbError"));
        else {
            response.echo("activityConfig.get", res);
        }
    });
}
exports.start = admin.adminAPIProxy(start);