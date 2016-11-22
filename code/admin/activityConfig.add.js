/**
 * activityConfig.add
 * User: liyuluan
 * Date: 14-3-14
 * Time: 下午4:36
 */


var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var async = require("async");

/**
 * 添加活动
 * @param postData
 * @param response
 * @param query
 * @param authorize
 */
function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["shop"], query["country"]) == false) {
        response.echo("activityConfig.add", admin.AUTH_ERROR);
        return;
    }

    if (jutil.postCheck(postData, "city", "activityName", "sTime", "eTime", "name",  "arg", "config") == false) {
        response.echo("activityConfig.add", jutil.errorInfo("postError"));
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
        response.echo("activityConfig.add", {"ERROR":"configError","info":"config格式错误"});
        return;
    }

    if (newItem["arg"] != -1 && newItem["arg"] != 0) {
        if (activityConfig.argVerify(postData["name"], newItem["arg"]) == false) {
            response.echo("activityConfig.add", {"ERROR":"configError","info":"服务器没有 " + newItem["arg"] + " 对应的配置"});
            return;
        }
    }


    var city = postData["city"];
    var country = query["country"];
    var cityList = null;
    if (city == 0) {
        cityList = admin.getCountryCityList(country);
    } else {
        cityList = [city];
    }

    var resList = {};
    async.forEach(cityList, function(cityValue, forCb) {
        activityConfig.addConfig(country, cityValue, newItem, function(err, res) {
            if (err) forCb("dbError");
            else {
                resList[cityValue] = 1;
                forCb(null);
            }
        });
    }, function(err, res) {
        response.echo("activityConfig.add", resList);
    });
}

exports.start = admin.adminAPIProxy(start);