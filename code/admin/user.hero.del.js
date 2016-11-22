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
var formation = require("../model/formation");


function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userModify"], query["country"]) == false) {
        response.echo("user.hero.del", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid", "heroUid") == false) {
        response.echo("user.hero.del", jutil.errorInfo("postError"));
        return;
    }
    var configData = configManager.createConfigFromCountry(query["country"]);
    admin.addOneOperationLog("userInfo",query,postData);
    var heroConfig = configData.getConfig("hero");

    var userUid = postData["userUid"];
    var heroUid = postData["heroUid"];

    var datas = [];
    formation.getUserFormation(userUid, function(err, res) {
        var candel = true;
        for(var i in res){
            if(res[i].heroUid == heroUid){
                candel = false;
                break;
            }
        }
        if(candel){
            hero.delHero(userUid, [heroUid], function(err, res) {
                response.echo("user.hero.del", {"status":1});
            });
        } else {
            response.echo("user.hero.del", {"ERROR":"USER_ERROR","info":"在编队中，不能删除"});
        }
    });
}
exports.start = admin.adminAPIProxy(start);