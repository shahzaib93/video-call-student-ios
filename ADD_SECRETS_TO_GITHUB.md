# Add Secrets to GitHub - Final Step!

## 🎯 Goal
Add the 6 Apple credentials to GitHub so the build can succeed.

---

## 📋 Your 6 Secrets Checklist

Before you start, gather these values:

| Secret Name | Value | Where You Got It |
|-------------|-------|------------------|
| `APPLE_TEAM_ID` | `U2398F926G` | ✅ Apple Developer Membership |
| `APPLE_ASC_KEY_ID` | `______________` | ✅ App Store Connect API Key ID |
| `APPLE_ASC_KEY_ISSUER_ID` | `______________` | ✅ App Store Connect Issuer ID |
| `APPLE_ASC_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...` | ✅ Content of .p8 file |
| `APPLE_P12_NEW` | `MIIKvgIBAzCCC...` | ✅ Content of ios_distribution_base64.txt |
| `APPLE_P12_PASSWORD_NEW` | `______________` | ✅ Password you set during p12 creation |

---

## 🔑 Step-by-Step: Add Secrets to GitHub

### 1. Go to Your Repository Settings

1. Open: https://github.com/shahzaib93/video-call-student-ios
2. Click **Settings** (top menu bar)
3. In left sidebar: **Secrets and variables** → **Actions**
4. You'll see the "Actions secrets" page

---

### 2. Add Each Secret One by One

Click **New repository secret** button and add:

#### **Secret 1: APPLE_TEAM_ID**
- **Name:** `APPLE_TEAM_ID`
- **Value:** `U2398F926G`
- Click **Add secret**

#### **Secret 2: APPLE_ASC_KEY_ID**
- **Name:** `APPLE_ASC_KEY_ID`
- **Value:** Your Key ID from App Store Connect (e.g., `ABC123XYZ`)
- Click **Add secret**

#### **Secret 3: APPLE_ASC_KEY_ISSUER_ID**
- **Name:** `APPLE_ASC_KEY_ISSUER_ID`
- **Value:** Your Issuer ID from App Store Connect (format: `12345678-1234-1234-1234-123456789012`)
- Click **Add secret**

#### **Secret 4: APPLE_ASC_PRIVATE_KEY**
- **Name:** `APPLE_ASC_PRIVATE_KEY`
- **Value:** Open the `.p8` file in Notepad, copy **EVERYTHING** including:
  ```
  -----BEGIN PRIVATE KEY-----
  MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
  -----END PRIVATE KEY-----
  ```
- **IMPORTANT:** Copy the ENTIRE content with BEGIN/END lines
- Click **Add secret**

#### **Secret 5: APPLE_P12_NEW**
- **Name:** `APPLE_P12_NEW`
- **Value:** Open `ios_distribution_base64.txt` in Notepad
  - Copy the ENTIRE line (will be very long, like 5000+ characters)
  - Should look like: `MIIKvgIBAzCCCnwGCSqGSIb3DQEHAaCCCm0E...`
- Click **Add secret**

#### **Secret 6: APPLE_P12_PASSWORD_NEW**
- **Name:** `APPLE_P12_PASSWORD_NEW`
- **Value:** The password you entered when creating the .p12 file (e.g., `MyPass123!`)
- Click **Add secret**

---

## ✅ Verify All Secrets Added

After adding all 6, you should see them listed:

```
APPLE_TEAM_ID                 Updated now
APPLE_ASC_KEY_ID             Updated now
APPLE_ASC_KEY_ISSUER_ID      Updated now
APPLE_ASC_PRIVATE_KEY        Updated now
APPLE_P12_NEW                Updated now
APPLE_P12_PASSWORD_NEW       Updated now
```

**Note:** GitHub hides the values for security - you'll only see the names.

---

## 🚀 Trigger a New Build

### Option 1: Manual Trigger (Recommended)

1. Go to: https://github.com/shahzaib93/video-call-student-ios/actions
2. Click on **Build iOS App** workflow (left sidebar)
3. Click **Run workflow** button (right side)
4. Select branch: `main`
5. Click green **Run workflow** button

### Option 2: Push New Commit

```bash
cd "/mnt/d/project/tarteel/video calling/mobile-apps/student-app"

# Make a small change
echo "# iOS Build Ready" >> README.md

# Commit and push
git add .
git commit -m "Trigger iOS build with credentials"
git push
```

---

## ⏱️ Watch the Build

1. Go to: https://github.com/shahzaib93/video-call-student-ios/actions
2. Click on the running workflow
3. Watch the steps execute (takes 10-15 minutes)

### Expected Steps:
1. ✅ Checkout code
2. ✅ Setup Node.js
3. ✅ Install dependencies
4. ✅ Build web assets
5. ✅ Sync Capacitor
6. ✅ Install CocoaPods
7. ✅ Save App Store Connect API key
8. ✅ Import signing certificate ← **Should succeed now!**
9. ✅ Build iOS archive ← **Should succeed now!**
10. ✅ Export signed IPA ← **Should succeed now!**
11. ✅ Upload IPA artifact

---

## 🎉 Success Indicators

**Build succeeds when you see:**
- ✅ Green checkmark on all steps
- ✅ "Build Summary" step completes
- ✅ "Upload IPA artifact" step completes
- ✅ Artifact available at bottom of workflow page

**Download the .ipa:**
1. Scroll to bottom of workflow page
2. Under **Artifacts**, click **ios-app-development**
3. Downloads a .zip file
4. Extract to get the `.ipa` file
5. Upload to TestFlight!

---

## 🐛 Troubleshooting

### Build still fails with "No signing certificate"

**Check:**
- `APPLE_P12_NEW` is the full base64 string (should be 5000+ chars)
- `APPLE_P12_PASSWORD_NEW` matches exactly what you entered
- No extra spaces before/after the values

**Fix:** Re-add those two secrets

### Build fails with "Invalid API key"

**Check:**
- `APPLE_ASC_PRIVATE_KEY` includes BEGIN/END lines
- `APPLE_ASC_KEY_ID` is correct (check App Store Connect)
- `APPLE_ASC_KEY_ISSUER_ID` is correct (UUID format)

**Fix:** Re-add the App Store Connect secrets

### Build fails with "No profiles found"

**Check:**
- Bundle ID `com.videocall.student` is registered in Apple Developer
- `APPLE_TEAM_ID` is `U2398F926G`
- API key has "Developer" role in App Store Connect

---

## 📊 Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `No signing certificate found` | P12 not imported correctly | Check APPLE_P12_NEW and password |
| `Invalid API key` | Wrong credentials | Check all 3 App Store Connect secrets |
| `No profiles matching` | Bundle ID not registered | Register com.videocall.student |
| `Provisioning profile doesn't match` | Team ID wrong | Verify APPLE_TEAM_ID is U2398F926G |

---

## 🎯 Quick Copy-Paste Secret Names

```
APPLE_TEAM_ID
APPLE_ASC_KEY_ID
APPLE_ASC_KEY_ISSUER_ID
APPLE_ASC_PRIVATE_KEY
APPLE_P12_NEW
APPLE_P12_PASSWORD_NEW
```

**Tip:** Copy-paste these names to avoid typos!

---

## 📱 After Successful Build

Once you have the `.ipa` file:

1. **Install Transporter app** (macOS) or use App Store Connect web
2. **Create app in App Store Connect**
3. **Upload the .ipa**
4. **Add to TestFlight**
5. **Invite testers**
6. **Test on your iPhone!**

---

**Ready?** Add the 6 secrets to GitHub and trigger a build!

Let me know when the build starts and I'll help monitor it! 🚀
