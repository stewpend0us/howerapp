.PHONY: all build install clean cert clean-cert serve

all: build serve

build: clean
	cp -r src/ build/
	workbox generateSW workbox-config.js

install:
	sudo npm install workbox-cli --global

clean:
	rm -rf build/

cert: key.pem cert.pem
	
key.pem cert.pem:
	openssl req -x509 -nodes -newkey rsa:4096 -keyout key.pem -out cert.pem -sha256 -days 365 -subj "/C=US/ST=Oregon/L=Portland/O=Company Name/OU=Org/CN=192.168.1.15"

clean-cert:
	rm -f *.pem

