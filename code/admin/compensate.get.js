/**
 * compensate.get
 * User: liyuluan
 * Date: 14-3-3
 * Time: 下午4:32
 */


var admin = require("../model/admin");
var jutil = require("../utils/jutil");


function start(postData, response, query, authorize) {

    var country = query["country"];
    admin.addOneOperationLog("compensateM",query,postData);
    admin.getCompensate(country, function(err, res) {
        if (err) response.echo("compensate.get", jutil.errorInfo("dbError"));
        else {
            response.echo("compensate.get", res);
        }
    });
}
exports.start = admin.adminAPIProxy(start);