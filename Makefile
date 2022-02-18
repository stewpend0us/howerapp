.PHONY: all build install clean cert clean-cert

all: build

build: clean
	cp -r src/ build/
	npx spack
	workbox generateSW workbox-config.js

install:
	npm i -D workbox-cli
	npm i -D @swc/cli @swc/core
	npm i -D @types/regenerator-runtime

clean:
	rm -rf build/

cert: clean-cert
	openssl req -x509 -nodes -newkey rsa:4096 -keyout key.pem -out cert.pem -sha256 -days 365 -subj "/C=US/ST=Oregon/L=Portland/O=Company Name/OU=Org/CN=192.168.1.15"

clean-cert:
	rm -f *.pem
