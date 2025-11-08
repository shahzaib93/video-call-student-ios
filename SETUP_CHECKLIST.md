# 🚀 Quick Setup Checklist - iOS Deployment

## Your App Details
- **App ID:** `com.tarteelequran.app`
- **App Name:** `Tarteel-e-Quran Student`
- **Apple Developer Account:** ✅ ACTIVE ($99/year)

---

## ✅ To-Do List (Complete in Order)

### [ ] **1. Get Apple Team ID** (5 minutes)
Go to: https://developer.apple.com/account
- Click **Membership** in sidebar
- Copy your **Team ID** (format: `A1B2C3D4E5`)
- Save it somewhere safe

**Your Team ID:** `_______________`

---

### [ ] **2. Create App Store Connect API Key** (10 minutes)
Go to: https://appstoreconnect.apple.com
- Click **Users and Access** → **Integrations** tab
- Click **+** under "App Store Connect API"
- Name: `GitHub Actions CI/CD`
- Access: `Developer`
- Click **Generate**
- **DOWNLOAD the .p8 file NOW** (can only download once!)

**Save these 3 values:**
1. **Key ID:** `_______________` (shown on screen)
2. **Issuer ID:** `_______________` (shown at top of page)
3. **Private Key (.p8 file):** Open the downloaded file in Notepad, copy ALL contents

---

### [ ] **3. Register App Bundle ID** (5 minutes)
Go to: https://developer.apple.com/account/resources/identifiers/list
- Click **+** button
- Select **App IDs** → Continue
- **Description:** `Tarteel Student App`
- **Bundle ID:** `com.tarteelequran.app` (EXACT match)
- **Capabilities:** Enable:
  - ✅ Push Notifications
  - ✅ Sign in with Apple (if needed)
- Click **Continue** → **Register**

---

### [ ] **4. Create iOS Certificate** (15 minutes)

**If you're on Windows/Linux (no Mac):**

1. Open **Git Bash** (or WSL) and run:
```bash
cd ~
openssl req -new -newkey rsa:2048 -nodes \
  -keyout ios_distribution.key \
  -out CertificateSigningRequest.certSigningRequest \
  -subj "/CN=iOS Distribution/C=US"
```

2. Go to: https://developer.apple.com/account/resources/certificates/add
   - Select **iOS Distribution (App Store and Ad Hoc)**
   - Upload `CertificateSigningRequest.certSigningRequest`
   - Download the certificate (saved as `ios_distribution.cer`)

3. Convert certificate to .p12 format:
```bash
cd ~
# Convert .cer to .pem
openssl x509 -in ~/Downloads/ios_distribution.cer -inform DER -out ios_distribution.pem -outform PEM

# Create .p12 file (when prompted, enter a password like: mypassword123)
openssl pkcs12 -export -out ios_distribution.p12 -inkey ios_distribution.key -in ios_distribution.pem

# Convert to base64 for GitHub
base64 -w 0 ios_distribution.p12 > ios_distribution_base64.txt
# On Mac/WSL use: base64 -i ios_distribution.p12 -o ios_distribution_base64.txt
```

4. Open `ios_distribution_base64.txt` in text editor, copy the entire content

**Save these:**
- **P12 Base64:** (content of `ios_distribution_base64.txt`)
- **P12 Password:** (the password you entered, e.g., `mypassword123`)

---

### [ ] **5. Setup GitHub Repository** (10 minutes)

**Option A: Create New Repository**
1. Go to https://github.com/new
2. Repository name: `tarteel-student-app` (or your choice)
3. **Private** (recommended)
4. **DO NOT** initialize with README
5. Click **Create repository**

**Option B: Use Existing Repository**
- Just note the repository URL

**Your GitHub Repo URL:** `_______________`

---

### [ ] **6. Add GitHub Secrets** (10 minutes)

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add **6 secrets**:

| Secret Name | Where to Get It | Example |
|-------------|----------------|---------|
| `APPLE_TEAM_ID` | From Step 1 | `A1B2C3D4E5` |
| `APPLE_ASC_KEY_ID` | From Step 2 (Key ID) | `ABC123XYZ` |
| `APPLE_ASC_KEY_ISSUER_ID` | From Step 2 (Issuer ID) | `12345678-1234-1234-...` |
| `APPLE_ASC_PRIVATE_KEY` | From Step 2 (.p8 file content) | `-----BEGIN PRIVATE KEY-----\nMII...` |
| `APPLE_P12_NEW` | From Step 4 (base64 content) | `MIIKvgIBAzCCC...` |
| `APPLE_P12_PASSWORD_NEW` | From Step 4 (password you set) | `mypassword123` |

**Copy each value carefully** - No extra spaces or line breaks!

---

### [ ] **7. Push Code to GitHub** (5 minutes)

Open terminal in: `/mnt/d/project/tarteel/video calling/mobile-apps/student-app`

```bash
# Check if git is initialized
git status

# If not initialized:
git init
git add .
git commit -m "Initial commit - Student app with iOS build"

# Add remote (replace YOUR_USERNAME and YOUR_REPO)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

### [ ] **8. Watch the Build** (15 minutes)

1. Go to your GitHub repository
2. Click **Actions** tab
3. You'll see **"Build iOS App"** workflow running
4. Click on it to watch progress
5. Wait 10-15 minutes for completion

If it succeeds:
- ✅ Green checkmark appears
- Scroll to bottom → **Artifacts** section
- Download **ios-app-development.ipa**

---

### [ ] **9. Upload to TestFlight** (20 minutes)

**Option A: Using Transporter (Mac)**
1. Download **Transporter** app from Mac App Store
2. Sign in with Apple Developer Account
3. Drag the `.ipa` file into Transporter
4. Click **Deliver**

**Option B: Using App Store Connect (Web)**
1. Go to https://appstoreconnect.apple.com
2. Click **My Apps** → **+** → **New App**
3. Fill in app details
4. Wait for build to appear (5-10 mins after upload)

**Option C: Using Command Line (Advanced)**
```bash
# Install Fastlane
sudo gem install fastlane

# Upload to TestFlight
fastlane pilot upload --ipa ios-app-development.ipa
```

---

### [ ] **10. Add TestFlight Testers**

1. In App Store Connect → Your App → **TestFlight** tab
2. Click **App Store Connect Users** or **External Testers**
3. Click **+** to add testers
4. Enter their email addresses
5. They'll receive invitation to download TestFlight app

---

## 🎯 **Total Time Estimate**
- First time setup: **~90 minutes**
- Future builds: **Automatic!** (just push code)

---

## 🐛 **Common Issues**

### ❌ Build fails with "No matching provisioning profile"
**Fix:** Make sure Bundle ID `com.tarteelequran.app` is registered in Step 3

### ❌ "Invalid App Store Connect API Key"
**Fix:** Check that `.p8` file content includes BEGIN/END lines and is complete

### ❌ "Code signing failed"
**Fix:** Regenerate certificate in Step 4, ensure password is correct

### ❌ "Build succeeded but no artifact"
**Fix:** Check the workflow logs for "Upload IPA artifact" step

---

## 📱 **Testing on Your iPhone**

Once uploaded to TestFlight:
1. Install **TestFlight** app from App Store on your iPhone
2. Open the invitation email
3. Tap **View in TestFlight**
4. Install the app
5. Test all features!

---

## 🎉 **Success!**

Once complete, you'll have:
- ✅ Automated iOS builds on every push
- ✅ Signed .ipa files for distribution
- ✅ TestFlight integration for testing
- ✅ No need for Mac for future builds!

---

**Questions? Get stuck?** Check the detailed guide in `APPLE_DEVELOPER_SETUP.md`
