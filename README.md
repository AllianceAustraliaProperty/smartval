# SMARTval

## Quick Start

### Prerequisites
- Amazon Linux EC2 instance
- Docker and Docker Compose installed
- Google Maps API key
- MongoDB database (DocumentDB/Atlas/External)

### Deployment Steps

1. **Configure Environment**
   ```bash
   cp env.production .env
   nano .env  # Update with your values
   ```

2. **Deploy Application**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh production
   ```

3. **Verify Deployment**
   ```bash
   docker ps
   curl http://localhost:3000
   curl http://localhost:5000/health
   ```

### Required Environment Variables

Update `.env` file with:
- `GOOGLE_MAPS_API_KEY` - Your Google Maps API key
- `MONGODB_URI` - MongoDB connection string
- `SECRET_KEY` - Strong secret key (32+ characters)
- `CORS_ORIGINS` - Your company domains
- `NEXT_PUBLIC_API_URL` - Your API URL

### MongoDB Options

**AWS DocumentDB:**
```env
MONGODB_URI=mongodb://user:pass@cluster.docdb.amazonaws.com:27017/smartval?ssl=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
```

**MongoDB Atlas:**
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/smartval?retryWrites=true&w=majority
```

### Security Groups

Configure AWS Security Groups:
- Port 22 (SSH) - Your IP
- Port 3000 (Frontend) - 0.0.0.0/0
- Port 5000 (Backend) - Internal only

### Troubleshooting

View logs:
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

Restart services:
```bash
docker-compose -f docker-compose.prod.yml restart
```

---

**For detailed instructions, see DEPLOYMENT_INSTRUCTIONS.md**
