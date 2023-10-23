FROM node:20.8-alpine


ARG JWT_SECRET
ARG DATABASE_URL

ENV JWT_SECRET=$JWT_SECRET
ENV DATABASE_URL=$DATABASE_URL


WORKDIR /app

COPY . .

RUN npm ci
RUN npm run build
RUN npm prune --omit=dev

CMD ["npm", "start"]