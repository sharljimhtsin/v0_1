/**
 * 取道具列表
 * User: liyuluan
 * Date: 13-10-29
 * Time: 下午4:59
 */
var item = require("../model/item");
var jutil = require("../utils/jutil");


function start(postData, response, query) {
    var userUid = query["userUid"];
    item.getItems(userUid,function(err,res) {
        if (err) {
            response.echo("item.get",jutil.errorInfo("dbError"));
        } else {
            response.echo("item.get",res);
        }
    });
}

exports.start = start;