/**
 *
 * User: liyuluan
 * Date: 14-3-10
 * Time: 下午7:23
 */


var chatLeague = require("../model/chatLeague");
var jutil = require("../utils/jutil");


function start(postData, response, query) {
    if (jutil.postCheck(postData, "leagueUid") == false) {
        response.echo("chat.getLeague",jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];
    var leagueUid = postData["leagueUid"];

    chatLeague.getMsgList(userUid, leagueUid, function(err, res) {
        if (err) {
            response.echo("chat.getLeague", jutil.errorInfo("dbError"));
        } else {
            response.echo("chat.getLeague", {"list":res});
        }
    });
}

exports.start = start;
