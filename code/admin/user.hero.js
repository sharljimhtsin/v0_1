/**
 * user.hero 用户英雄队列
 * User: joseppe
 * Date: 14-4-9
 * Time: 上午11:59
 */


var admin = require("../model/admin");
var hero = require("../model/hero");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");



function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userView"], query["country"]) == false) {
        response.echo("user.hero", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid") == false) {
        response.echo("user.hero", jutil.errorInfo("postError"));
        return;
    }
    var configData = configManager.createConfigFromCountry(query["country"]);
    admin.addOneOperationLog("userInfo",query,postData);
    var heroConfig = configData.getConfig("hero");
    var userUid = postData["userUid"];

    var datas = [];
    hero.getHero(userUid, function(err, res) {
        if (err || res == null){
            response.echo("user.hero", {"ERROR":"USER_ERROR","info":err});
        } else {
            for(var i in res){
                if(res[i].heroId != 0 && heroConfig[res[i].heroId] != undefined)
                    res[i]["hero"] = heroConfig[res[i].heroId]["name"];
                datas.push(res[i]);
            }
            response.echo("user.hero", datas);
        }
    });
}
exports.start = admin.adminAPIProxy(start);