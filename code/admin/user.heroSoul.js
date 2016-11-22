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
    if (admin.checkAuth(authorize, ["userView"], query["country"]) == false) {
        response.echo("user.heroSoul", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid") == false) {
        response.echo("user.heroSoul", jutil.errorInfo("postError"));
        return;
    }
    var configData = configManager.createConfigFromCountry(query["country"]);
    admin.addOneOperationLog("userInfo",query,postData);
    var heroConfig = configData.getConfig("hero");

    var userUid = postData["userUid"];
    var datas = [];

    heroSoul.getHeroSoul(userUid, function(err, res) {
        if (err){
            response.echo("user.heroSoul", {"ERROR":"USER_ERROR","info":err});
        } else if(res == null) {
            response.echo("user.heroSoul", []);
        } else {
            for(var i in res){
                if(res[i].heroId != 0 && heroConfig[res[i].heroId] != undefined)
                    res[i]["hero"] = heroConfig[res[i].heroId].name;
                datas.push(res[i]);
            }
            response.echo("user.heroSoul", datas);
        }
    });
}
exports.start = admin.adminAPIProxy(start);