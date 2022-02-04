.PHONY: install sw clean

sw: clean
	workbox generateSW workbox-config.js

install:
	npm install workbox-cli

clean:
	rm build/sw.js* build/workbox*.js*
