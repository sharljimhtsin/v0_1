/**
 *
 * User: liyuluan
 * Date: 14-3-10
 * Time: 下午7:23
 */


var chat = require("../model/chat");
var jutil = require("../utils/jutil");


function start(postData, response, query) {
    var userUid = query["userUid"];

    chat.getMsgList(userUid,  function(err, res) {
        if (err) {
            response.echo("chat.get", jutil.errorInfo("dbError"));
        } else {
            response.echo("chat.get", {"list":res});
        }
    });
}

exports.start = start;
