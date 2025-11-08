# ✅ Certificate Files Created - Next Steps

## 📍 Find Your Files

In **Git Bash**, run:
```bash
# Find where your files are
pwd
ls -la | grep -E "(ios_distribution|CertificateSigningRequest)"
```

The files should be in your home directory (`~`), typically:
- Windows: `C:\Users\skahm\`
- Git Bash: Check with `pwd` command

---

## 📤 Step 1: Upload CSR to Apple (5 minutes)

1. **Find the CSR file:**
   - File name: `CertificateSigningRequest.certSigningRequest`
   - Location: Your home directory (check with `pwd`)

2. **Upload to Apple:**
   - Go to: https://developer.apple.com/account/resources/certificates/add
   - Select: **iOS Distribution (App Store and Ad Hoc)**
   - Click: **Continue**
   - Click: **Choose File**
   - Upload: `CertificateSigningRequest.certSigningRequest`
   - Click: **Continue**
   - Click: **Download** (saves as `ios_distribution.cer`)

3. **Note where you downloaded it** (usually `Downloads` folder)

---

## 🔄 Step 2: Convert Certificate to .p12 (5 minutes)

### In Git Bash, run these commands:

```bash
# Go to home directory
cd ~

# Convert .cer to .pem
# Update the path to where you downloaded the .cer file
openssl x509 -in ~/Downloads/ios_distribution.cer -inform DER -out ios_distribution.pem -outform PEM

# If file not found, try:
# openssl x509 -in /c/Users/YOUR_USERNAME/Downloads/ios_distribution.cer -inform DER -out ios_distribution.pem -outform PEM

echo "✅ Step 1 complete"

# Create .p12 file
# You will be prompted for an EXPORT PASSWORD
# Enter a secure password like: MyPass123!
# REMEMBER THIS PASSWORD - you'll need it for GitHub!
openssl pkcs12 -export -out ios_distribution.p12 \
  -inkey ios_distribution.key \
  -in ios_distribution.pem

echo "✅ Step 2 complete"

# Convert to base64 for GitHub
base64 -w 0 ios_distribution.p12 > ios_distribution_base64.txt

echo "✅ Step 3 complete"
echo "📍 Files created in: $(pwd)"
ls -la | grep ios_distribution
```

---

## 📋 Step 3: Copy the Base64 Content

### Option A: Using Notepad
```bash
# Open the base64 file in Notepad
notepad ios_distribution_base64.txt
```

### Option B: Using cat
```bash
# Display in terminal (copy from terminal)
cat ios_distribution_base64.txt
```

**COPY THE ENTIRE CONTENT** - it will be one very long line of random characters.

---

## 🔑 What You Now Have

After completing the above steps, you'll have **2 of the 6 secrets**:

✅ **APPLE_P12_NEW** = Content of `ios_distribution_base64.txt`
✅ **APPLE_P12_PASSWORD_NEW** = The password you entered (e.g., `MyPass123!`)

---

## 📊 Progress Tracker

**Completed:**
- [x] APPLE_TEAM_ID = `U2398F926G`
- [x] Bundle ID registered = `com.videocall.student`
- [x] Certificate signing request created
- [ ] Certificate uploaded to Apple ← **YOU ARE HERE**
- [ ] Certificate converted to .p12
- [ ] APPLE_P12_NEW obtained
- [ ] APPLE_P12_PASSWORD_NEW set

**Still Need:**
- [ ] APPLE_ASC_KEY_ID (from App Store Connect)
- [ ] APPLE_ASC_KEY_ISSUER_ID (from App Store Connect)
- [ ] APPLE_ASC_PRIVATE_KEY (from App Store Connect)

---

## 🎯 Quick Reference Commands

```bash
# 1. Verify CSR was created
cd ~
ls -la | grep CertificateSigningRequest

# 2. After downloading .cer from Apple:
openssl x509 -in ~/Downloads/ios_distribution.cer -inform DER -out ios_distribution.pem -outform PEM

# 3. Create .p12 (enter password when prompted)
openssl pkcs12 -export -out ios_distribution.p12 -inkey ios_distribution.key -in ios_distribution.pem

# 4. Convert to base64
base64 -w 0 ios_distribution.p12 > ios_distribution_base64.txt

# 5. View/copy the content
cat ios_distribution_base64.txt
# Or open in Notepad:
notepad ios_distribution_base64.txt
```

---

## 💡 Troubleshooting

### "File not found: ~/Downloads/ios_distribution.cer"

Your Downloads folder might be at a different path. Try:
```bash
# Find the file
find /c/Users -name "ios_distribution.cer" 2>/dev/null

# Or manually specify the path:
openssl x509 -in "/c/Users/skahm/Downloads/ios_distribution.cer" -inform DER -out ios_distribution.pem -outform PEM
```

### "Enter Export Password:" - What do I enter?

Enter a secure password like `MyPass123!` or `SecurePass456!`
**REMEMBER IT** - you'll add it to GitHub as `APPLE_P12_PASSWORD_NEW`

### Base64 file is empty

Make sure the .p12 file was created successfully:
```bash
ls -lh ios_distribution.p12
```
It should be a few KB in size.

---

## ⏭️ After This Step

Once you have the base64 content and password:

1. Move on to getting **App Store Connect API Key** (3 more secrets)
2. Add all 6 secrets to GitHub
3. Trigger new build
4. Success! ✅

---

**Current step:** Upload the CSR file to Apple Developer portal and download the certificate!
