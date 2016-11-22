var redis = require("../alien/db/redis");
var platformConfig = require("../../config/platform");

function check(platformUserId, info, callbackFn) {
    if (info == null || info["platformToken"] == null) {
        callbackFn("invalidAccount", 0);
        console.log("android", "invalidAccount1");
        return;
    }

    var country = platformConfig[info["platformId"]]["country"];
    var platformToken = info["platformToken"];

    redis.login(country).s("platformToken:" + platformUserId).get(function(err, res) {
        if (res == platformToken && res != null) {
            callbackFn(null, 1);
            console.log("android", 1);
        } else {
            callbackFn("invalidAccount", 0);
            console.log("android", "invalidAccount2", platformUserId, res, platformToken);
        }
    });

}

exports.check = check