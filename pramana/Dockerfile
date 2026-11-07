FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 librsvg2-bin ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production DATA_DIR=/data OPENAI_AGENTS_PYTHON=/usr/bin/python3
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["sh", "-c", "npm run seed:if-empty && npm start"]
