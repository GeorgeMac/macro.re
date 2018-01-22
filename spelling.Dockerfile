FROM node:latest

ADD . /repo

WORKDIR /repo

RUN yarn install

CMD ["yarn", "test"]
