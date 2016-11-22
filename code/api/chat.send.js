/**
 *
 * 发送聊天信息
 * User: liyuluan
 * Date: 14-3-7
 * Time: 下午5:05
 */

var chat = require("../model/chat");
var jutil = require("../utils/jutil");
var itemModel = require("../model/item");
var userVariable = require("../model/userVariable");
var mongoStats = require("../model/mongoStats");
var user = require("../model/user");
var configManager = require("../config/configManager");

function start(postData, response, query) {

    if (jutil.postCheck(postData, "msg", "userName") == false) {
        response.echo("chat.send",jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];
    var configData = configManager.createConfig(userUid);
    var msg = jutil.filterWord2(postData["msg"]);
    var userName = jutil.filterWord(postData["userName"]);

    //if (msg === false) msg = "*";
    if (userName === false) userName = "*";

    msg = jutil.toBase64(msg);
    userName = jutil.toBase64(userName);

    var mItemId = "151301";
    user.getUser(userUid, function(err, res){
        if(err){
            response.echo("chat.send", jutil.errorInfo("dbError"));
        } else {
            userName = res["userName"];
            chat.getGag(userUid, function(err, res){
                if (res != null) {
                    response.echo("chat.send", jutil.errorInfo("gag"));
                } else {
                    itemModel.getItem(userUid, mItemId, function(err, res) {
                        if (err) {
                            response.echo("chat.send", jutil.errorInfo("dbError"));
                        } else {
                            if (res == null || res["number"] <= 0) {
                                response.echo("chat.send", jutil.errorInfo("noItem"));
                            } else {
                                itemModel.updateItem(userUid, mItemId, -1, function(err, res) {
                                    if (err) {
                                        response.echo("chat.send", jutil.errorInfo("dbError"));
                                    } else {
                                        var newItemNumber = res["number"];
                                        var userIP = '127.0.0.1';//response.response.socket.remoteAddress;
                                        mongoStats.expendStats(mItemId, userUid, userIP, null, mongoStats.CHAT, 1);
                                        chat.sendMsg(userUid, userName, msg, function(err, res) {
                                            if (err) {
                                                response.echo("chat.send", jutil.errorInfo("dbError"));
                                            } else {
                                                response.echo("chat.send", {"list":res, "item":newItemNumber});
                                            }
                                        });
                                    }
                                });
                            }
                        }
                    });
                }
            });
        }
    });
}




exports.start = start;