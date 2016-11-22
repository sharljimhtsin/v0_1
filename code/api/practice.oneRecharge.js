/**
 * Created with JetBrains WebStorm.
 * User: luoxiaobin
 * Date: 14-4-4
 * Time: 下午4:57
 * To change this template use File | Settings | File Templates.
 */

var jutil = require("../utils/jutil");

exports.start = function(postData, response, query){
    response.echo("practice.oneRecharge",  jutil.errorInfo("postError"));
};