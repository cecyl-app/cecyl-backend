SHELL=/bin/sh
APP_FOLDER := app
JEST_REGEX ?= .*

.PHONY: install build run test

install:
	cd ${APP_FOLDER} && npm i

build:
	cd ${APP_FOLDER} && npm run build

run: build
	cd ${APP_FOLDER} && npm start

# Parameters: \
# JEST_REGEX: regex to select the files to run. Default: .*
test: build
	cd ${APP_FOLDER} && npx jest "${JEST_REGEX}"