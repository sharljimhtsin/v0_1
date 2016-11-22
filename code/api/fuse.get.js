/**
 * 取玩家的融合（口诀） 数据
 * User: liyuluan
 * Date: 13-11-5
 * Time: 上午10:25
 */

var jutil = require("../utils/jutil");
var fuse = require("../model/fuse");


function start(postData, response, query) {
    var userUid = query["userUid"];
    fuse.getFuse(userUid,function(err,res) {
        if (err) response.echo("fuse.get",jutil.errorInfo("dbError"));
        else {
            if (res == null) response.echo("fuse.get",getDefaultFuseData(userUid));
            else response.echo("fuse.get",res);
        }
    });
}

function getDefaultFuseData(userUid) {
    return {"userUid":userUid,
        "hpLevel":0,
        "hpExp":0,
        "attackLevel":0,
        "attackExp":0,
        "defenceLevel":0,
        "defenceExp":0,
        "spiritLevel":0,
        "spiritExp":0
    };
}

exports.start = start;