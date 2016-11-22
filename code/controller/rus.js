/**
 * 俄罗斯平台验证类
 * User: joseppe
 * Date: 15-3-12
 * Time: 下午5:12
 */


var post = require("../model/postData");
function check(platformUserId, info, callbackFn) {
    var token = info["sessionId"] == undefined?info["seesion"]:info["sessionId"];
    var uid = platformUserId;
    var sendData = {"m":"api","a":"checktoken","uid":uid,"token":token};
    post.postData("http://de.opogame.com/client/index.php" , sendData ,function(err,res){
        if(res !=null && res == 1){ //验证成功
            callbackFn(null, null);
        }else{
            callbackFn("invalidAccount");
        }
    })
}
exports.check = check;