# 🚀 Deploying Hostel Cravings to Vercel

Hostel Cravings is now configured for deployment on **Vercel** with automatic serverless routing, frontend hosting, and database support.

---

### Step 1: Deploy to Vercel (1-Click Import)

1. Open **[vercel.com](https://vercel.com/)** and sign in with your GitHub account.
2. Click the **"Add New..."** button in the top right and choose **"Project"**.
3. Find your **`hostelcravings`** repository and click **Import**.
4. Keep the default settings:
   - **Framework Preset:** `Other` (or auto-detected)
   - **Root Directory:** `./`
   - **Build Command:** (leave default)
   - **Output Directory:** (leave default)
5. Click **Deploy**.
6. Vercel will build and deploy your app in about 30 seconds! 🎉
   You will get a live URL like:  
   👉 **`https://hostelcravings.vercel.app`**

---

### Step 2: Make Your Stock & Inventory 100% Permanent

Vercel is serverless. To ensure your stock counts and snacks **never reset**, connect a free cloud database:

#### Option A: Vercel Postgres (1-Click, Built-in)
1. In your Vercel project dashboard, click the **Storage** tab at the top.
2. Click **Connect Database** and select **Postgres**.
3. Click **Create** (Free tier).
4. Vercel automatically adds the database environment variables to your project!

#### Option B: Neon Serverless Postgres (100% Free Forever)
1. Go to **[neon.tech](https://neon.tech/)** and sign up for free with GitHub/Google.
2. Create a project named `hostelcravings`.
3. Copy your connection string (`postgres://...`).
4. In your Vercel project, go to **Settings** → **Environment Variables**, add:
   - **Name:** `DATABASE_URL`
   - **Value:** *[paste your connection string]*
5. Click **Save**.

---

### Step 3: Admin Hub & Backup Tool

- **Admin Login:** `https://your-app.vercel.app/admin`
- **Email:** `admin@hostelcravings.in`
- **Password:** `kulfimodda69`

#### Built-in Inventory Backup & Restore
- In the admin panel under **Snack Inventory & Stock Levels**, you now have:
  - **📥 Backup:** Downloads a JSON file containing all your snacks, prices, stock counts, and photos.
  - **📤 Restore:** Upload any backup JSON file to restore all your snacks to the live store with one click.
