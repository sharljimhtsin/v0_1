/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-4-15
 * Time: 下午7:34
 * To change this template use File | Settings | File Templates.
 */
/**
 * activityConfig.update
 * User: liyuluan
 * Date: 14-3-17
 * Time: 上午11:50
 */

var async = require("async");
var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["shop"], query["country"]) == false) {
        response.echo("activityConfig.coby", admin.AUTH_ERROR);
        return;
    }

    if (jutil.postCheck(postData, "cityList", "activityName", "sTime", "eTime", "name",  "arg", "config") == false) {
        response.echo("activityConfig.coby", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("activityM",query,postData);
    var newItem = {};
    newItem["activityName"] = postData["activityName"];
    newItem["sTime"] = postData["sTime"];
    newItem["eTime"] = postData["eTime"];
    newItem["name"] = postData["name"];
    newItem["arg"] = postData["arg"];
    newItem["config"] = postData["config"];

    var configVerifyRes = activityConfig.configVerify(newItem["name"], newItem["config"]);

    if (configVerifyRes === false) {
        response.echo("activityConfig.coby", {"ERROR":"configError","info":"config格式错误"});
        return;
    }

    if (newItem["arg"] != -1 && newItem["arg"] != 0) {
        if (activityConfig.argVerify(postData["name"], newItem["arg"]) == false) {
            response.echo("activityConfig.coby", {"ERROR":"configError","info":"服务器没有 " + newItem["arg"] + " 对应的配置"});
            return;
        }
    }


    var cityL = postData["cityList"];
    var country = query["country"];
    async.forEach(cityL,function(item,cb){
        activityConfig.addConfig(country, item, newItem, function(err, res) {
            if(err) cb(err,null);
            else{
                cb(null,null);
            }
        });
    },function(err,res){
        if (err) response.echo("activityConfig.coby", jutil.errorInfo("dbError"));
        else {
            response.echo("activityConfig.coby", []);
        }
    })
}
exports.start = admin.adminAPIProxy(start);