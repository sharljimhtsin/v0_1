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
        response.echo("user.skill.del", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid", "skillUid") == false) {
        response.echo("user.skill.del", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("userInfo",query,postData);
    var configData = configManager.createConfigFromCountry(query["country"]);

    var skillConfig = configData.getConfig("skill");

    var userUid = postData["userUid"];
    var datas = [];

    modelUtil.removeRelated(userUid, postData["skillUid"], "skill", function (err, res) {
        if (err) {
            response.echo("user.skill.del", {"ERROR":"USER_ERROR","info":err});
        } else {
            skill.removeSkill(userUid, postData["skillUid"], function (err, res) {
                response.echo("user.skill.del", {"status":1});
            });
        }
    });
}
exports.start = admin.adminAPIProxy(start);