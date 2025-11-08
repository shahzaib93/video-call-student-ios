# Fix P12 Import Error

## ❌ Error: "MAC verification failed during PKCS12 import"

This error is **misleading** - it's usually NOT the password! It's typically:
1. Base64 encoding issue (90% of cases)
2. Corrupted .p12 file
3. Wrong .p12 file uploaded

---

## 🔍 Diagnosis Steps

### Step 1: Verify Your Local .p12 File

In Git Bash, run:

```bash
cd ~

# Check the .p12 file exists and has content
ls -lh ios_distribution.p12

# Test if password works locally
openssl pkcs12 -in ios_distribution.p12 -noout -passin pass:YOUR_PASSWORD_HERE

# Replace YOUR_PASSWORD_HERE with your actual password
```

**Expected output:**
- If password is correct: `MAC verified OK`
- If password is wrong: `Mac verify error: invalid password?`

---

### Step 2: Regenerate Base64 (Likely Fix!)

The issue is often with how base64 was encoded. Try different methods:

#### Method 1: Using base64 with no wrap (Linux/Git Bash)
```bash
cd ~

# Create base64 WITHOUT line wrapping
base64 -w 0 ios_distribution.p12 > ios_distribution_base64_new.txt

# Verify it's one single line
wc -l ios_distribution_base64_new.txt
# Should show: 0 or 1

# View first 100 characters
head -c 100 ios_distribution_base64_new.txt
echo ""
```

#### Method 2: Using Windows certutil (if Git Bash doesn't work)
```powershell
# In PowerShell
cd ~
certutil -encode ios_distribution.p12 ios_distribution_base64_windows.txt

# Remove the header/footer lines
$content = Get-Content ios_distribution_base64_windows.txt | Where-Object { $_ -notmatch "BEGIN|END" }
$content -join "" | Out-File -Encoding ASCII -NoNewline ios_distribution_base64_clean.txt
```

#### Method 3: Python one-liner
```bash
cd ~
python3 -c "import base64; print(base64.b64encode(open('ios_distribution.p12', 'rb').read()).decode())" > ios_distribution_base64_python.txt
```

---

### Step 3: Update GitHub Secret

1. Go to: https://github.com/shahzaib93/video-call-student-ios/settings/secrets/actions
2. Click on **APPLE_P12_NEW**
3. Click **Update**
4. Open **one of the new base64 files** you just created:
   ```bash
   # Method 1 (recommended)
   cat ios_distribution_base64_new.txt

   # Or Method 2
   cat ios_distribution_base64_clean.txt

   # Or Method 3
   cat ios_distribution_base64_python.txt
   ```
5. Copy the **ENTIRE content** (should be one long line, no line breaks!)
6. Paste into GitHub secret
7. Click **Update secret**

---

## 🔍 Common Issues

### Issue 1: Line Breaks in Base64

**Problem:** Base64 contains newlines every 76 characters

**Check:**
```bash
cat ios_distribution_base64.txt | head -5
```

If you see multiple lines like:
```
MIIKvgIBAzCCCnwGCSqGSIb3DQEHAaCCCm0EggppMIIKZTCCBP8GCSqGSIb3DQEH
BqCCBPAwggTsAgEAMIIE5QYJKoZIhvcNAQcBMBwGCiqGSIb3DQEMAQYwDgQIZR7Q
...
```

**Fix:** Use `-w 0` flag to create single line:
```bash
base64 -w 0 ios_distribution.p12 > ios_distribution_base64_fixed.txt
```

### Issue 2: Hidden Characters

**Problem:** Copy-paste added invisible characters

**Fix:** Use `cat` to output and copy from terminal:
```bash
cat ios_distribution_base64_new.txt
# Select all text in terminal, copy
```

### Issue 3: Wrong Password Format

**Problem:** Special characters in password need escaping

**If your password has special characters like `!@#$%`, try:**

1. Update the GitHub secret `APPLE_P12_PASSWORD_NEW`
2. If password is `MyPass123!`, try entering it as: `MyPass123\!` or `"MyPass123!"`
3. Or create a new .p12 with a simpler password (only letters/numbers)

---

## 🔄 Alternative: Create New .p12 with Simple Password

If nothing works, create a fresh .p12 with a simple password:

```bash
cd ~

# Create new .p12 with simple password: "abc123"
openssl pkcs12 -export -out ios_distribution_new.p12 \
  -inkey ios_distribution.key \
  -in ios_distribution.pem \
  -passout pass:abc123

# Verify it works
openssl pkcs12 -in ios_distribution_new.p12 -noout -passin pass:abc123

# Should show: MAC verified OK

# Create base64
base64 -w 0 ios_distribution_new.p12 > ios_distribution_base64_simple.txt

# View the content
cat ios_distribution_base64_simple.txt
```

Then update GitHub secrets:
- `APPLE_P12_NEW` = content of `ios_distribution_base64_simple.txt`
- `APPLE_P12_PASSWORD_NEW` = `abc123`

---

## ✅ Verification Checklist

Before updating GitHub:

```bash
cd ~

# 1. Check file size (should be a few KB)
ls -lh ios_distribution.p12

# 2. Verify password works
openssl pkcs12 -in ios_distribution.p12 -noout -passin pass:YOUR_PASSWORD

# 3. Check base64 is single line
wc -l ios_distribution_base64_new.txt
# Should output: 0 or 1

# 4. Check base64 starts correctly
head -c 50 ios_distribution_base64_new.txt
# Should start with something like: MIIKvgIBAz...

# 5. Check no whitespace at start/end
cat ios_distribution_base64_new.txt | head -c 20
cat ios_distribution_base64_new.txt | tail -c 20
```

---

## 🎯 Quick Fix (Most Likely Solution)

**TL;DR - Do this:**

```bash
cd ~

# Regenerate base64 properly
base64 -w 0 ios_distribution.p12 > p12_fixed.txt

# Copy the content
cat p12_fixed.txt

# Update GitHub secret APPLE_P12_NEW with this new content
# Trigger new build
```

---

## 🔧 Debug: What GitHub Actions is Doing

The workflow does:
```bash
echo "$APPLE_P12" | base64 --decode > signing.p12
```

If this fails, it means the base64 string has issues.

**Test locally:**
```bash
cd ~

# Simulate what GitHub does
echo "YOUR_BASE64_STRING" | base64 --decode > test.p12

# Verify it matches original
diff ios_distribution.p12 test.p12

# Should show no differences
```

---

## 📊 Success Indicators

After fixing and re-running:

✅ Step "Import signing certificate" completes
✅ Next step "Build iOS archive" starts
✅ No "MAC verification failed" error

---

**Most likely fix:** Regenerate the base64 file using `base64 -w 0` and update the GitHub secret!

Let me know what `openssl pkcs12 -in ios_distribution.p12 -noout -passin pass:YOUR_PASSWORD` outputs!
