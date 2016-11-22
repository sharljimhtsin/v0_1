
/**
 * cdkey.getgifts
 * User: liyuluan
 * Date: 14-2-10
 * Time: 下午5:21
 */

// 创建新的CDKY礼包
var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var cdkey = require("../model/cdkey");

function start(postData, response, query, authorize) {

    var country = query["country"];
    admin.addOneOperationLog("cd-key",query,postData);
    cdkey.getGifts(country, function(err, res) {
        if (err) response.echo("cdkey.getgifts", jutil.errorInfo("dbError"));
        else {
            response.echo("cdkey.getgifts", res);
        }
    });
}

exports.start = admin.adminAPIProxy(start);
