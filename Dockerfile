FROM node:16-alpine

USER root
ADD . /data

WORKDIR /data
RUN yarn install && \
    yarn cache clean && \
    chgrp -R 0 /data && \
    chmod -R g+r /data

ENTRYPOINT ["node"]
CMD ["index.js"]

USER 1000
