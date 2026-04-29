# MongoDB Atlas Connection Troubleshooting Guide

## Issue: querySrv ECONNREFUSED Error

This error occurs when Node.js cannot resolve SRV records for MongoDB Atlas connections using `mongodb+srv://` protocol.

## Solutions Implemented

### 1. DNS Override (Primary Solution)
✅ **Added to `api/index.js`:**
```javascript
import dns from 'node:dns'

// Set Google DNS servers to resolve SRV records
dns.setServers(['8.8.8.8', '8.8.4.4'])
```

### 2. DNS Resolution Test Script
✅ **Created `test-dns-resolution.js`:**
Run this script to test SRV record resolution:
```bash
node test-dns-resolution.js
```

### 3. Fallback Connection String
✅ **Created `.env.fallback`:**
If DNS override doesn't work, use this non-SRV connection string:
```bash
# Copy to .env if needed
MONGODB_URI=mongodb://kharlgelod_db_user:B9aImt33MjTX9Qeu@project-midterm.fatysru.mongodb.net:27017,project-midterm.fatysru.mongodb.net:27018/spms?ssl=true&replicaSet=atlas-xyz-shard-0&authSource=admin&retryWrites=true&w=majority
```

## Dependencies Status
✅ **MongoDB Driver:** Version 7.1.1 (up to date)

## Testing Steps

1. **Try DNS Override First:**
   ```bash
   npm run dev:api
   ```

2. **Test DNS Resolution:**
   ```bash
   node test-dns-resolution.js
   ```

3. **Use Fallback if Needed:**
   ```bash
   cp .env.fallback .env
   npm run dev:api
   ```

## Manual URI Conversion (if needed)

Your current SRV URI:
```
mongodb+srv://kharlgelod_db_user:B9aImt33MjTX9Qeu@project-midterm.fatysru.mongodb.net/?appName=project-midterm
```

Converted to standard format (requires actual replica set name):
```
mongodb://kharlgelod_db_user:B9aImt33MjTX9Qeu@project-midterm.fatysru.mongodb.net:27017/spms?ssl=true&authSource=admin&retryWrites=true&w=majority
```

## Additional Troubleshooting

- Check network connectivity to MongoDB Atlas
- Verify Atlas cluster is running
- Check IP whitelist in Atlas security settings
- Try different DNS servers (1.1.1.1, 208.67.222.222)
