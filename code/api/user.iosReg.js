/**
 * Created by Raul on 2/12/14.
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
    if(jutil.postCheck(postData, "username", "password") == false) {
        response.echo("user.iosReg",jutil.errorInfo("postError"));
        return;
    }

    var username = postData['username'];
    var password = crypto.createHash('md5').update(postData['password']).digest('hex');

    var platform = "ios";
    if(postData['platformId']!=undefined && postData['platformId']!=""){
        platform = postData['platformId'];
    }

    var mCountry = platformConfig[platform]["country"];

    var mDB = mysql.iosDB(mCountry);
    iosUser.checkUserExists(mDB, username, function(err, res) {
        if(err) {
            response.echo("user.iosReg", err);
            return;
        }

        if(res == 0) {
            iosUser.createUser(mDB, username, password, function(err, res) {
                if(err)
                    response.echo("user.iosReg", err);
                else
                    if(mCountry=="j"){// 泰国平台
                        var info = {};
                        info["username"] = username;
                        info["password"] = password;
                        info["platformId"] = platform;
                        var regFn = require("../controller/thaireg");
                        regFn.reg(info,function(err,res){
                        });
                    }
                response.echo("user.iosReg", {"uid": res['insertId']});
            })
        } else {
            response.echo("user.iosReg", jutil.errorInfo("userNameInvalid"));
        }
    });



}

exports.start = start;