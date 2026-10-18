# 🚀 Deploying Hostel Cravings to Render (Free 24/7 Hosting)

Your repository is fully prepared with `render.yaml`, production-ready server configs, `.gitignore`, and committed code.

---

### Step 1: Push Code to GitHub

1. Open your browser and go to **[github.com/new](https://github.com/new)**.
2. Set the repository name to: **`hostelcravings`** (can be Public or Private).
3. Do **NOT** check "Add a README file" or "Add .gitignore" (we already created them).
4. Click **Create repository**.
5. Copy your repository's Git URL (e.g., `https://github.com/YOUR_USERNAME/hostelcravings.git`), then in your terminal run:

```bash
git remote add origin https://github.com/YOUR_USERNAME/hostelcravings.git
git push -u origin main
```

*(Replace `YOUR_USERNAME` with your actual GitHub username).*

---

### Step 2: Deploy on Render.com

1. Sign up or log into **[dashboard.render.com](https://dashboard.render.com/)** (you can sign in with your GitHub account).
2. Click the **New +** button in the top right and select **Web Service**.
3. Select **Build and deploy from a Git repository** and connect your GitHub account.
4. Select your **`hostelcravings`** repository.
5. Render will automatically detect settings, but verify:
   - **Name:** `hostelcravings`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
6. Click **Deploy Web Service**.

---

### Step 3: That's It! 🎉

Render will build and deploy your app in about 1–2 minutes. You will receive a permanent, secure live URL like:
👉 **`https://hostelcravings.onrender.com`**

- **Customer Storefront:** `https://hostelcravings.onrender.com/`
- **Owner Hub:** `https://hostelcravings.onrender.com/admin`
- **Owner Credentials:** `admin@hostelcravings.in` / `kulfimodda69`
