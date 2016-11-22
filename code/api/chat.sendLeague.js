/**
 *
 * 发送聊天信息
 * User: liyuluan
 * Date: 14-3-7
 * Time: 下午5:05
 */

var chat = require("../model/chatLeague");
var jutil = require("../utils/jutil");
var itemModel = require("../model/item");
var userVariable = require("../model/userVariable");
var configManager = require("../config/configManager");

function start(postData, response, query) {

    if (jutil.postCheck(postData, "leagueUid", "msg", "userName") == false) {
        response.echo("chat.sendLeague",jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];
    var leagueUid = postData["leagueUid"];
    var msg = jutil.filterWord2(postData["msg"]);
    var userName = jutil.filterWord(postData["userName"]);

    var configData = configManager.createConfig(userUid);
    //if (msg === false) msg = "*";
    if (userName === false) userName = "*";

    msg = jutil.toBase64(msg);
    userName = jutil.toBase64(userName);

    chat.sendMsg(userUid, leagueUid, userName, msg, function(err, res) {
        if (err) {
            response.echo("chat.sendLeague", jutil.errorInfo("dbError"));
        } else {
            response.echo("chat.sendLeague", {"list":res});
        }
    });
}

exports.start = start;