/**
 * Created by apple on 14-3-27.
 */
var jutil = require("../utils/jutil");
var iosUser = require("../model/iosUser");
var crypto = require("crypto")
var mysql = require("../alien/db/mysql");
var platformConfig = require("../../config/platform");

/**
 * @param postData
 * @param response
 */

function start(postData, response) {
    if(jutil.postCheck(postData, "userName", "password", "newPassword") == false) {
        response.echo("user.iosReg",jutil.errorInfo("postError"));
        return;
    }

    var username = postData['userName'];
    var password = crypto.createHash('md5').update(postData['password']).digest('hex');
    var newPassword = crypto.createHash('md5').update(postData['newPassword']).digest('hex');

    var mCountry = platformConfig["ios"]["country"];

    var mDB = mysql.iosDB(mCountry);
    iosUser.getUser(mDB, username, password, function(err, res) {
        if(err) {
            response.echo("user.changePassword", jutil.errorInfo(err));
            return;
        }

        if(res != 0) {
            iosUser.changePassword(mDB, username, newPassword,function(err, res){
                if (err) {
                    response.echo("user.changePassword", jutil.errorInfo("dbError"));
                    return;
                }
                response.echo("user.changePassword",{"status":1})
            })
        } else {
            response.echo("user.changePassword", jutil.errorInfo("accountInvalid"));
        }
    });



}

exports.start = start;