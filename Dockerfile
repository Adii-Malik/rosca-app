# Stage 1: build the React app.
FROM node:20-slim AS build
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
# No REACT_APP_API_URL is set: the bundle then talks to /api on its own origin,
# which is how it is served in production.
RUN npm run build

# Stage 2: the API server, serving the built front-end.
FROM node:20-slim
WORKDIR /app/server
ENV NODE_ENV=production
ENV TZ=Asia/Karachi
# Must match internal_port in fly.toml.
ENV PORT=8080

COPY server/package*.json ./
RUN npm ci --omit=dev

COPY server/ ./
COPY --from=build /app/client/build ./client/build

EXPOSE 8080
CMD ["npm", "start"]
