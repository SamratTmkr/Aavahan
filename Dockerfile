FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install

# Copy application source code and frontend
WORKDIR /app
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Create uploads directory
RUN mkdir -p /app/backend/uploads/events

WORKDIR /app/backend

EXPOSE 3000

CMD ["node", "src/index.js"]

