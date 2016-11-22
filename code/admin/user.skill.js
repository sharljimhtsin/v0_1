/**
 * user.skill 用户技能队列
 * User: joseppe
 * Date: 14-4-9
 * Time: 下午2:57
 */


var admin = require("../model/admin");
var skill = require("../model/skill");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");



function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userView"], query["country"]) == false) {
        response.echo("user.skill", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid") == false) {
        response.echo("user.skill", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("userInfo",query,postData);
    var configData = configManager.createConfigFromCountry(query["country"]);

    var skillConfig = configData.getConfig("skill");

    var userUid = postData["userUid"];
    var datas = [];

    skill.getSkill(userUid, function(err, res) {
        if (err || res == null){
            response.echo("user.skill", {"ERROR":"USER_ERROR","info":err});
        } else {
            for(var i in res){
                if(res[i].skillId != 0 && skillConfig[res[i].skillId] != undefined)
                    res[i]["skill"] = skillConfig[res[i].skillId].name;
                datas.push(res[i]);
            }
            response.echo("user.skill", datas);
        }
    });
}
exports.start = admin.adminAPIProxy(start);