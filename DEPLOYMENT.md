# 🚀 Deploying Hostel Cravings to Vercel + Turso (Permanent Zero-Reset Setup)

Your application is configured with:
- **Frontend & Serverless API:** Vercel (`hostelcravings.vercel.app`)
- **Permanent Cloud Database:** Turso Cloud SQLite (`@libsql/client`) — free tier with 9GB storage, 500 databases, zero resets, instant edge latency, and no cold sleep.

---

### Step 1: Create Your Free Turso Cloud Database (Takes 2 minutes)

1. Open **[turso.tech](https://turso.tech)** in your browser.
2. Click **Sign Up** or **Sign In** (you can sign in directly with your GitHub account).
3. On the Turso dashboard, click **"Create Database"**.
4. Name your database (e.g. `hostelcravings-db`) and choose the nearest region (e.g., India / Mumbai `bom` or Singapore `sin`).
5. Click **Create**.
6. Once created, you will see your **Database URL**. It looks like:
   ```text
   libsql://hostelcravings-db-YOUR_USERNAME.turso.io
   ```
7. Click **"Create Token"** (or Generate Token) and copy the generated Auth Token.

---

### Step 2: Add Turso Environment Variables to Vercel

1. Go to your **[Vercel Dashboard](https://vercel.com/dashboard)**.
2. Click on your **`hostelcravings`** project.
3. Go to **Settings** -> **Environment Variables**.
4. Add the following two variables:
   - **`TURSO_DATABASE_URL`**: Your Turso database URL (e.g. `libsql://hostelcravings-db-YOUR_USERNAME.turso.io`)
   - **`TURSO_AUTH_TOKEN`**: The authentication token you generated in Step 1
5. (Optional) You can also set `ADMIN_PASSWORD` if you want a custom owner password.
6. Check all environments (**Production**, **Preview**, **Development**) and click **Save**.

---

### Step 3: Trigger a Redeployment on Vercel

1. In your Vercel project, go to the **Deployments** tab.
2. Click the three dots `...` next to the latest deployment and select **Redeploy**.
3. Once deployed, Hostel Cravings will automatically connect to Turso:
   - All 17 snacks are automatically initialized and kept in permanent cloud storage.
   - Any stock quantity updates, order statuses, or added items are stored in Turso.
   - Because Turso is an external cloud database, serverless restarts, cache purges, and deployments will **never** reset your stock or erase customer orders again!

---

### Live URLs:
- **Storefront:** `https://hostelcravings.vercel.app/`
- **Owner Hub:** `https://hostelcravings.vercel.app/admin`
- **WhatsApp Direct Order API:** Connected to `+91 7095143825`

