/**
 * user.debris 用户技能碎片
 * User: joseppe
 * Date: 14-4-9
 * Time: 下午3:19
 */


var admin = require("../model/admin");
var debris = require("../model/debris");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");



function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userView"], query["country"]) == false) {
        response.echo("user.debris", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid") == false) {
        response.echo("user.debris", jutil.errorInfo("postError"));
        return;
    }
    var configData = configManager.createConfigFromCountry(query["country"]);
    admin.addOneOperationLog("userInfo",query,postData);
    var skillConfig = configData.getConfig("skill");

    var userUid = postData["userUid"];
    var datas = [];

    debris.getDebrisList(userUid, function(err, res) {
        if (err || res == null){
            response.echo("user.debris", {"ERROR":"USER_ERROR","info":err});
        } else {
            for(var i in res){
                if(res[i].skillId != 0 && skillConfig[res[i].skillId] != undefined)
                    res[i]["skill"] = skillConfig[res[i].skillId].name;
                datas.push(res[i]);
            }
            response.echo("user.debris", datas);
        }
    });
}
exports.start = admin.adminAPIProxy(start);