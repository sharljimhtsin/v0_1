/**
 * Created by apple on 14-3-28.
 */
var jutil = require("../utils/jutil");
var iosUser = require("../model/iosUser");
var crypto = require("crypto")
var mysql = require("../alien/db/mysql");

/**
 * @param postData
 * @param response
 */

function start(postData, response) {
    response.echo("ios.isShowIAD", {"status":0});
}

exports.start = start;