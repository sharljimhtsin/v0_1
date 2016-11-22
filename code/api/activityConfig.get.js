/**
 *
 * User: liyuluan
 * Date: 14-2-17
 * Time: 下午6:11
 */


var activityConfig = require("../model/activityConfig");
var jutil = require("../utils/jutil");

function start(postData, response, query) {
    var userUid = query["userUid"];

    activityConfig.getAllConfig(userUid, function(err, res) {
        if (err) response.echo("activityConfig.get",jutil.errorInfo("dbError"));
        else {
            response.echo("activityConfig.get", res);

        }
    });
}

exports.start = start;