<?php
/**
 * Created by PhpStorm.
 * User: xiayanxin
 * Date: 2016/1/7
 * Time: 1:28
 */

$host = "127.0.0.1";
$user = "root";
$password = "dragonball";
$db = null;
$port = 3306;
$mysqli = new mysqli($host, $user, $password, $db, $port);
$dbs = array('WH_13_dbz_9', 'WH_13_dbz_8', 'WH_13_dbz_7', 'WH_13_dbz_6', 'WH_13_dbz_5', 'WH_13_dbz_4', 'WH_13_dbz_37', 'WH_13_dbz_3', 'WH_13_dbz_22', 'WH_13_dbz_21', 'WH_13_dbz_20', 'WH_13_dbz_2', 'WH_13_dbz_19', 'WH_13_dbz_18', 'WH_13_dbz_17', 'WH_13_dbz_16', 'WH_13_dbz_15', 'WH_13_dbz_14', 'WH_13_dbz_13', 'WH_13_dbz_12', 'WH_13_dbz_11', 'WH_13_dbz_10');
$tbs = array('log_20150916');
$mapping = array("WH_25_dbz_105" => "凯英英文xy", "WH_25_dbz_107" => "凯英英文ios新", "WH_25_dbz_110" => "凯茵英文联运", "WH_8_dbz_113" => "凯茵泰文", "WH_10_dbz_113" => "凯茵泰文", "WH_25_dbz_113" => "凯茵泰文", "WH_25_dbz_31" => "kingnet", "WH_25_dbz_32" => "kingnetios", "WH_25_dbz_33" => "kingnetenglish", "WH_25_dbz_34" => "kingnetenglishios", "WH_25_dbz_48" => "凯英联运", "WH_25_dbz_49" => "kingnetenglishoff", "WH_25_dbz_50" => "kingnetenglishiosoff");
$start = 20150811;
$stop = 20150916;

for (; $start <= $stop; $start++) {
    if (strpos($start + "", "32")) {
        $start += 68;
        continue;
    }
    array_push($tbs, "log_" . $start);
}

file_put_contents('table.csv', "大区,时间,userUid,服,区,行为id,数量\n");

$sqls = array();
foreach ($dbs as $db) {
    foreach ($tbs as $tb) {
        //SELECT *  FROM `log_20150821` WHERE `iuid` IN (73031223388,73031221562)
        //SELECT *  FROM `log_20150916` WHERE `custom_pra1` = '1680006' AND `custom_pra2` IN ('151001','152301')
        array_push($sqls, "select * from `" . $db . "`.`" . $tb . "` where `custom_pra1` = '200003'");
    }
}

/* check connection */
if ($mysqli->connect_errno) {
    printf("Connect failed: %s\n", $mysqli->connect_error);
    exit();
}

foreach ($sqls as $sql) {
    printf("SQL is " . $sql . "\n");
    /* Select queries return a resultset */
    if ($result = $mysqli->query($sql, MYSQLI_STORE_RESULT)) {
        printf("Select returned %d rows.\n", $result->num_rows);
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
            file_put_contents('table.csv', $csv, FILE_APPEND);
        }
        /* free result set */
        $result->free();
        //$result->close();
    }
}
$mysqli->close();