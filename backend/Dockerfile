FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code
COPY . .

# Expose port
EXPOSE 5000

# Push DB changes (ensure SQLite is ready) and start server
# Using npm run dev or a production script. Assuming npm run dev is fine for now, 
# or preferably a compiled start script if it's TypeScript.
# The project uses ts-node-dev based on earlier logs.
CMD ["sh", "-c", "npx prisma db push && npm run dev"]
