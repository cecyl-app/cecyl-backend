SHELL=/bin/sh
APP_FOLDER := app
.PHONY: install build run

install:
	cd ${APP_FOLDER} && npm i

build:
	cd ${APP_FOLDER} && npm run build

run: build
	cd ${APP_FOLDER} && npm start