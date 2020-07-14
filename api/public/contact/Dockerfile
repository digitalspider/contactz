FROM node:14.5.0-alpine3.12
WORKDIR /app
COPY package.json .
RUN npm install --quiet
COPY index.js .
COPY ./code ./code
ENV APP_PORT 3000
EXPOSE 3000
CMD ["npm", "run", "start:prod"]