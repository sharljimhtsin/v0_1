/**
 * user.skill 用户技能队列
 * User: joseppe
 * Date: 14-4-9
 * Time: 下午2:57
 */


var admin = require("../model/admin");
var skill = require("../model/skill");
var jutil = require("../utils/jutil");
var modelUtil = require("../model/modelUtil");
var configManager = require("../config/configManager");



function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userModify"], query["country"]) == false) {
        response.echo("user.skill.edit", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid", "skillUid") == false) {
        response.echo("user.skill.edit", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("userInfo",query,postData);
    var configData = configManager.createConfigFromCountry(query["country"]);

    var skillConfig = configData.getConfig("skill");

    var userUid = postData["userUid"];

    delete postData["skill"];
    var datas = [];

    skill.updateSkill(userUid, postData["skillUid"], postData, function (err, res) {
        response.echo("user.skill.edit", {"status":1});
    });
}
exports.start = admin.adminAPIProxy(start);