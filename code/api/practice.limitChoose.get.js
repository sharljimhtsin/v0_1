/**
 * Created with JetBrains WebStorm.
 * 限时礼包api--practice.limitChoose.get
 * User: za
 * Date: 16-5-13
 * Time: 下午13:57
 * To change this template use File | Settings | File Templates.
 */

var user = require("../model/user");
var jutil = require("../utils/jutil");
var async = require("async");
var pLc = require("../model/practiceLimitChoose");
var modelUtil = require("../model/modelUtil");
var item = require("../model/item");
function start(postData, response, query) {
    var userUid = query["userUid"];
    var returnData = {};
    var list = {};
    async.series([
        function(cb){
            pLc.getUserData(userUid, function(err,res){
                if(err)cb(err);
                else if(res["arg"] == undefined){
                    cb(null);
                }else{
                    list = res["arg"];
                    returnData["userData"] = list;
                    cb(null);
                }
            });
        }
    ],function(err,res){
        if(err){
            response.echo("practice.limitChoose.get", jutil.errorInfo(err));
        } else{
            response.echo("practice.limitChoose.get",returnData);
        }
    });
}
exports.start = start;