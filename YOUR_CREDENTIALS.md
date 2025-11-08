# Your Apple Developer Credentials

## ✅ What You Have So Far

### Apple Developer Account Info
- **Team ID:** `U2398F926G` ✅
- **Bundle ID:** `com.videocall.student` ✅
- **App Name:** `Video Call Student` ✅

---

## 📋 Still Need to Collect

### [ ] **1. App Store Connect API Key**
Go to: https://appstoreconnect.apple.com
- Click **Users and Access** → **Integrations** tab
- Click **+** under "App Store Connect API"
- Name: `GitHub Actions CI/CD`
- Access: `Developer`
- Click **Generate**
- **DOWNLOAD the .p8 file immediately!**

**Save these:**
- [ ] `APPLE_ASC_KEY_ID` = Key ID shown (e.g., `ABC123XYZ`)
- [ ] `APPLE_ASC_KEY_ISSUER_ID` = Issuer ID at top (e.g., `12345678-1234-...`)
- [ ] `APPLE_ASC_PRIVATE_KEY` = Open .p8 file in text editor, copy ALL contents

---

### [ ] **2. iOS Distribution Certificate**

**Run these commands in Git Bash or WSL:**

```bash
cd ~

# Generate certificate signing request
openssl req -new -newkey rsa:2048 -nodes \
  -keyout ios_distribution.key \
  -out CertificateSigningRequest.certSigningRequest \
  -subj "/CN=Video Call Student/C=US"

echo "✅ Created CertificateSigningRequest.certSigningRequest"
echo "📍 Location: $(pwd)/CertificateSigningRequest.certSigningRequest"
```

Then:
1. Go to: https://developer.apple.com/account/resources/certificates/add
2. Select **iOS Distribution (App Store and Ad Hoc)**
3. Click **Continue**
4. Upload the file: `CertificateSigningRequest.certSigningRequest`
5. Click **Continue**
6. **Download** the certificate (saved as `ios_distribution.cer`)

**After downloading, run:**
```bash
cd ~

# Convert .cer to .pem (update path to where you downloaded the .cer file)
openssl x509 -in ~/Downloads/ios_distribution.cer -inform DER -out ios_distribution.pem -outform PEM

# Create .p12 file (enter a password when prompted, like: mySecurePass123)
openssl pkcs12 -export -out ios_distribution.p12 -inkey ios_distribution.key -in ios_distribution.pem

# Convert to base64 for GitHub
base64 -w 0 ios_distribution.p12 > ios_distribution_base64.txt

echo "✅ Created ios_distribution_base64.txt"
echo "📍 Location: $(pwd)/ios_distribution_base64.txt"
```

**Save these:**
- [ ] `APPLE_P12_NEW` = Full content of `ios_distribution_base64.txt`
- [ ] `APPLE_P12_PASSWORD_NEW` = The password you entered (e.g., `mySecurePass123`)

---

## 🔑 **GitHub Secrets to Add**

Once you have all 6 values above, add them to GitHub:

Go to: **Your GitHub Repo** → **Settings** → **Secrets and variables** → **Actions**

Click **New repository secret** for each:

| Secret Name | Value | Status |
|-------------|-------|--------|
| `APPLE_TEAM_ID` | `U2398F926G` | ✅ You have this |
| `APPLE_ASC_KEY_ID` | From App Store Connect | ⬜ Need to get |
| `APPLE_ASC_KEY_ISSUER_ID` | From App Store Connect | ⬜ Need to get |
| `APPLE_ASC_PRIVATE_KEY` | Content of .p8 file | ⬜ Need to get |
| `APPLE_P12_NEW` | From certificate conversion | ⬜ Need to get |
| `APPLE_P12_PASSWORD_NEW` | Password you set | ⬜ Need to get |

---

## ⚠️ **Important Notes**

1. **Bundle ID is now fixed:** Changed from `com.tarteelequran.app` to `com.videocall.student`
2. **Keep .p8 file safe** - You can only download it ONCE from Apple
3. **Remember your .p12 password** - You'll need it for the GitHub secret
4. **No special characters** - Make sure passwords don't have quotes, spaces, or special chars that need escaping

---

## 📝 **Next Steps**

1. ✅ Bundle ID registered - DONE
2. ⬜ Get App Store Connect API Key (Step 1 above)
3. ⬜ Create iOS Distribution Certificate (Step 2 above)
4. ⬜ Add all 6 secrets to GitHub
5. ⬜ Push code to GitHub
6. ⬜ Watch the build!

---

**Current Status:** 2 out of 6 credentials collected (33%)

Let me know when you've completed steps 1 or 2, or if you need help!
