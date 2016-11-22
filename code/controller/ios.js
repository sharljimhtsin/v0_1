/**
 * Created by Raul on 2/11/14.
 */

var jutil = require("../utils/jutil");
var iosUser = require("../model/iosUser");
var crypto = require("crypto")
var mysql = require("../alien/db/mysql");
var platformConfig = require("../../config/platform");

/**
 * @param platformUserId
 * @param info
 * @param callbackFn
 */

function check(platformUserId, info, callbackFn) {
    if (jutil.postCheck(info,"username","password") == false) {
        callbackFn("invalidAccount")
    }
    var platformId = info["platformId"] == undefined?"ios":info["platformId"];

    var mCountry = platformConfig[platformId]["country"];

    var username = info['username'];
    var password = crypto.createHash('md5').update(info['password']).digest('hex');
    var mDB = mysql.iosDB(mCountry);
    iosUser.getUser(mDB, username, password, function(err, res) {
        if(err)
            callbackFn(err);
        else
            callbackFn(null, 1);
    })
}

exports.check = check;