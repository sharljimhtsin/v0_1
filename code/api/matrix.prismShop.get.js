/**
 * Created with JetBrains WebStorm.
 * 赛亚人图阵api--matrix.saiya.bag 赛亚人图阵模块(图阵)
 * User: za
 * Date: 16-4-8
 * Time: 下午19:51(预计三周)
 * To change this template use File | Settings | File Templates.
 */

var user = require("../model/user");
var jutil = require("../utils/jutil");
var async = require("async");
var mat = require("../model/matrix");
var modelUtil = require("../model/modelUtil");
function start(postData, response, query) {
    var userUid = query["userUid"];
    var currentConfig;
    var returnData = {};
    var prismShop = {};
    var list = {};
    //展示：阵图值，已激活阵图，灵石
    async.series([function(cb){
        mat.getConfig(userUid,function(err,res){
            if(err)cb(err);
            else{
                currentConfig = res[2];
                prismShop = currentConfig["prismShop"];
                cb(null);
            }
        });
    },function(cb){
        mat.getUserData(userUid,function(err,res){
            if(err)cb(err);
            else{
                console.log(Object.keys(res["arg"]["prismShop"]).length <= 0,Object.keys(res["arg"]["prismShop"]).length,"????");
                if(res["arg"] == undefined){
                    cb("dbError");
                }else{
                    list = res["arg"];
                    if(list["prismShop"] == undefined || Object.keys(list["prismShop"]).length <= 0){
                        list["prismShop"] = prismShop;
                        returnData["prismShop"] = list["prismShop"];
                        mat.setUserData(userUid,list,cb);
                    }else{
                        returnData["prismShop"] = list["prismShop"];
                        cb(null);
                    }
                }
            }
        });
    }],function(err,res){
        if(err){
            response.echo("matrix.prismShop.get", jutil.errorInfo(err));
        } else{
            response.echo("matrix.prismShop.get",returnData);
        }
    });
}
exports.start = start;