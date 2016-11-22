<?php
require_once(dirname(__FILE__) . '/lib/notify.class.php');

$notify_data = $_SERVER['argv'][1];
$sign = $_SERVER['argv'][2];

$notify = new notify;
$notify_data = $notify->decrypt($notify_data);

if ($notify->verify($notify_data, $sign)) {
    $result = array();
    $result["code"] = "success";
    $result["notify_data"] = json_decode($notify_data, true);
    echo json_encode($result);
}else{
	$result = array();
	$result["code"] = "fail";
	echo json_encode($result);
}
?>
