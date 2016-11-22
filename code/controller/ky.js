/**
 * Created by apple on 14-4-11.
 */

var redis = require("../alien/db/redis");
var platformConfig = require("../../config/platform");

function check(platformUserId, info, callbackFn) {
    callbackFn(null, 1);
    return;
    if (info == null || info["platformToken"] == null) {
        callbackFn("invalidAccount", 0);
        console.log("ky", "invalidAccount1");
        return;
    }

    var country = platformConfig["ky"]["country"];
    var platformToken = info["platformToken"];

    redis.login(country).s("platformToken:" + platformUserId).get(function(err, res) {
        if (res == platformToken && res != null) {
            callbackFn(null, 1);
            console.log("ky", 1);
        } else {
            callbackFn("invalidAccount", 0);
            console.log("ky", "invalidAccount2", platformUserId,res ,platformToken);
        }
    });

}

exports.check = check;