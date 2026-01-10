# Vercel Deployment Guide for Pharmacy Store

## Prerequisites
1. Vercel account (sign up at https://vercel.com)
2. Vercel CLI installed (`npm i -g vercel`) OR GitHub integration

## Environment Variables Required
Before deploying, set these environment variables in Vercel:

- `DATABASE_URL`: PostgreSQL connection string from Neon
- `JWT_SECRET`: Secret key for JWT tokens (generate a random string)

### Setting Environment Variables in Vercel Dashboard:
1. Go to your project in Vercel
2. Navigate to Settings → Environment Variables
3. Add:
   - Name: `DATABASE_URL`, Value: (your Neon DB URL)
   - Name: `JWT_SECRET`, Value: (your secret key)

## Deployment Options

### Option 1: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
cd /workspace/pharmacy-api
vercel --prod
```

### Option 2: Using GitHub Integration

1. Push your code to GitHub
2. Import project in Vercel:
   - https://vercel.com/import/git
3. Configure environment variables
4. Deploy

## Project Structure for Vercel

```
pharmacy-api/
├── vercel.json           # Vercel configuration
├── vercel-server.js      # Express server with API routes
├── package.json          # Dependencies
├── index.html            # Frontend (customer)
├── admin.html            # Admin panel
├── api.js                # Frontend API service
└── .env.example          # Environment template
```

## After Deployment

### Test Your Deployment:

1. **Health Check:**
   ```
   curl https://your-app.vercel.app/api/health
   ```

2. **Login:**
   ```
   curl -X POST https://your-app.vercel.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@pharmacy.com","password":"admin123"}'
   ```

3. **Get Products:**
   ```
   curl https://your-app.vercel.app/api/products
   ```

## Troubleshooting

### Issue: Connection refused to database
**Solution:** Ensure `DATABASE_URL` is correctly set in Vercel environment variables and includes `sslmode=require`

### Issue: CORS errors
**Solution:** Vercel config includes CORS headers. If issues persist, check your Neon database firewall settings to allow Vercel IPs.

### Issue: Function timeout
**Solution:** Increase `maxDuration` in vercel.json (default is 10s, we set to 30s)

## Quick Deploy Command

```bash
cd /workspace/pharmacy-api
vercel --prod
```

Enter the following when prompted:
- Set up and deploy? Yes
- Which scope? (Your Vercel account)
- Link to existing project? No
- Project name? pharmacy-store (or your preferred name)
- Directory? ./
- Want to modify settings? Yes
- Build Command? echo "No build required"
- Output Directory? .
- Overwrite? Yes

Then add environment variables in Vercel dashboard.
