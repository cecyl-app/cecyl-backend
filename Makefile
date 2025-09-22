SHELL=/bin/bash
APP_FOLDER := app
IS_DEV ?=
ADDITIONAL_COMPOSE_FILES := $(if ${IS_DEV}, -f docker-compose.devcontainer.yaml,)
APP_PORT ?= 3000

.PHONY: install build run test up down clean-data

# executed every time devcontainer is started
install:
	cd ${APP_FOLDER} && npm install --include=dev


# initialize the app with the session key
init:
	mkdir -p app-data
	test ! -d app-data -o ! -f app-data/session-secret-key.key && docker compose -f docker-compose.init.yaml run --rm --build create-session


# DEV only
build:
	echo "Building..."
	cd ${APP_FOLDER} && npm run build
	echo "Linting..."
	cd ${APP_FOLDER} && npx eslint src/ test/


# DEV only
run: build
	cd ${APP_FOLDER} && npm start


# DEV only
JEST_REGEX ?= .*
# Parameters: \
# JEST_REGEX: regex to select the files to run. Default: .*
test: build
	NODE_ENV=test && cd ${APP_FOLDER} && npx jest --detectOpenHandles "${JEST_REGEX}"


# Parameters: \
# IS_DEV: is deploy for dev? any non-empty string for "true", leave it blank or do not specify it for "false" \
# APP_PORT: the port for the webserver (default: 3000)
up:
	APP_PORT=$(APP_PORT) docker compose -f docker-compose.yaml ${ADDITIONAL_COMPOSE_FILES} up -d --build


down:
	docker compose -f docker-compose.yaml ${ADDITIONAL_COMPOSE_FILES} down -v


clean-data:
	sudo rm -r db/data
	sudo rm -r app-data