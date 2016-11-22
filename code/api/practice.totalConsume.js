/**
 * Created with JetBrains WebStorm.
 * User: luoxiaobin
 * Date: 14-3-26
 * Time: 下午3:20
 * To change this template use File | Settings | File Templates.
 */

var jutil = require("../utils/jutil");

//-----------------------------------------------------------------------------

function start(postData, response, query) {
    response.echo("practice.totalConsume", jutil.errorInfo("postError"));
}

exports.start = start;
