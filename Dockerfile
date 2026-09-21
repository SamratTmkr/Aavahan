FROM node:20-alpine

WORKDIR /app

# Install backend dependencies first so this layer stays cached
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install

# Copy the backend and the frontend, which Express serves as static files
WORKDIR /app
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Uploaded event banners are written here
RUN mkdir -p /app/backend/uploads/events

WORKDIR /app/backend

EXPOSE 3000

CMD ["node", "src/index.js"]
