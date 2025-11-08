# Create iOS Certificate on Windows

## 🐛 Issue: Git Bash Path Conversion

Git Bash on Windows converts `/CN=` to `C:/Program Files/Git/CN=`

## ✅ Solution: Use Double Slashes

```bash
cd ~

# Generate certificate signing request (WINDOWS VERSION)
openssl req -new -newkey rsa:2048 -nodes \
  -keyout ios_distribution.key \
  -out CertificateSigningRequest.certSigningRequest \
  -subj "//CN=Tarteel-Student//C=US"

echo "✅ Created CertificateSigningRequest.certSigningRequest"
echo "📍 Location: $(pwd)/CertificateSigningRequest.certSigningRequest"
```

**Notice:** Use `//CN=` instead of `/CN=` on Windows!

---

## 🔍 Verify It Worked

After running the command, check if files were created:

```bash
ls -la ~/ | grep ios
```

You should see:
```
-rw-r--r-- 1 user user 1704 Nov  8 14:30 ios_distribution.key
-rw-r--r-- 1 user user  989 Nov  8 14:30 CertificateSigningRequest.certSigningRequest
```

---

## 📤 Next Steps

1. ✅ CSR file created: `CertificateSigningRequest.certSigningRequest`

2. **Upload to Apple:**
   - Go to: https://developer.apple.com/account/resources/certificates/add
   - Select **iOS Distribution (App Store and Ad Hoc)**
   - Click **Continue**
   - Upload: `CertificateSigningRequest.certSigningRequest`
   - Click **Continue**
   - **Download** the certificate (saves as `ios_distribution.cer`)

3. **Convert to .p12:**

```bash
cd ~

# Convert .cer to .pem (update path if needed)
openssl x509 -in ~/Downloads/ios_distribution.cer -inform DER -out ios_distribution.pem -outform PEM

# Create .p12 file
# When prompted for password, enter something like: MySecurePass123
openssl pkcs12 -export -out ios_distribution.p12 \
  -inkey ios_distribution.key \
  -in ios_distribution.pem

# Convert to base64
base64 -w 0 ios_distribution.p12 > ios_distribution_base64.txt

echo "✅ All files created!"
echo "📍 Base64 file: $(pwd)/ios_distribution_base64.txt"
```

4. **Copy the base64 content:**

```bash
# Open the file in Notepad
notepad ~/ios_distribution_base64.txt
```

Copy the ENTIRE content (it will be one very long line).

---

## 📋 What You'll Have

After completing these steps:

- ✅ `APPLE_P12_NEW` = Content of `ios_distribution_base64.txt`
- ✅ `APPLE_P12_PASSWORD_NEW` = The password you entered (e.g., `MySecurePass123`)

---

## 🎯 Full Command Summary (Copy-Paste)

```bash
# Step 1: Generate CSR (WINDOWS VERSION)
cd ~
openssl req -new -newkey rsa:2048 -nodes \
  -keyout ios_distribution.key \
  -out CertificateSigningRequest.certSigningRequest \
  -subj "//CN=Tarteel-Student//C=US"

# Check files were created
ls -la ~/ | grep -E "(ios_distribution|CertificateSigningRequest)"

# Step 2: Upload CSR to Apple and download .cer file

# Step 3: Convert .cer to .p12
cd ~
openssl x509 -in ~/Downloads/ios_distribution.cer -inform DER -out ios_distribution.pem -outform PEM
openssl pkcs12 -export -out ios_distribution.p12 -inkey ios_distribution.key -in ios_distribution.pem

# Step 4: Convert to base64
base64 -w 0 ios_distribution.p12 > ios_distribution_base64.txt

# Step 5: Open in Notepad
notepad ~/ios_distribution_base64.txt
```

---

## ⚠️ Alternative: Use WSL Instead of Git Bash

If you have WSL (Windows Subsystem for Linux), you can use the original commands without `//`:

```bash
# In WSL (Ubuntu)
cd ~
openssl req -new -newkey rsa:2048 -nodes \
  -keyout ios_distribution.key \
  -out CertificateSigningRequest.certSigningRequest \
  -subj "/CN=Tarteel-Student/C=US"
```

WSL doesn't have the path conversion issue.

---

## 💡 Troubleshooting

**If you still get path errors:**

Use interactive mode instead:

```bash
cd ~
openssl req -new -newkey rsa:2048 -nodes \
  -keyout ios_distribution.key \
  -out CertificateSigningRequest.certSigningRequest

# It will prompt you for:
# Country Name: US
# State: (leave blank, press Enter)
# City: (leave blank, press Enter)
# Organization: Tarteel
# Common Name: Tarteel-Student
# Email: (leave blank, press Enter)
```

---

**Ready?** Try the command with `//CN=` instead of `/CN=`!
