/**
 * User: liyuluan
 * Date: 14-3-12
 * Time: 下午7:11
 */


function start(postData, response, query) {
    response.writeHead(200, {'Content-Type': 'text/plain', "charset":"utf-8"});
    response.end("1.0.1" + process.pid.toString(), "utf-8");
}

exports.start = start;