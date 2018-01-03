FROM golang:1.9.0-alpine3.6 AS build

RUN apk add --no-cache --virtual git musl-dev

RUN go get github.com/golang/dep/cmd/dep

RUN git clone https://github.com/gohugoio/hugo.git /go/src/github.com/gohugoio/hugo

WORKDIR /go/src/github.com/gohugoio/hugo

RUN dep ensure

RUN go install -ldflags '-s -w'

FROM alpine:3.6

RUN \
  apk add --no-cache \
    dumb-init \
    python \
    python-dev \
    py-pip \
    build-base \
    make && \
    pip install awscli

COPY --from=build /go/bin/hugo /bin/hugo

WORKDIR /site

COPY . /site

ENTRYPOINT ["make"]
