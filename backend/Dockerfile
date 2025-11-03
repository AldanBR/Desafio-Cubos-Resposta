FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production

FROM node:20-alpine AS production

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules

COPY . .

ENV PORT=3000
EXPOSE ${PORT}

CMD ["node", "index.js"]
