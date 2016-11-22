/**
 * cdkey.newgift
 * User: liyuluan
 * Date: 14-2-10
 * Time: 下午5:21
 */

// 创建新的CDKY礼包
var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var cdkey = require("../model/cdkey");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["sendGift"], query["country"]) == false) {
        response.echo("cdkey.newgift", admin.AUTH_ERROR);
        return;
    }
    admin.addOneOperationLog("cd-key",query,postData);
    if (jutil.postCheck(postData, "platformId", "giftName", "gift", "sTime", "eTime") == false) {
        response.echo("cdkey.newgift", jutil.errorInfo("postError"));
        return;
    }

    var country = query["country"];

    cdkey.addGift(country, postData["platformId"], postData["giftName"], postData["gift"], postData["sTime"], postData["eTime"], function(err, res) {
        if (err) response.echo("cdkey.newgift", jutil.errorInfo("dbError"));
        else {
            cdkey.getGifts(country, function(err, res) {
                if (err) response.echo("cdkey.newgift", jutil.errorInfo("dbError"));
                else {
                    response.echo("cdkey.newgift", res);
                }
            });
        }
    });
}

exports.start = admin.adminAPIProxy(start);