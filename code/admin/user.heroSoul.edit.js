/**
 * user.heroSoul 用户英雄魂魄队列
 * User: joseppe
 * Date: 14-4-9
 * Time: 下午3:00
 */


var admin = require("../model/admin");
var heroSoul = require("../model/heroSoul");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");



function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userModify"], query["country"]) == false) {
        response.echo("user.heroSoul.edit", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid", "heroId") == false) {
        response.echo("user.heroSoul.edit", jutil.errorInfo("postError"));
        return;
    }
    var configData = configManager.createConfigFromCountry(query["country"]);
    admin.addOneOperationLog("userInfo",query,postData);
    var heroConfig = configData.getConfig("hero");

    var userUid = postData["userUid"];
    var datas = [];

    heroSoul.getHeroSoulItem(userUid, postData["heroId"], function(err, res) {
        var count = 0;
        if (res == null && postData["count"] >= 0){
            count = postData["count"];
        } else {
            count = postData["count"] - res["count"];
        }
        heroSoul.addHeroSoul(userUid, postData["heroId"], count, function(err, res) {
            response.echo("user.heroSoul.edit", {"status":1});
        });
    });
}
exports.start = admin.adminAPIProxy(start);