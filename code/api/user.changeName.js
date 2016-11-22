/**
 * Created with JetBrains WebStorm.
 * User: kongyajie
 * Date: 14-2-13
 * Time: 下午8:09
 * To change this template use File | Settings | File Templates.
 */
var user = require("../model/user");
var itemModel = require("../model/item");
var async = require("async");
var jutil = require("../utils/jutil");
var mongoStats = require("../model/mongoStats");

function start(postData, response, query) {
    if (jutil.postCheck(postData,"newName") == false) {
        response.echo("user.changeName",jutil.errorInfo("postError"));
        return;
    }

    var newName = postData["newName"];
    var userUid = query["userUid"];

    newName = jutil.filterWord(newName);
    if (newName == false) {
        response.echo("user.changeName", jutil.errorInfo("userNameInvalid"));
        return;
    }

    var itemId = 151401;
    var newItemData = null;//道具信息

    async.series([
        function(cb) { //取item
            itemModel.getItem(userUid, itemId, function(err,res) {
                if (err) cb("dbError");
                else if (res == null || res["number"] <= 0) cb("noItem");
                else cb(null);
            });
        },
        function(cb) {//判断用户名是否可用
            user.userNameIsExist(userUid, newName,function(err,res) {
                if (res == 1) {
                    cb("userNameInvalid",null);
                } else {
                    cb(null,null);
                }
            });
        },
        function(cb) {//更改玩家名字
            user.updateUser(userUid,{"userName":newName}, function(err, res) {
                if (err) cb("dbError");
                else cb(null);
            });
        },
        function(cb) { //更新item数量
            itemModel.updateItem(userUid, itemId, -1, function(err, res) {
                if (err) console.error(userUid, itemId, err.stack);
                var userIP = '127.0.0.1';//response.response.socket.remoteAddress;
                mongoStats.expendStats(itemId, userUid, userIP, null, mongoStats.CHAT, 1);
                newItemData = res;
                cb(null);
            });
        }

    ], function(err) {
        if(err){
            response.echo("user.changeName",jutil.errorInfo(err));
        }else{
            response.echo("user.changeName",{"newItemData":newItemData,"result":1});
        }
    });
}

exports.start = start;