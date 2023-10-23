FROM node:20.8-alpine


ARG JWT_SECRET
ARG DATABASE_URL
ARG PORT
ARG DATABASE_URL_LOCAL

ENV JWT_SECRET=$JWT_SECRET
ENV DATABASE_URL=$DATABASE_URL
ENV PORT=$PORT


WORKDIR /app

COPY . .

RUN npm ci
RUN npm run build
RUN npm prune --omit=dev

#Considering we are using prisma, we need to generate the prisma client and migrate the database

RUN npx prisma generate
RUN npx prisma migrate deploy

ENV DATABASE_URL=$DATABASE_URL_LOCAL
ENV NODE_ENV=production


EXPOSE $PORT

CMD ["npm", "start"]

# now just run docker build -t <name> . and docker run -p 8000:8000 <name>