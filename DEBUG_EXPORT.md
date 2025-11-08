# Debug: IPA Export Issue

## ❌ Problem
The export step ran but didn't create the .ipa file.

## 🔍 Common Causes

### 1. Export Method Mismatch
The workflow uses `method: 'development'` but you might not have a development provisioning profile.

### 2. Provisioning Profile Issue
Automatic provisioning might have failed silently.

### 3. Export Path Issue
The .ipa might be created in a different location.

---

## 🔧 Solutions to Try

### Solution 1: Change Export Method to 'ad-hoc'

Ad-hoc distribution works better with automatic provisioning.

Update the workflow to use 'ad-hoc' instead of 'development'.

### Solution 2: Add Debug Output

Add a step to see what files were actually created.

### Solution 3: Use Different Export Options

Some export options work better with certain certificate types.

---

## 📊 Check GitHub Actions Logs

Look for these in the "Export signed IPA" step:

**Success indicators:**
```
** EXPORT SUCCEEDED **
```

**Failure indicators:**
```
error: exportArchive: No applicable devices found
error: exportArchive: No profiles for ... were found
```

---

Let me know what the "Export signed IPA" step logs show!
