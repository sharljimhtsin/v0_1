<?php

//header("Content-type: text/html; charset=utf-8");

include('init.php');

$a = '{"sign":"U9CVPT1vvCCCkpaYn9UZ6elJyRDwVnelX+bK32zHQHGiIB+o7VJ5xDWaTmIFyEzQ4Cew5LsjUGTdWFHG1kN0X2g+d4aQh8jxkCYghLL9ARK/qupYzWcoMgQFIt8DGxrh6FQqejCuxVR5yRNiNhmpY+K9GouvQ+uTsUfD/IyhPJI=","uid":"s556bfe6095219","v":"1.0","notify_data":"rCscaH9KOR+B5Y7TMhbzoiNfExGdTMNRcguzeQoANNWrPOATGgB6raj8DmPaKEpL37zNk92GeOzQni54Ig6aZhUoxgEEArspdKZOEBElH35CCm10yjarqH299nu1DTwTkG12xgIZ5B7Ip4v9JY2q/YD93A8YVr61+LpSstBLgk4=","dealseq":"c7ab1cc21789707f59ac58fd21ee763c","subject":"330伊美加币","orderid":"150604863015262385468"}';

$b = json_decode($a, true);

$c = "rCscaH9KOR+B5Y7TMhbzoiNfExGdTMNRcguzeQoANNWrPOATGgB6raj8DmPaKEpL37zNk92GeOzQni54Ig6aZhUoxgEEArspdKZOEBElH35CCm10yjarqH299nu1DTwTkG12xgIZ5B7Ip4v9JY2q/YD93A8YVr61+LpSstBLgk4=";

$init = new init();
echo $init->verify($b['sign'],$b['notify_data'],$b['orderid'],$b['dealseq'],$b['uid'],$b['subject'],$b['v']);


?>