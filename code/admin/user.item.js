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
    if (admin.checkAuth(authorize, ["userView"], query["country"]) == false) {
        response.echo("user.item", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid") == false) {
        response.echo("user.item", jutil.errorInfo("postError"));
        return;
    }
    var configData = configManager.createConfigFromCountry(query["country"]);
    admin.addOneOperationLog("userInfo",query,postData);
    var itemConfig = configData.getConfig("item");

    var userUid = postData["userUid"];
    var datas = [];

    item.getItems(userUid, function(err, res) {
        if (err || res == null){
            response.echo("user.item", {"ERROR":"USER_ERROR","info":err});
        } else {
            for(var i in res){
                if(res[i].itemId != 0 && itemConfig[res[i].itemId] != undefined)
                    res[i]["item"] = itemConfig[res[i].itemId].name;
                datas.push(res[i]);
            }
            response.echo("user.item", datas);
        }
    });
}
exports.start = admin.adminAPIProxy(start);