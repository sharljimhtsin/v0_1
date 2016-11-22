/**
 * 帐号校验类
 * User: liyuluan
 * Date: 13-10-11
 * Time: 上午11:17
 * To change this template use File | Settings | File Templates.
 */

var mysql = require("../alien/db/mysql");
var jutil = require("../utils/jutil");

/**
 * 使用设备号的帐号
 * @param data {"device":"xx"}
 */
function check101(data,callbackFn) {
    var device = data["device"];
    var SQL = 'SELECT * FROM account WHERE device = ' + mysql.escape(device);
    mysql.loginDB().query(SQL,function(err,res) {
        if (err) {
            callbackFn(err,null);
        } else {

            if (res == null || res.length == 0) {
                createAccount101(device,function(err,res) {
                    if (err) {
                        callbackFn(err,null);
                    } else if (res != null && res.length > 0 ) {
                        var data = {};
                        data["platformId"] = 101;
                        data["platformUserId"] = res[0]["id"];
                        callbackFn(null,data);
                    } else {
                        callbackFn(new jutil.JError("帐号创建失败"),null)
                    }
                });
            } else {
                var data = {};
                data["platformId"] = 101;
                data["platformUserId"] = res[0]["id"];
                callbackFn(null,data);
            }
        }
    });
}

/**
 * 为设备号登录玩家创建帐号
 * @param device
 * @param callbackFn
 */
function createAccount101(device,callbackFn) {
    var SQL  = 'INSERT INTO account SET ?';
    var post = {"device":device};
    mysql.loginDB().query(SQL,post,function(err,res) {
        if (err) {
            callbackFn(err,null);
        } else {
            var SQL = 'SELECT * FROM account WHERE device = ' + mysql.escape(device);
            mysql.loginDB().query(SQL,function(err,res) {
                callbackFn(err,res);
            });
        }
    });
}


exports.check101 = check101;



