<?php

class init{
	
	//测试用公钥，请替换为对应游戏的公钥，从快用平台上获取的是无格式的公钥，需要转换  
  const public_key = "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC9e4C5KblLjiqYxYfrqhwQjZqWj05+4VJp/q4X9Gnn6ptYrR1s5vGyo1ExSYuYcPoet6fRj9g7NdtkcH8tyrQVTl2dne8GslUtxPmRR2vwRw34Hi/Z4vVHI0cxCMZSQhfLUb0DRrb4IKgM71VpkKkeCahvsD9TMnfvUYrEC7myUQIDAQAB";

	public function verify($post_sign,$post_notify_data,$post_orderid,$post_dealseq,$post_uid,$post_subject,$post_v){

		include('log4php/Logger.php');
		include("Rsa.php");
		
		//初始化log4php
		$log = Logger::getLogger('myLogger');
		$date = date('Y-m-d h:i:s');
		
		Logger::configure(array(
		'rootLogger' => array(
		'appenders' => array('default'),
		'level' => 'DEBUG'
				),
				'appenders' => array(
				'default' => array(
				'class' => 'LoggerAppenderFile',
				'layout' => array(
				'class' => 'LoggerLayoutSimple'
						),
						'params' => array(
						'file' => 'myLog.log',
						'append' => true
						)
				)
				)
		));
		

		if($post_sign==""){
			$log->warn($date." Unable to get required value");
			return "failed";
		}
		
		$publicKey = $this::public_key;
		$post_sign = base64_decode($post_sign);
		
		//对输入参数根据参数名排序，并拼接为key=value&key=value格式；
		$parametersArray = array();
		
		$parametersArray['notify_data'] = $post_notify_data;
		$parametersArray['orderid'] = $post_orderid;
		$parametersArray['dealseq'] = $post_dealseq;
		$parametersArray['uid'] = $post_uid;
		$parametersArray['subject'] = $post_subject;
		$parametersArray['v'] = $post_v;
		
		ksort($parametersArray);
		
		$sourcestr="";
		foreach ($parametersArray as $key => $val) {
		
			$sourcestr==""?$sourcestr=$key."=".$val:$sourcestr.="&".$key."=".$val;
		}
		
		
		$log->info($date." Raw sign is: ".$sourcestr);
		
		//对数据进行验签，注意对公钥做格式转换
		//echo $sourcestr;
		$publicKey = Rsa::instance()->convert_publicKey($publicKey);
		$verify = Rsa::instance()->verify($sourcestr, $post_sign, $publicKey);
		
		$log->info($date." Verification result is ".$verify);
		
		if($verify!=1){
			$log->warn($date." Failed to verify data");
			return "failed";
		}
		
		//对加密的notify_data进行解密
		$post_notify_data_decode = base64_decode($post_notify_data);
		
		$decode_notify_data = Rsa::instance()->publickey_decodeing($post_notify_data_decode, $publicKey);
		
		$log->info($date." Notify data decoded as ".$decode_notify_data);
		
		parse_str($decode_notify_data);
		
		$log->info($date." dealseq: ".$dealseq." fee: ".$fee." payresult: ".$payresult);
		var_dump($post_notify_data_decode);


		//比较解密出的数据中的dealseq和参数中的dealseq是否一致
		if($dealseq==$post_dealseq){
			$log->info($date." Success");
			//TODO：开发商根据dealseq将支付结果记录下来，并根据支付结果做相应处理
			return "success";
		}else{
			$log->warn($date." Dealseq values did not match");
			return "failed";
		}
	}
	
}

?>