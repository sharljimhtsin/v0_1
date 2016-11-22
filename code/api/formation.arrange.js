/**
 * 重新编队
 * User: liyuluan
 * Date: 13-11-13
 * Time: 上午11:41
 */

var jutil = require("../utils/jutil");
var formation = require("../model/formation");

/**
 * formation.arrange 布阵
 * @param postData order  数组 按顺序排列新编队
 * @param response 成功 返回值为 {result:1}
 * @param query
 */
function start(postData, response, query) {
    if (jutil.postCheck(postData,"order") == false) {
        response.echo("formation.arrange",jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];
    var order = postData["order"];
    if (order instanceof Array === false) {
        response.echo("formation.arrange",jutil.errorInfo("postError"));
        return;
    }
    var order2 = [];
    for (var i = 0; i < order.length; i++) {
        var mData = {"new":i+1,"old":order[i]};
        order2.push(mData);
    }
    formation.arrangeFormation(userUid,order2,function(err,res) {
        if (err) response.echo("formation.arrange",jutil.errorInfo("dbError"));
        else {
            response.echo("formation.arrange",{"result":res});
        }
    });
}

exports.start = start;