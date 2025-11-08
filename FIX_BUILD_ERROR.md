# Fix GitHub Actions Build Error

## ❌ Current Error:
```
No signing certificate 'iOS Development' found
No profiles for 'com.videocall.student' were found
```

## ✅ Solution:
Add Apple signing credentials to GitHub secrets.

---

## 🚀 FASTEST FIX (15 minutes total)

### Step 1: Get App Store Connect API Key (5 mins)

1. Go to: https://appstoreconnect.apple.com
2. Click **Users and Access** → **Integrations** tab
3. Under "App Store Connect API", click **+**
4. Fill in:
   - Name: `GitHub Actions`
   - Access: `Developer`
5. Click **Generate**
6. **IMMEDIATELY DOWNLOAD** the `.p8` file (you can only download once!)

**You'll see on screen:**
- **Key ID:** (e.g., `ABC123XYZ`) - Copy this
- **Issuer ID:** (at top of page, looks like `12345678-1234-1234-...`) - Copy this

**Open the .p8 file in Notepad:**
- Copy the ENTIRE content (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)

---

### Step 2: Create iOS Distribution Certificate (10 mins)

**Run in Git Bash or WSL:**

```bash
cd ~

# Step 2a: Generate certificate request
openssl req -new -newkey rsa:2048 -nodes \
  -keyout ios_distribution.key \
  -out CertificateSigningRequest.certSigningRequest \
  -subj "/CN=iOS Distribution/C=US"

echo "✅ CSR created at: $(pwd)/CertificateSigningRequest.certSigningRequest"
```

**Then in browser:**

1. Go to: https://developer.apple.com/account/resources/certificates/add
2. Select **iOS Distribution (App Store and Ad Hoc)**
3. Click **Continue**
4. Click **Choose File** → Upload `CertificateSigningRequest.certSigningRequest`
5. Click **Continue**
6. Click **Download** (saves as `ios_distribution.cer`)

**Back in Git Bash:**

```bash
cd ~

# Step 2b: Convert certificate to .pem
# Update the path if your .cer file is elsewhere
openssl x509 -in ~/Downloads/ios_distribution.cer -inform DER -out ios_distribution.pem -outform PEM

# Step 2c: Create .p12 file
# When prompted for password, enter something secure like: MyPass123!
openssl pkcs12 -export -out ios_distribution.p12 \
  -inkey ios_distribution.key \
  -in ios_distribution.pem

# Step 2d: Convert to base64
# Linux/WSL:
base64 -w 0 ios_distribution.p12 > ios_distribution_base64.txt

# macOS (if you get access to a Mac):
# base64 -i ios_distribution.p12 -o ios_distribution_base64.txt

echo "✅ Base64 file created at: $(pwd)/ios_distribution_base64.txt"
echo "📄 Open this file and copy the entire content"
```

---

### Step 3: Add Secrets to GitHub (2 mins)

1. Go to your GitHub repository: https://github.com/YOUR_USERNAME/YOUR_REPO
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

**Add these 6 secrets:**

| Secret Name | Value | Where to Get |
|-------------|-------|--------------|
| `APPLE_TEAM_ID` | `U2398F926G` | ✅ You already have this |
| `APPLE_ASC_KEY_ID` | Copy from Step 1 | Key ID from App Store Connect |
| `APPLE_ASC_KEY_ISSUER_ID` | Copy from Step 1 | Issuer ID from App Store Connect |
| `APPLE_ASC_PRIVATE_KEY` | Copy from Step 1 | Content of .p8 file (all of it!) |
| `APPLE_P12_NEW` | Copy from Step 2 | Content of ios_distribution_base64.txt |
| `APPLE_P12_PASSWORD_NEW` | Copy from Step 2 | The password you entered (e.g., `MyPass123!`) |

**⚠️ IMPORTANT:**
- Copy the ENTIRE content (no spaces before/after)
- For `APPLE_ASC_PRIVATE_KEY`, include the `-----BEGIN PRIVATE KEY-----` lines
- For `APPLE_P12_NEW`, paste the ENTIRE base64 string (it will be very long)

---

### Step 4: Trigger New Build

**Option A: Push new commit**
```bash
cd "/mnt/d/project/tarteel/video calling/mobile-apps/student-app"
git add .
git commit -m "Fix Bundle ID"
git push
```

**Option B: Manual trigger**
1. Go to GitHub repository
2. Click **Actions** tab
3. Click **Build iOS App** workflow
4. Click **Run workflow** button
5. Select branch: `main`
6. Click **Run workflow**

---

## 🎉 Expected Result

After adding secrets and triggering build:

- ✅ Build starts
- ✅ Certificates are imported
- ✅ Provisioning profile auto-generated
- ✅ App is signed successfully
- ✅ `.ipa` file appears in Artifacts

Build time: **10-15 minutes**

---

## 🐛 Troubleshooting

### Still getting "No signing certificate"?
- Check that `APPLE_P12_NEW` is the full base64 string
- Verify `APPLE_P12_PASSWORD_NEW` matches what you entered
- Ensure no extra spaces in any secret

### "Invalid API key"?
- Check `APPLE_ASC_PRIVATE_KEY` includes BEGIN/END lines
- Verify `APPLE_ASC_KEY_ID` and `APPLE_ASC_KEY_ISSUER_ID` are correct

### "No profiles found"?
- Ensure Bundle ID `com.videocall.student` is registered
- Check `APPLE_TEAM_ID` is `U2398F926G`
- Verify API key has "Developer" access

---

## ⏱️ Time Estimate

- Step 1: 5 minutes
- Step 2: 10 minutes
- Step 3: 2 minutes
- Step 4: 15 minutes (build time)

**Total: ~30 minutes** to fix the error completely!

---

## 📝 Checklist

- [ ] Get App Store Connect API Key
- [ ] Download .p8 file
- [ ] Generate certificate request (CSR)
- [ ] Upload CSR to Apple Developer
- [ ] Download certificate (.cer)
- [ ] Convert to .p12 and base64
- [ ] Add all 6 secrets to GitHub
- [ ] Trigger new build
- [ ] ✅ Build succeeds!

---

**Ready?** Start with Step 1 (App Store Connect API Key) - it's the quickest!
