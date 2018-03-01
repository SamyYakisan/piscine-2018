#1/bin/zsh 
ifconfig | grep -w "ether" | cut -d ' ' -f 2 
