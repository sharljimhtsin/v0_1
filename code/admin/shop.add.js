/**
 * shop.add
 * User: liyuluan
 * Date: 14-2-25
 * Time: 下午6:37
 */


var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["shop"], query["country"]) == false) {
        response.echo("shop.add", admin.AUTH_ERROR);
        return;
    }

    if (jutil.postCheck(postData, "type", "buyPrice", "originPrice", "priceType", "sTime", "eTime", "vip", "count", "itemId", "isActivity", "isReset", "close") == false) {
        response.echo("shop.add", jutil.errorInfo("postError"));
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
    var configData = configManager.createConfigFromCountry(country);
    var itemConfig = configData.getConfig("item");

    admin.addShop(country, dataObj, function(err, res) {
        if (err) response.echo("shop.add", jutil.errorInfo("dbError"));
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
            response.echoString("shop.add", listStr);
        }
    });


}
exports.start = admin.adminAPIProxy(start);