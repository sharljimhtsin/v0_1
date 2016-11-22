<?php
require_once(dirname(__FILE__) . '/Rsa.php');

$publicKey = $_SERVER['argv'][1];
$notify_data = $_SERVER['argv'][2];

$publicKey = Rsa::instance()->convert_publicKey($publicKey);
$post_notify_data_decode = base64_decode($notify_data);

$decode_notify_data = Rsa::instance()->publickey_decodeing($post_notify_data_decode, $publicKey);

parse_str($decode_notify_data, $decode_notify_data);
//echo $decode_notify_data;

echo json_encode($decode_notify_data);
