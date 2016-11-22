/**
 * CDKEY 生成
 * User: liyuluan
 * Date: 14-2-10
 * Time: 下午5:21
 */

var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var cdkey = require("../model/cdkey");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["sendGift"], query["country"]) == false) {
        response.echo("cdkey.generate", admin.AUTH_ERROR);
        return;
    }

    if (jutil.postCheck(postData, "giftID", "count") == false) {
        response.echo("cdkey.generate", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("cd-key",query,postData);
    var country = query["country"];
    var giftID = postData["giftID"];
    var count = postData["count"];

    setTimeout(function(){
        cdkey.addKeys(country, giftID, count, null);
    },10)

    response.echo("cdkey.generate", "ok");
}

exports.start = admin.adminAPIProxy(start);