/**
 * 获取指点列表
 * User: joseppe
 * Date: 14-12-17
 * Time: 下午17:14
 */
var jutil = require("../utils/jutil");
var teach = require("../model/teach");
var async = require("async");

/**
 * 参数
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    var userUid = query["userUid"];
    teach.getTeachList(userUid, function (err, res) {
        if (err)response.echo("practice.getTeach", jutil.errorInfo(err));
        else {
            var data = res.slice(0, 100);
            response.echo("practice.getTeach", data);
        }
    });
}

exports.start = start;