# Use a multi-stage build for efficiency
# Stage 1: Build React app
FROM node:18 AS build
WORKDIR /app
COPY client ./client
WORKDIR /app/client
RUN npm install && npm run build

# Stage 2: Setup backend with built frontend
FROM node:18
WORKDIR /app
COPY server ./server
WORKDIR /app/server
COPY --from=build /app/client/build ./client/build
RUN npm install

# Expose the server port
EXPOSE 5000
CMD ["npm", "start"]
