/**
 * user.equipment 用户装备信息
 * User: joseppe
 * Date: 14-4-24
 * Time: 下午2:43
 */


var admin = require("../model/admin");
var equipment = require("../model/equipment");
var jutil = require("../utils/jutil");
var modelUtil = require("../model/modelUtil");
var configManager = require("../config/configManager");


function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userModify"], query["country"]) == false) {
        response.echo("user.equipment.del", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid", "equipmentUid") == false) {
        response.echo("user.equipment.del", jutil.errorInfo("postError"));
        return;
    }
    var configData = configManager.createConfigFromCountry(query["country"]);
    admin.addOneOperationLog("userInfo",query,postData);
    var equipConfig = configData.getConfig("equip");

    var userUid = postData["userUid"];
    var equipmentUid = postData["equipmentUid"];

    var datas = [];
    modelUtil.removeRelated(userUid, equipmentUid, "equip", function (err, res) {
        if (err) {
            response.echo("user.equipment.del", {"ERROR":"USER_ERROR","info":err});
        } else {
            equipment.removeEquipment(userUid, [equipmentUid], function (err, res) {
                response.echo("user.equipment.del", {"status":1});
            });
        }
    });
}
exports.start = admin.adminAPIProxy(start);