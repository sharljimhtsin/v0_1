/**
 * activityConfig.update
 * User: liyuluan
 * Date: 14-3-17
 * Time: 上午11:50
 */


var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["shop"], query["country"]) == false) {
        response.echo("activityConfig.update", admin.AUTH_ERROR);
        return;
    }

    if (jutil.postCheck(postData, "city", "activityName", "sTime", "eTime", "name",  "arg", "config") == false) {
        response.echo("activityConfig.update", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("activityM",query,postData);
    var newItem = {};
    newItem["activityName"] = postData["activityName"];
    newItem["sTime"] = postData["sTime"];
    newItem["eTime"] = postData["eTime"];
    newItem["arg"] = postData["arg"];
    newItem["config"] = postData["config"];


    var configVerifyRes = activityConfig.configVerify(postData["name"], newItem["config"]);

    if (configVerifyRes === false) {
        response.echo("activityConfig.update", {"ERROR":"configError","info":"config格式错误"});
        return;
    }

    if (newItem["arg"] != -1 && newItem["arg"] != 0) {
        if (activityConfig.argVerify(postData["name"], newItem["arg"]) == false) {
            response.echo("activityConfig.update", {"ERROR":"configError","info":"服务器没有 " + newItem["arg"] + " 对应的配置"});
            return;
        }
    }

    var city = postData["city"];
    var country = query["country"];
    var mName = postData["name"];
    if(city == 0) city = 1;
    activityConfig.updateConfig(country, city, mName, newItem, function(err, res) {
        if (err) response.echo("activityConfig.update", jutil.errorInfo("dbError"));
        else {
            response.echo("activityConfig.update", res);
        }
    });
}
exports.start = admin.adminAPIProxy(start);