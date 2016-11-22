<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>爱思支付平台登录验证</title>
</head>

<body>

<?php

// 发送https请求
function HttpsPost($url,$data)
{
	$ch = curl_init();
	// 设置选项，包括URL
	curl_setopt($ch, CURLOPT_URL, $url);
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);	// 对证书来源的检查
	curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 1);	// 从证书中检查SSL加密算法是否存在 
	curl_setopt($ch, CURLOPT_USERAGENT, $_SERVER['HTTP_USER_AGENT']);	// 模拟用户使用的浏览器
	curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);	// 使用自动跳转
	curl_setopt($ch, CURLOPT_AUTOREFERER, 1);		// 自动设置Referer
	curl_setopt($ch, CURLOPT_POST, 1);		// 发送一个 常规的Post请求
	curl_setopt($ch, CURLOPT_POSTFIELDS, $data);	// Post提交的数据包
	curl_setopt($ch, CURLOPT_TIMEOUT, 30);		// 设置超时限制防止死循环
	curl_setopt($ch, CURLOPT_HEADER, 0);		// 显示返回的Header区域内容
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1); 	//获取的信息以文件流的形式返回

	$output = curl_exec($ch);	// 执行操作
	if(curl_errno($ch))
	{
		echo "Errno".curl_error($ch); 	// 捕抓异常
	}
	curl_close($ch);	// 关闭CURL
	return $output;
}

$data = array(
	'token'=>'b6ed01d7414945aa81e17cf607b3f5fb',
);
$output = urldecode(json_encode($data));
$result = HttpsPost('https://pay.i4.cn/member_third.action?token=b6ed01d7414945aa81e17cf607b3f5fb', $output);
if($result->errcode)
{
	echo '获取返回信息失败！错误代码：'.$result->errcode.';详细错误信息：'.$result->errmsg.';提交字符串：'.$output;
}
else
{
	$result = json_decode($result);
	if($result->status!=0)
	{
		echo '获取返回信息失败！错误代码：'.$result->status.';提交字符串：'.$output;
	}
	else
	{
		echo 'userid:'.$result->userid;
		echo '<br />';
		echo 'username:'.$result->username;		
	}

}
?>

</body>
</html>