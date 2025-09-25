SHELL=/bin/bash
APP_FOLDER := app
APP_PORT ?= 3000
ifeq ($(origin ENV), undefined)
  	ADDITIONAL_COMPOSE_FILES := -f docker-compose.prod.yaml
else ifeq ($(ENV), prod)
	ADDITIONAL_COMPOSE_FILES := -f docker-compose.prod.yaml
else ifeq ($(ENV), prod-debug)
	ADDITIONAL_COMPOSE_FILES := -f docker-compose.prod.yaml -f docker-compose.prod-debug.yaml
else ifeq ($(ENV), dev)
	ADDITIONAL_COMPOSE_FILES := -f docker-compose.devcontainer.yaml
else ifeq ($(ENV), local)
	ADDITIONAL_COMPOSE_FILES :=
endif


.PHONY: install build run-dev test up down clean-data

# executed every time devcontainer is started
install:
	cd ${APP_FOLDER} && npm install --include=dev


# initialize the app with the session key
init:
	mkdir -p app-data
	test ! -f app-data/session-secret-key.key && docker compose -f docker-compose.init.yaml run --user=$$USER --rm --build create-session || \
		echo "Application has already been configured"


# DEV only
build:
	echo "Building..."
	cd ${APP_FOLDER} && npm run build
	echo "Linting..."
	cd ${APP_FOLDER} && npx eslint src/ test/


# DEV only
run-dev: build
	cd ${APP_FOLDER} && NODE_ENV=test npm start


# DEV only
JEST_REGEX ?= .*
# Parameters: \
# JEST_REGEX: regex to select the files to run. Default: .*
test: build
	NODE_ENV=test && cd ${APP_FOLDER} && npx jest --detectOpenHandles "${JEST_REGEX}"


# Parameters: \
# ENV: specifies the environment where it has been deployed (dev|prod|local). Default: prod
# APP_PORT: the port for the webserver (default: 3000)
up:
	APP_PORT=$(APP_PORT) docker compose -f docker-compose.yaml ${ADDITIONAL_COMPOSE_FILES} up -d --build


# Parameters: \
# ENV: specifies the environment where it has been deployed (dev|prod|local). Default: prod
down:
	docker compose -f docker-compose.yaml ${ADDITIONAL_COMPOSE_FILES} down -v


clean-data:
	sudo rm -r db/data
	sudo rm -r app-data