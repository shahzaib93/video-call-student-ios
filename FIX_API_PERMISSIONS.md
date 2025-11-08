# Fix: Cloud Signing Permission Error

## ❌ Error
```
error: exportArchive Cloud signing permission error
error: exportArchive No profiles for 'com.videocall.student' were found
```

## 🔍 Root Cause

Your App Store Connect API Key doesn't have permission to manage certificates and profiles.

---

## ✅ Solution: Update API Key Access Level

### Step 1: Go to App Store Connect

1. Visit: https://appstoreconnect.apple.com
2. Click **Users and Access**
3. Click **Integrations** tab (or **Keys** if you see it)
4. Find your API key (the one you created for GitHub Actions)

### Step 2: Check Access Level

**Current:** Probably "Developer" or "Customer Support"
**Required:** **"Admin"** or at minimum **"App Manager"**

### Step 3: Update the Key

**Option A: If you can edit it:**
1. Click on the key name
2. Change **Access** to **"Admin"**
3. Click **Save**

**Option B: If you can't edit it (most likely):**

You need to **create a NEW API key** with correct access:

1. Click **Generate API Key** (the + button)
2. **Name:** `GitHub Actions Admin`
3. **Access:** Select **"Admin"** ✅ (NOT "Developer"!)
4. Click **Generate**
5. **Download the .p8 file IMMEDIATELY**

### Step 4: Update GitHub Secrets

If you created a new key, update these secrets:

1. Go to: https://github.com/shahzaib93/video-call-student-ios/settings/secrets/actions

2. Update these 3 secrets:
   - **APPLE_ASC_KEY_ID** = New Key ID
   - **APPLE_ASC_KEY_ISSUER_ID** = Same Issuer ID (doesn't change)
   - **APPLE_ASC_PRIVATE_KEY** = Content of new .p8 file

---

## 📋 Access Level Comparison

| Access Level | Can Sign Apps? | Works for CI/CD? |
|--------------|----------------|------------------|
| **Admin** ✅ | Yes | Yes |
| **App Manager** ✅ | Yes | Yes |
| **Developer** ❌ | Limited | NO - causes this error |
| **Customer Support** ❌ | No | NO |
| **Finance** ❌ | No | NO |
| **Sales** ❌ | No | NO |

---

## 🎯 Quick Fix Steps

```bash
# 1. Create new Admin-level API key in App Store Connect
# 2. Download the .p8 file
# 3. Get the Key ID and Issuer ID

# 4. Update GitHub secrets:
# - APPLE_ASC_KEY_ID: [new key ID]
# - APPLE_ASC_KEY_ISSUER_ID: [same as before]
# - APPLE_ASC_PRIVATE_KEY: [content of new .p8 file]

# 5. Trigger new build
```

---

## 🔍 How to Check Current Access Level

In App Store Connect → Users and Access → Integrations:

Look at your API key - it will show:
- **Name:** GitHub Actions (or whatever you named it)
- **Key ID:** ABC123XYZ
- **Access:** **[This is the important part!]**

If it says "Developer" or anything other than "Admin" or "App Manager", that's the problem!

---

## ⚠️ Important Notes

1. **You can't change access level** of existing API keys (Apple limitation)
2. **You must create a NEW key** with Admin access
3. **The .p8 file can only be downloaded ONCE** - save it securely!
4. **Old key will still work** for other things, but not for signing
5. **Issuer ID stays the same** - it's tied to your Apple Developer account

---

## 🚀 After Updating

Once you update the secrets with an Admin-level API key:

1. Go to: https://github.com/shahzaib93/video-call-student-ios/actions
2. Click **Build iOS App**
3. Click **Run workflow**
4. Build should succeed and create .ipa file!

---

## 💡 Alternative: Manual Provisioning (If Admin Access Not Possible)

If you can't get Admin access, you'd need to:
1. Manually create provisioning profile on Apple Developer portal
2. Download it
3. Convert to base64
4. Add as GitHub secret
5. Update workflow to use manual signing

But **Admin API key is MUCH easier!**

---

**Action:** Create a new API key with **Admin** access and update the 3 GitHub secrets!
