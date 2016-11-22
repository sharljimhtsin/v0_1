<?php
/**
 * Created by PhpStorm.
 * User: xiayanxin
 * Date: 2016/1/7
 * Time: 1:28
 */

//error_reporting(E_ALL);
//ini_set('display_errors', TRUE);
//ini_set('display_startup_errors', TRUE);

$host = "127.0.0.1";
$user = "root";
$password = "";
$db = null;
$port = 3306;
$mysqli = new mysqli($host, $user, $password, $db, $port);
$dbs = array();
$tbs = array();
$mapping = array();
$returnData = "大区,时间,userUid,服,区,行为id,数量\n";
// get POST data
$eventId = $_POST["eventId"] ? $_POST["eventId"] : 0;
$itemId = $_POST["itemId"] ? $_POST["itemId"] : 0;
$userId = $_POST["userId"] ? $_POST["userId"] : 0;
$start = $_POST["sTime"] ? $_POST["sTime"] : 0;
$stop = $_POST["eTime"] ? $_POST["eTime"] : 0;
$eventType = $_POST["eventType"] ? $_POST["eventType"] : 0;
$serverIds = $_POST["serverIds"] ? $_POST["serverIds"] : 0;

$serverIdz = explode(",", $serverIds);
$idMap = array("0" => 25, "1" => 12, "2" => 11, "3" => 9, "4" => 13, "5" => 10, "6" => 8);
foreach ($serverIdz as $server) {
    array_push($dbs, 'WH_' . $idMap[strval($eventType)] . '_dbz_' . $server);
}
if (count($dbs) > 0 && ($start + $stop) > 1 && ($itemId + $eventId + $userId) > 1) {
    ob_start();
    queryStat();
    // 放入文件流
    file_put_contents("php://output", $returnData);
    //文件的类型
    header('Content-type: application/octet-stream');
    //下载显示的名字
    header('Content-Disposition: attachment; filename="data.csv"');
    ob_end_flush();
    exit();
} else {
    die("參數非法");
}

function queryStat()
{
    global $eventId, $itemId, $userId, $start, $stop, $dbs, $tbs, $mapping, $mysqli, $returnData;
    for (; $start <= $stop; $start++) {
        if (strpos($start + "", "32")) {
            $start += 68;
            continue;
        }
        array_push($tbs, "log_" . $start);
    }
    $sqls = array();
    foreach ($dbs as $db) {
        foreach ($tbs as $tb) {
            $sql = "select * from `" . $db . "`.`" . $tb . "` where 1 = 1";
            if ($eventId > 0) {
                $sql .= " and `custom_pra1` = '" . $eventId . "'";
            }
            if ($itemId > 0) {
                $sql .= " and `custom_pra2` = '" . $itemId . "'";
            }
            if ($userId > 0) {
                $sql .= " and `iuid` = '" . $userId . "'";
            }
            array_push($sqls, $sql);
        }
    }

    /* check connection */
    if ($mysqli->connect_errno) {
        die("Connect failed");
    }

    foreach ($sqls as $sql) {
        echo("SQL is " . $sql . "\n");
        /* Select queries return a resultset */
        if ($result = $mysqli->query($sql, MYSQLI_STORE_RESULT)) {
            echo("Select returned " . $result->num_rows . " rows.\n");
            while ($actor = $result->fetch_assoc()) {
                $csv = "";
                $name = "NULL";
                foreach ($mapping as $k => $v) {
                    if (strpos($sql, $k)) {
                        $name = $mapping[$k];
                        break;
                    }
                }
                $csv .= $name . ",";
                $csv .= $actor["timestamp"] . ",";
                $csv .= $actor["iuid"] . ",";
                $csv .= $actor["Platform"] . ",";
                $csv .= $actor["district"] . ",";
                $csv .= $actor["custom_pra1"] . ",";
                $csv .= $actor["custom_pra2"] . ",";
                $csv .= $actor["custom_pra3"] . ",";
                $csv .= $actor["custom_pra4"] . ",";
                $csv .= $actor["custom_pra5"] . ",";
                $csv .= $actor["custom_pra6"] . ",";
                $csv .= $actor["custom_pra7"];
                $csv .= "\n";
                $returnData .= $csv;
            }
            /* free result set */
            $result->free();
            //$result->close();
        }
    }
    $mysqli->close();
}

?>
<html>
<head>
    <title>數據中心查詢工具</title>
</head>
<body>
<center>
    <form method="post" action="">
        事件ID(選填)：<input name="eventId" type="text"/><br/>
        物品ID(選填)：<input name="itemId" type="text"/><br/>
        用戶ID(選填)：<input name="userId" type="text"/><br/>
        開始時間：<input name="sTime" type="text"/><br/>
        結束時間：<input name="eTime" type="text"/><br/>
        分區列表：<textarea name="serverIds" rows="3" cols="20"/>1,2,3,4, ..... 逗號隔開</textarea><br/>
        <select name="eventType">
            <option value="0">事件</option>
            <option value="1">物品掉落</option>
            <option value="2">ingot掉落</option>
            <option value="3">gold掉落</option>
            <option value="4">物品消耗</option>
            <option value="5">ingot消耗</option>
            <option value="6">gold消耗</option>
        </select><br/>
        <button type="submit">查詢</button>
    </form>
</center>
</body>
</html>