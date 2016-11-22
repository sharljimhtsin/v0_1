/**
 * user.item 用户道具队列
 * User: joseppe
 * Date: 14-4-9
 * Time: 下午2:07
 */


var admin = require("../model/admin");
var item = require("../model/item");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");



function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userModify"], query["country"]) == false) {
        response.echo("user.item.edit", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid", "itemId") == false) {
        response.echo("user.item.edit", jutil.errorInfo("postError"));
        return;
    }
    var configData = configManager.createConfigFromCountry(query["country"]);
    admin.addOneOperationLog("userInfo",query,postData);
    var itemConfig = configData.getConfig("item");

    var userUid = postData["userUid"];
    var itemId = postData["itemId"];

    var datas = [];

    item.getItem(userUid, itemId, function(err, res) {
        var number = 0;
        if (res == null && postData["number"] >= 0){
            number = postData["number"];
        } else {
            number = postData["number"] - res["number"];
        }
        item.updateItem(userUid, itemId, number, function(err, res) {
            response.echo("user.item.edit", {"status":1});
        });
    });
}
exports.start = admin.adminAPIProxy(start);