/**
 * 标记新手引导结束
 * guide.end
 * User: liyuluan
 * Date: 14-1-24
 * Time: 下午4:59
 */

var user = require("../model/user");
var jutil = require("../utils/jutil");

function start(postData, response, query) {
    var userUid = query["userUid"];

    user.updateUser(userUid, {"status":2}, function(err, res) {
        if (err) response.echo("guide.end", {"result":0});
        else {
            response.echo("guide.end", {"result":1});
        }
    });
}

exports.start = start;