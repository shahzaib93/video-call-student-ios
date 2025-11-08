# What to Upload to GitHub

## ✅ **Files You SHOULD Upload**

### **Source Code & Configuration**
```
✅ src/                          # Your React source code
✅ public/                       # Public assets (images, icons)
✅ index.html                    # Entry point
✅ package.json                  # Dependencies
✅ package-lock.json             # Locked dependencies
✅ capacitor.config.json         # Capacitor configuration
✅ vite.config.js                # Vite build config
```

### **iOS & Android Projects**
```
✅ ios/                          # iOS Xcode project
   ✅ ios/App/App.xcodeproj/     # Xcode project files
   ✅ ios/App/App/               # App source files
   ✅ ios/App/Podfile            # CocoaPods dependencies
   ❌ ios/App/Pods/              # NOT needed (installed during build)
   ❌ ios/App/build/             # NOT needed (build output)

✅ android/                      # Android project
   ❌ android/build/             # NOT needed (build output)
   ❌ android/.gradle/           # NOT needed (Gradle cache)
```

### **GitHub Actions**
```
✅ .github/workflows/            # CI/CD workflows
   ✅ build-ios.yml              # Production iOS build
   ✅ build-ios-debug.yml        # Debug iOS build
```

### **Documentation**
```
✅ README.md                     # (if you have one)
✅ APPLE_DEVELOPER_SETUP.md      # Setup guides
✅ SETUP_CHECKLIST.md
✅ FIX_BUILD_ERROR.md
✅ YOUR_CREDENTIALS.md
✅ GITHUB_ACTIONS_SETUP.md
✅ WHAT_TO_UPLOAD.md (this file)
```

---

## ❌ **Files You Should NOT Upload**

### **🚨 CRITICAL - NEVER UPLOAD THESE! 🚨**
```
❌ *.p12                         # iOS certificates (PRIVATE!)
❌ *.cer                         # Certificate files
❌ *.p8                          # App Store Connect API key (PRIVATE!)
❌ *.key                         # Private keys (VERY SENSITIVE!)
❌ *.mobileprovision             # Provisioning profiles
❌ *_base64.txt                  # Base64 encoded certificates
❌ ios_distribution*             # Certificate files
❌ google-cloud-key.json         # Google Cloud credentials
❌ firebase-service-account*.json # Firebase credentials
❌ .env                          # Environment variables with secrets
```

### **Build Outputs (Auto-generated)**
```
❌ node_modules/                 # NPM packages (huge, reinstalled)
❌ dist/                         # Vite build output
❌ build/                        # Build output
❌ App.app/                      # Built iOS app
❌ *.ipa                         # iOS app package
❌ *.apk                         # Android app package
❌ *.aab                         # Android bundle
❌ ios/App/Pods/                 # CocoaPods (reinstalled)
❌ ios/App/build/                # Xcode build output
❌ android/build/                # Android build output
❌ android/.gradle/              # Gradle cache
```

### **IDE & System Files**
```
❌ .DS_Store                     # macOS system files
❌ .vscode/                      # VS Code settings
❌ .idea/                        # IntelliJ/Android Studio
❌ xcuserdata/                   # Xcode user data
```

---

## 🎯 **Quick Upload Commands**

### **First Time Setup:**

```bash
cd "/mnt/d/project/tarteel/video calling/mobile-apps/student-app"

# Check git status
git status

# Add all files (respects .gitignore)
git add .

# Commit
git commit -m "Initial commit - Student iOS app"

# Add remote (replace with your GitHub repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push
git push -u origin main
```

### **Future Updates:**

```bash
cd "/mnt/d/project/tarteel/video calling/mobile-apps/student-app"

# Check what changed
git status

# Add changes
git add .

# Commit with message
git commit -m "Update: description of changes"

# Push
git push
```

---

## 🔍 **How to Verify What Will Be Uploaded**

Before pushing, check what will be uploaded:

```bash
# See what files are staged
git status

# See what files git is tracking
git ls-files

# Check if a specific file is ignored
git check-ignore -v filename.p12

# See what would be committed
git diff --cached
```

---

## 📊 **Expected Repository Size**

After uploading, your repo should be:
- **Without node_modules:** ~10-50 MB
- **With iOS project:** +5-10 MB
- **Total:** ~15-60 MB

If it's much larger (>200 MB), you might be uploading node_modules or build outputs!

---

## ✅ **Current .gitignore Status**

Your `.gitignore` file is updated to exclude:
- ✅ All sensitive credential files
- ✅ Build outputs
- ✅ node_modules
- ✅ IDE files
- ✅ System files

---

## 🎯 **What GitHub Actions Needs**

GitHub Actions will automatically:
1. ✅ Clone your repository
2. ✅ Run `npm ci` (installs node_modules)
3. ✅ Run `npm run build` (creates dist/)
4. ✅ Run `npx cap sync ios` (syncs to iOS)
5. ✅ Run `pod install` (installs CocoaPods)
6. ✅ Build & sign the iOS app

**You only need to upload source code!** GitHub Actions rebuilds everything.

---

## 🚨 **Security Checklist Before Pushing**

- [ ] No `.p12`, `.cer`, `.p8`, or `.key` files
- [ ] No hardcoded API keys in source code
- [ ] No `.env` files with secrets
- [ ] No `google-cloud-key.json` or Firebase service account files
- [ ] Secrets are in GitHub Secrets (not in code)
- [ ] `.gitignore` is properly configured

---

## 💡 **Pro Tips**

1. **Check before you push:**
   ```bash
   git status
   git diff
   ```

2. **If you accidentally added a secret file:**
   ```bash
   git reset HEAD filename.p12  # Unstage
   git checkout -- filename.p12  # Revert changes
   ```

3. **If you already pushed a secret (URGENT!):**
   - **Revoke/regenerate** the compromised credential immediately
   - Remove from Git history using `git filter-branch` or BFG Repo-Cleaner
   - Contact GitHub Support if needed

---

## ✅ **Summary**

**Upload:**
- Source code (src/, public/, index.html)
- Config files (package.json, capacitor.config.json)
- iOS/Android project files (NOT build outputs)
- Documentation

**DON'T Upload:**
- Credentials (.p12, .p8, .key)
- Build outputs (dist/, node_modules/, App.app/)
- IDE files (.vscode/, xcuserdata/)

**Your .gitignore protects you!** Just use `git add .` safely.

---

Ready to push? Run the commands from the "🎯 Quick Upload Commands" section!
