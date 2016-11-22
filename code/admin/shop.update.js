/**
 * shop.update
 * User: liyuluan
 * Date: 14-3-1
 * Time: 下午6:31
 */


var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["shop"], query["country"]) == false) {
        response.echo("shop.update", admin.AUTH_ERROR);
        return;
    }

    if (jutil.postCheck(postData, "shopUid", "type", "buyPrice", "originPrice", "priceType", "sTime", "eTime", "vip", "count", "itemId", "isActivity", "isReset", "close") == false) {
        response.echo("shop.update", jutil.errorInfo("postError"));
        return;
    }
    var country = query["country"];
    admin.addOneOperationLog("shopM",query,postData);
    var dataObj = {};
    dataObj["type"] = postData["type"];
    dataObj["buyPrice"] = postData["buyPrice"];
    dataObj["originPrice"] = postData["originPrice"];
    dataObj["priceType"] = postData["priceType"];
    dataObj["sTime"] = postData["sTime"];
    dataObj["eTime"] = postData["eTime"];
    dataObj["vip"] = postData["vip"];
    dataObj["count"] = postData["count"];
    dataObj["itemId"] = postData["itemId"];
    dataObj["isActivity"] = postData["isActivity"];
    dataObj["isReset"] = postData["isReset"];
    dataObj["close"] = postData["close"];

    var shopUid = postData["shopUid"];
    var configData = configManager.createConfigFromCountry(country);
    var itemConfig = configData.getConfig("item");

    admin.updateShop(country, shopUid, dataObj, function(err, res) {
        if (err) response.echo("shop.update", jutil.errorInfo("dbError"));
        else {
            for(var i in res){
                res[i]["name"] = '';
                if(itemConfig[res[i]["itemId"]] != undefined)
                    res[i]["name"] = itemConfig[res[i]["itemId"]]["name"];
            }
            var listStr = "[]";
            try {
                listStr = JSON.stringify(res);
            } catch(error) {
                console.error(error.stack);
            }
            response.echoString("shop.update", listStr)
        }
    });
}
exports.start = admin.adminAPIProxy(start);