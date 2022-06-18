FROM node:16-alpine

USER root
RUN mkdir /data
WORKDIR /data

ADD . /data
RUN yarn install && \
    chgrp -R 0 /data && \
    chmod -R g+r /data

ENTRYPOINT ["node"]
CMD ["index.js"]

USER 1000
