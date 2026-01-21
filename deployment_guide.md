# Deployment Guide for Shopwice Web

This guide outlines the steps to deploy the Next.js WooCommerce application to a VPS (Virtual Private Server) like Vultr, DigitalOcean, or AWS, specifically tailored for environments managed with CloudPanel or similar tools using PM2.

## Prerequisites

Ensure your server is set up with the following:

1.  **Node.js**: Version 18.x or later (matches your project requirements).
2.  **Git**: To pull the latest code.
3.  **PM2**: Process manager for Node.js.
    ```bash
    npm install -g pm2
    ```
4.  **Nginx/Apache**: (Optional but recommended) As a reverse proxy to forward traffic from port 80/443 to the app's port (3001).

## Initial Setup on Server

1.  **Clone the Repository**:
    ```bash
    git clone <your-repo-url> shopwice-web
    cd shopwice-web
    ```

2.  **Environment Variables**:
    Create a `.env.production` file with your live credentials.
    ```bash
    cp .env.example .env.production
    nano .env.production
    ```
    *Update the values in `.env.production` to match your production keys.*

3.  **Make Script Executable**:
    ```bash
    chmod +x deploy.sh
    ```

## Deploying

To deploy or update the application, simply run the deployment script from the project root:

```bash
./deploy.sh
```

### What the script does:
1.  **Stops existing instance**: Safely stops the `shopwice-web` service if running.
2.  **Updates Code**: Pulls the latest changes from the `main` branch.
3.  **Rebuilds**: Installs dependencies and builds the Next.js application.
4.  **Prepares Standalone**: Copies necessary assets (public folder, static files) to the standalone build directory.
5.  **Restarts**: Starts the application using PM2 in cluster mode.

## Troubleshooting

### Port Conflicts
If you see `EADDRINUSE: address already in use`, it means another process is using port 3001.
- Check running ports: `netstat -nlp | grep :3001`
- Kill specific process: `kill <PID>`

### Permission Denied
If you encounter permission errors during the script execution:
- Ensure you own the directory: `chown -R $USER:$USER .`

### Logs
To view the application logs:
```bash
pm2 logs shopwice-web
```

### App Not Starting
If PM2 shows the app as "errored" or it restarts incorrectly:
1.  Check logs: `pm2 logs shopwice-web --lines 100`
2.  Ensure `.env.production` exists in the root (the script copies it to the standalone folder automatically).
