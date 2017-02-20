/**
 * Created by xiazhengxin on 2017/1/23.
 */

var async = require("async");
var jutil = require("../utils/jutil");
var api = require("../api/upStar.equip.up");
var rs = new Response();
var TAG = "upStar.equip.batchUp";
var DEBUG = true;
var ERR, RES, BODY;

function Response() {
    // nothing
}

Response.prototype.echo = function (tag, data) {
    // nothing
};

function start(postData, response, query) {
    if (jutil.postCheck(postData, "equipmentUid", "type") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    async.whilst(function () {
        return true;
    }, function (wlCb) {
        api.start(postData, rs, query, function (err, res, body) {
            ERR = err;
            if (!ERR) {
                RES = res;
                BODY = body;
            }
            if (DEBUG) {
                console.log(ERR, RES, BODY, "BATCH");
            }
            wlCb(ERR);
        });
    }, function (err, res) {
        if (err) {
            //response.echo(TAG, jutil.errorInfo(ERR));
            response.echo(TAG, BODY);
        } else {
            response.echo(TAG, BODY);
        }
    });
}

exports.start = start;
