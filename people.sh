ldapsearch -QLLL "(uid=z*)" cn | grep "cn" | sort -drf | cut -c 5-

