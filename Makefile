.PHONY: build
build:
	hugo

.PHONY: release
release: build
	ls public

.PHONY: docker-release
docker-release: docker-build
	docker run -v `pwd`:/site georgemac/hugo release 

.PHONY: docker
docker: docker-build
	docker run -v `pwd`:/site georgemac/hugo build

.PHONY: docker-build
docker-build:
	docker build -t georgemac/hugo .
