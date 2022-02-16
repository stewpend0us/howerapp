.PHONY: install sw clean cert clean-cert all

all: sw
	git add build/sw.js build/js/main.js build/index.html build/css/style.css

sw: clean
	workbox generateSW workbox-config.js

install:
	npm install workbox-cli

clean:
	rm build/sw.js* build/workbox*.js*

cert: clean-cert
	openssl req -x509 -nodes -newkey rsa:4096 -keyout key.pem -out cert.pem -sha256 -days 365 -subj "/C=US/ST=Oregon/L=Portland/O=Company Name/OU=Org/CN=192.168.1.15"

clean-cert:
	rm -f *.pem
