/**
 * notice.get
 * User: liyuluan
 * Date: 14-2-8
 * Time: 上午11:08
 */

var jutil = require("../utils/jutil");
var notice = require("../model/notice");

function start(postData, response, query){
    var userUid = query["userUid"];
    notice.getNoticesFromUser(userUid, function(err, res) {
        if (err) response.echo("notice.get", jutil.errorInfo("dbError"));
        else {
            response.echo("notice.get",res);
        }
    });
}
exports.start = start;