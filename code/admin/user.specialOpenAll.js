/**
 * user.deleteAll
 * User: joseppe
 * Date: 14-4-9
 * Time: 上午11:59
 */


var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var async = require("async");
var configManager = require("../config/configManager");
var modelUtil = require("../model/modelUtil");
var specialTeam = require("../model/specialTeam");
var hero = require("../model/hero");
var item = require("../model/item");
var mail = require("../model/mail");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userModify"], query["country"]) == false) {
        response.echo("user.specialOpenAll", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid") == false) {
        response.echo("user.specialOpenAll", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("userInfo",query,postData);

    var userUid = postData["userUid"];
    var configData = configManager.createConfig(userUid);
    var positionConfig = configData.getConfig("specialTeam")["position"];
    var list = Object.keys(positionConfig);
    var len1 = list.length-0;//40
    async.series([
        function(cb){
            specialTeam.get(userUid,function(err,res){
                if(err)cb(err);
                else{
                    var len = Object.keys(res).length-0;
                    if(len == len1){//全开了
                        cb();
                    }else{
                        len++;
                        specialTeam.openPosition(userUid, len,cb);
                    }
                }
            });
        }
    ],function(err,res){
        response.echo("user.specialOpenAll", {"status":1});
    });
}
exports.start = admin.adminAPIProxy(start);