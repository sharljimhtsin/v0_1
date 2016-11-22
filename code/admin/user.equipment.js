/**
 * user.equipment 用户装备信息
 * User: joseppe
 * Date: 14-4-24
 * Time: 下午2:43
 */


var admin = require("../model/admin");
var equipment = require("../model/equipment");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var async = require("async");



function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userView"], query["country"]) == false) {
        response.echo("user.equipment", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid") == false) {
        response.echo("user.equipment", jutil.errorInfo("postError"));
        return;
    }
    var configData = configManager.createConfigFromCountry(query["country"]);
    admin.addOneOperationLog("userInfo",query,postData);
    var equipConfig = configData.getConfig("equip");

    var userUid = postData["userUid"];
    var datas = [];

    equipment.getEquipment(userUid, function(err, res) {
        if (err || res == null){
            response.echo("user.equipment", {"ERROR":"USER_ERROR","info":err});
        } else {
            for(var i in res){
                if(res[i].equipmentId != 0 && equipConfig[res[i].equipmentId] != undefined)
                    res[i]["equipment"] = equipConfig[res[i].equipmentId].name;
                datas.push(res[i]);
            }
            response.echo("user.equipment", datas);
        }
    });
}
exports.start = admin.adminAPIProxy(start);