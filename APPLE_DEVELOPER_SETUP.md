# Apple Developer Account Setup for GitHub Actions

## 🎯 Goal
Configure GitHub Actions to automatically build and sign iOS apps using your Apple Developer Account.

---

## 📋 Prerequisites
✅ Apple Developer Account ($99/year) - **YOU HAVE THIS**
✅ GitHub repository
✅ Access to App Store Connect

---

## 🔧 Step-by-Step Setup

### **Step 1: Get Your Apple Team ID**

1. Go to https://developer.apple.com/account
2. Log in with your Apple Developer Account
3. Look at the top right - you'll see your **Team Name**
4. Click on "Membership" in the sidebar
5. Copy your **Team ID** (looks like: `A1B2C3D4E5`)

**Save this:** `APPLE_TEAM_ID = A1B2C3D4E5`

---

### **Step 2: Create App Store Connect API Key**

1. Go to https://appstoreconnect.apple.com
2. Click **Users and Access** (in the top menu)
3. Click **Integrations** tab
4. Under **App Store Connect API**, click the **+** button (or "Generate API Key")
5. Fill in:
   - **Name:** `GitHub Actions CI/CD`
   - **Access:** Select `Developer` role
6. Click **Generate**
7. **IMPORTANT:** Download the `.p8` file immediately (you can only download it once!)
   - File name will be like: `AuthKey_ABC123XYZ.p8`

**Save these values:**
- `APPLE_ASC_KEY_ID` = The Key ID shown (e.g., `ABC123XYZ`)
- `APPLE_ASC_KEY_ISSUER_ID` = The Issuer ID shown at top (looks like: `12345678-1234-1234-1234-123456789012`)
- `APPLE_ASC_PRIVATE_KEY` = Content of the `.p8` file (open with text editor, copy everything)

---

### **Step 3: Create iOS Distribution Certificate**

#### **Option A: Using macOS (if you have temporary access)**

```bash
# Generate certificate signing request
openssl req -new -newkey rsa:2048 -nodes -keyout ios_distribution.key -out CertificateSigningRequest.certSigningRequest -subj "/emailAddress=your-email@example.com/CN=iOS Distribution/C=US"
```

Then:
1. Go to https://developer.apple.com/account/resources/certificates/add
2. Select **iOS Distribution**
3. Upload the `CertificateSigningRequest.certSigningRequest` file
4. Download the certificate (will be named like `ios_distribution.cer`)
5. Convert to .p12 format:

```bash
# Convert .cer to .p12
openssl x509 -in ios_distribution.cer -inform DER -out ios_distribution.pem -outform PEM
openssl pkcs12 -export -out ios_distribution.p12 -inkey ios_distribution.key -in ios_distribution.pem -password pass:YOUR_PASSWORD_HERE

# Convert .p12 to base64 for GitHub
base64 -i ios_distribution.p12 -o ios_distribution_base64.txt
```

**Save these:**
- `APPLE_P12_NEW` = Content of `ios_distribution_base64.txt`
- `APPLE_P12_PASSWORD_NEW` = The password you used (e.g., `YOUR_PASSWORD_HERE`)

#### **Option B: Using Online Tools (No Mac needed)**

If you don't have access to a Mac right now:

1. **Generate keys online** at https://www.samltool.com/self_signed_certs.php
   - Or use this Windows command in Git Bash:
   ```bash
   openssl req -new -newkey rsa:2048 -nodes -keyout ios_distribution.key -out CertificateSigningRequest.certSigningRequest
   ```

2. Upload CSR to Apple Developer portal (same as Option A)
3. Download certificate
4. Use online converter or Git Bash to create .p12

---

### **Step 4: Register Your App Bundle ID**

1. Go to https://developer.apple.com/account/resources/identifiers/list
2. Click **+** to add new identifier
3. Select **App IDs**
4. Fill in:
   - **Description:** `Tarteel Student App`
   - **Bundle ID:** Check your `capacitor.config.json` file for the app ID (probably something like `com.videocall.student` or similar)
   - **Capabilities:** Enable any needed (Push Notifications, etc.)
5. Click **Continue** → **Register**

---

### **Step 5: Add Secrets to GitHub**

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each of these:

| Secret Name | Value | Example |
|------------|-------|---------|
| `APPLE_TEAM_ID` | Your Team ID from Step 1 | `A1B2C3D4E5` |
| `APPLE_ASC_KEY_ID` | Key ID from Step 2 | `ABC123XYZ` |
| `APPLE_ASC_KEY_ISSUER_ID` | Issuer ID from Step 2 | `12345678-1234-...` |
| `APPLE_ASC_PRIVATE_KEY` | Full content of .p8 file | `-----BEGIN PRIVATE KEY-----\nMIGT...` |
| `APPLE_P12_NEW` | Base64 of .p12 file | `MIIKvgIBAzCCCn...` |
| `APPLE_P12_PASSWORD_NEW` | Password for .p12 | `mypassword123` |

---

### **Step 6: Update capacitor.config.json**

Make sure your app configuration is correct:

```json
{
  "appId": "com.videocall.student",
  "appName": "Student Video Call",
  "bundledWebRuntime": false,
  "version": "1.0.0"
}
```

---

### **Step 7: Push to GitHub and Build**

```bash
cd "/mnt/d/project/tarteel/video calling/mobile-apps/student-app"

# Initialize git if needed
git init

# Add all files
git add .

# Commit
git commit -m "iOS build setup with GitHub Actions"

# Add remote (replace with your GitHub repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push
git push -u origin main
```

---

### **Step 8: Monitor the Build**

1. Go to your GitHub repository
2. Click **Actions** tab
3. You should see **"Build iOS App"** workflow running
4. Wait 10-15 minutes
5. Download the `.ipa` file from **Artifacts**

---

## 🎉 **What You Get**

After successful build:
- ✅ Signed `.ipa` file ready for TestFlight or App Store
- ✅ Automatic builds on every push
- ✅ Can distribute to testers via TestFlight

---

## 🐛 **Troubleshooting**

### Build fails with "No profile matching..."
- Make sure Bundle ID is registered in Apple Developer portal
- Check that Team ID is correct

### "Authentication key not valid"
- Verify `.p8` file content is complete (including BEGIN/END lines)
- Check Key ID and Issuer ID match exactly

### "Certificate not found"
- Ensure .p12 file is valid base64
- Try regenerating the certificate

---

## 📱 **Next: TestFlight Distribution**

Once you have the `.ipa`:

1. Go to App Store Connect
2. Create a new app
3. Upload the `.ipa` using Transporter app (macOS) or App Store Connect website
4. Add testers
5. Send test invitations

---

## 💡 **Tips**

- **Secrets are safe** - GitHub encrypts them and hides them in logs
- **Update certificates yearly** - iOS certificates expire after 1 year
- **Use different keys** - Don't reuse production keys for testing
- **Keep .p8 file** - Store it safely, you can't re-download it

---

## 🆘 **Need Help?**

If you get stuck, check:
1. GitHub Actions build logs (click on failed step)
2. Apple Developer portal for certificate/profile status
3. Xcode → Preferences → Accounts to verify signing

---

**Ready to proceed?** Follow steps 1-5 first, then we'll configure GitHub!
