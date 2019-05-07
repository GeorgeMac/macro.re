.PHONY: build
build: spellcheck
	hugo

.PHONY: spellcheck
spellcheck: npm-install
	npm test

npm-install:
	npm install

.PHONY: docker
docker: docker-build
	docker run -v `pwd`:/site georgemac/hugo build

.PHONY: docker-build
docker-build:
	docker build -t georgemac/hugo .
