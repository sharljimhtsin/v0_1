/**
 * Created with JetBrains WebStorm.
 * User: luoxiaobin
 * Date: 14-3-24
 * Time: 下午5:59
 * To change this template use File | Settings | File Templates.
 */

var jutil = require("../utils/jutil");

//-----------------------------------------------------------------------------

function start(postData, response, query) {
    response.echo("practice.recharge", jutil.errorInfo("postError"));
}

exports.start = start;
