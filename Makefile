SHELL=/bin/sh
.PHONY: install build

install:
	cd app && npm install

build:
	cd app && npm run build