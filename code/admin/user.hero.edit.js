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
    if (admin.checkAuth(authorize, ["userModify"], query["country"]) == false) {
        response.echo("user.hero.edit", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid", "heroUid") == false) {
        response.echo("user.hero.edit", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("userInfo",query,postData);

    var userUid = postData["userUid"];
    var heroUid = postData["heroUid"];

    delete postData["hero"];
    for(var i in postData){
        postData[i] = postData[i] - 0;
    }
    hero.updateHero(userUid, heroUid, postData, function(err, res) {
        response.echo("user.hero.edit", {"status":1});
    });
}
exports.start = admin.adminAPIProxy(start);