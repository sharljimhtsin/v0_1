/**
 * Created with JetBrains WebStorm.
 * 赛亚人图阵api--matrix.saiya 赛亚人图阵模块--图阵批量分解
 * User: za
 * Date: 16-4-8
 * Time: 下午19:51(预计三周)
 * To change this template use File | Settings | File Templates.
 */

var user = require("../model/user");
var jutil = require("../utils/jutil");
var async = require("async");
var mat = require("../model/matrix");
var item = require("../model/item");
var modelUtil = require("../model/modelUtil");
function start(postData, response, query) {
    if (jutil.postCheck(postData) == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var currentConfig;
    var list = {};
    var prismData = {};
    var expItemId = "153678";
    var resolveInBag = {};
    var bagData = [];
    var batchCt = 0;
    var bagList = [];
    var chips = 0;
    async.series([
        function(cb){
            mat.getConfig(userUid,function(err,res){
                if(err)cb(err);
                else{
                    currentConfig = res[2];
                    resolveInBag = currentConfig["resolveInBag"];
                    cb(null);
                }
            });
        },function(cb){
            mat.getUserData(userUid,function(err,res){
                if(err)cb(err);
                else{
                    list = res["arg"];
                    if(list["bag"][0] == undefined){
                        cb("typeError");
                    }else{
                        prismData = list["bag"];
                        for(var xx in prismData){
                            if(resolveInBag[xx] != undefined){
                                batchCt += prismData[xx]["count"] * resolveInBag[xx];
                            }
                        }
                        cb(null);
                    }
                }
            });
        },function(cb){
            async.eachSeries(prismData, function(prism,forCb) {
                bagList.push({"resolveId":prism["id"],"resolveCount":prism["count"]});
                item.updateItem(userUid,prism["id"],-prism["count"],forCb);
            }, function(err, res){
                cb(err, res);
            });
        },function(cb){
            list["bag"] = bagData;
            mat.setUserData(userUid,list,cb);
        },function(cb){//获得碎片
            chips = batchCt + list["chips"]-0;
            bagList.push({"getItemId":expItemId,"getCount":batchCt,"chips":chips});
            item.updateItem(userUid,expItemId,batchCt,cb);
    }],function(err,res){
        if(err){
            response.echo("matrix.bag.batchResolve", jutil.errorInfo(err));
        } else{
            response.echo("matrix.bag.batchResolve",bagList);
        }
    });
}
exports.start = start;