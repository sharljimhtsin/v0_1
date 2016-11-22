/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-4-1
 * Time: 下午3:54
 * To change this template use File | Settings | File Templates.
 */
var admin = require("../model/admin");
function start(postData, response, query, authorize) {
    var uid = query["uid"];
    var country = query["country"];
    var authorizeId = postData["authorizeId"];
    if(authorizeId == 0){
        response.echo("authorize.get", {"authorize":[]});
        return;
    }
    admin.getGroupCompetence(country, authorizeId, function(err, res) {
        if(err){
            response.echo("authorize.get", admin.AUTH_ERROR);
        }else{
            var returnData = [];
            if(res != null){
                returnData = res;
            }
            response.echo("authorize.get", {"authorize":returnData});
        }
    });
}
exports.start = admin.adminAPIProxy(start);