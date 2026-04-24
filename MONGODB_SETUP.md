# MongoDB Connection Setup Guide

## Issue Identified
The MongoDB connection is failing with: `querySrv ECONNREFUSED _mongodb._tcp.project-midterm.fatysru.mongodb.net`

This indicates a DNS resolution failure - the MongoDB Atlas cluster hostname cannot be resolved.

## Solutions (Choose ONE)

### Option 1: Install MongoDB Locally (Recommended)
1. Install MongoDB Community Server:
   - Windows: Download from https://www.mongodb.com/try/download/community
   - Run the installer and choose "Complete" setup
2. Start MongoDB service:
   ```cmd
   net start MongoDB
   ```
3. Update `.env` file:
   ```
   MONGODB_URI=mongodb://localhost:27017
   ```

### Option 2: Use Docker (If Docker is installed)
1. Install Docker Desktop from https://www.docker.com/products/docker-desktop
2. Run MongoDB container:
   ```cmd
   docker run -d -p 27017:27017 --name mongodb mongo:7.0
   ```
3. Update `.env` file:
   ```
   MONGODB_URI=mongodb://localhost:27017
   ```

### Option 3: Create New MongoDB Atlas Cluster
1. Go to https://cloud.mongodb.com/
2. Create a free account or sign in
3. Create a new cluster (Free tier is sufficient)
4. Add your IP address to the whitelist (0.0.0.0/0 for development)
5. Create a database user with username and password
6. Get the connection string and update `.env` file

### Option 4: Use MongoDB Atlas with Direct Connection
If you have a working MongoDB Atlas cluster, use the direct connection format:
```
MONGODB_URI=mongodb://username:password@cluster0-shard-00-00.mongodb.net:27017,cluster0-shard-00-01.mongodb.net:27017,cluster0-shard-00-02.mongodb.net:27017/spms?ssl=true&replicaSet=atlas-xxxxx-shard-0&authSource=admin&retryWrites=true&w=majority
```

## Testing the Connection
Run this command to test your connection:
```cmd
node -e "import('dotenv/config').then(() => import('mongodb')).then(({ MongoClient }) => { const client = new MongoClient(process.env.MONGODB_URI); return client.connect().then(() => console.log('✅ Connection successful')).catch(err => console.error('❌ Connection failed:', err.message)).finally(() => client.close()); })"
```

## Current Status
- ❌ MongoDB Atlas cluster `project-midterm.fatysru.mongodb.net` is not accessible
- ✅ Local MongoDB setup instructions provided
- ✅ Docker alternative provided
- ✅ New MongoDB Atlas setup instructions provided

## Next Steps
1. Choose one of the options above
2. Set up MongoDB accordingly
3. Update the `.env` file with the correct connection string
4. Test the connection using the provided command
5. Run your application
