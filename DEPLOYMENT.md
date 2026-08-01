# Deploying to AWS EC2

This app runs as a single always-on Node process (via PM2) on the EC2 box, using
SQLite as the database (the `dev.db` file lives on the instance itself). No RDS,
no separate DB service — matches how the app already runs locally.

## 0. What you need before starting

- SSH access to the EC2 instance (key + public IP or hostname)
- The instance's security group allows inbound on port **3000** (or **80** if you
  set up Nginx — see step 7) from `0.0.0.0/0` (or your IP, if you want it private)
- Ubuntu with Node.js 20+ already installed (`node --version` to check). If not:
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```

## 1. System dependencies for Puppeteer (PDF export)

The report PDF export launches headless Chrome via Puppeteer. On a bare Ubuntu
server this will fail to launch without these shared libraries:

```bash
sudo apt-get update
sudo apt-get install -y \
  libnss3 libatk-bridge2.0-0 libx11-xcb1 libxcomposite1 libxdamage1 \
  libxrandr2 libgbm1 libasound2t64 libpangocairo-1.0-0 libcups2 \
  fonts-liberation libxkbcommon0 libatspi2.0-0
```

(Package names above match Ubuntu 24.04. On 22.04, use `libasound2` instead of
`libasound2t64`.)

## 2. Get the code onto the instance

```bash
git clone https://github.com/Arun404notfound/testing_prod.git
cd testing_prod
```

If it's already cloned from a previous deploy, just `git pull origin main` instead.

## 3. Install dependencies (on the server, not copied from your machine)

`better-sqlite3` and Puppeteer's Chromium both include native/platform binaries.
Never copy `node_modules` from Windows — always install fresh on the Linux box:

```bash
npm ci
```

## 4. Environment variables

```bash
cp .env.example .env
```

Then edit `.env`:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `file:./dev.db` (leave as-is — SQLite file next to the app) |
| `NEXT_PUBLIC_APP_URL` | `http://<EC2-PUBLIC-IP>:3000` (update once you have a domain) |
| `AUTH_SECRET` | A real random secret — generate with `openssl rand -base64 32` |
| `BREVO_API_KEY` | Optional — leave blank to skip candidate assignment emails, or fill in your Brevo key |
| `BREVO_SENDER_EMAIL` / `BREVO_SENDER_NAME` | Only needed if `BREVO_API_KEY` is set |

**Do not skip `AUTH_SECRET`** — without it the app falls back to a publicly-known
dev secret and admin sessions become forgeable.

## 5. Database setup

Generate the Prisma client and apply migrations:

```bash
npx prisma generate
npx prisma migrate deploy
```

Then choose one:

- **Fresh demo data** (creates the admin user + sample candidates/assessments):
  ```bash
  npx prisma db seed
  ```
  (this runs the four seed scripts chained in the `prisma.seed` field of
  `package.json` — admin login ends up being `admin@demo.local` / `demo1234`,
  same as local)
- **Bring your current local data as-is** (the candidates/reports you've been
  testing with): from your machine, `scp` the local `dev.db` up instead of
  seeding:
  ```bash
  scp -i your-key.pem dev.db ubuntu@<EC2-PUBLIC-IP>:~/testing_prod/dev.db
  ```

## 6. Build and start with PM2

```bash
npm run build

# Install PM2 once, globally, if not already present
sudo npm install -g pm2

pm2 start ecosystem.config.js
pm2 save
pm2 startup   # follow the printed command to enable PM2 on reboot
```

Check it's alive:

```bash
pm2 status
curl http://localhost:3000/api/ping
```

At this point the app is reachable at `http://<EC2-PUBLIC-IP>:3000`.

## 7. (Recommended) Nginx reverse proxy on port 80

Even without a domain yet, putting Nginx in front means visitors don't need to
type `:3000`, and adding a domain + SSL later is a five-minute change instead of
a re-deploy.

```bash
sudo apt-get install -y nginx
sudo tee /etc/nginx/sites-available/assessment-demo <<'EOF'
server {
    listen 80;
    server_name _;

    client_max_body_size 5m;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
sudo ln -sf /etc/nginx/sites-available/assessment-demo /etc/nginx/sites-enabled/assessment-demo
sudo nginx -t && sudo systemctl reload nginx
```

Open port 80 in the security group, and the app is now at `http://<EC2-PUBLIC-IP>`.
Update `NEXT_PUBLIC_APP_URL` in `.env` to drop `:3000` if you do this, then
`pm2 restart assessment-demo`.

## 8. Later: adding a domain + SSL

Once you have a domain, point its A record at the EC2 public IP, then:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

Certbot rewrites the Nginx config for HTTPS and sets up auto-renewal. Update
`NEXT_PUBLIC_APP_URL` in `.env` to `https://yourdomain.com` and restart PM2.

## Redeploying after future code changes

```bash
git pull origin main
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart assessment-demo
```

## Notes / limitations

- **SQLite is single-writer.** `ecosystem.config.js` runs exactly one PM2
  instance for this reason — do not scale `instances` up without migrating off
  SQLite first.
- **Back up `dev.db` regularly** (`cp dev.db dev.db.bak-$(date +%Y%m%d)` via cron)
  — there's no managed backup like RDS would give you.
- **t3.micro (1GB RAM)**: Puppeteer's Chromium is the heaviest thing this app
  runs. Occasional PDF exports are fine; if you see the process getting OOM-killed
  under load, that's the first place to look (`pm2 logs`, `free -h`).
