SHELL=/bin/sh
APP_FOLDER := app
IS_DEV ?=
ADDITIONAL_COMPOSE_FILES := $(if ${IS_DEV}, -f docker-compose.devcontainer.yaml,)

.PHONY: install build run test up down clean-data


install:
	cd ${APP_FOLDER} && npm i


build:
	cd ${APP_FOLDER} && npm run build


run: build
	cd ${APP_FOLDER} && npm start


JEST_REGEX ?= .*
# Parameters: \
# JEST_REGEX: regex to select the files to run. Default: .*
test: build
	cd ${APP_FOLDER} && npx jest "${JEST_REGEX}"


# Parameters: \
# IS_DEV: is deploy for dev? any non-empty string for "true", leave it blank or do not specify it for "false"
up:
	docker compose -f docker-compose.yaml ${ADDITIONAL_COMPOSE_FILES} up -d


down:
	docker compose -f docker-compose.yaml ${ADDITIONAL_COMPOSE_FILES} down -v


clean-data:
	sudo rm -r db/data