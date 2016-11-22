<?php
require 'class_desc.php';

$data = $_SERVER['argv'][1];

$data = json_decode($data, true);

if(empty($data)){
    echo 'fail';
	exit;
}

$des = new DES();
echo $des->decrypt($data);
