# GitHub Actions - iOS Build Setup

This repository includes automated iOS build workflow using GitHub Actions.

## 🚀 How It Works

The workflow automatically builds the iOS app whenever you push code to GitHub.

### What It Does:
1. ✅ Installs dependencies
2. ✅ Builds the web assets (React app)
3. ✅ Syncs with Capacitor iOS project
4. ✅ Builds the iOS app for Simulator (Debug)
5. ✅ Uploads the .app file as a downloadable artifact

### What You Get:
- **iOS .app file** - Ready to share with client
- **Build logs** - Proof that iOS compiles successfully
- **No cost** - Completely FREE (GitHub provides macOS runners)

## 📦 How to Download the iOS Build

After pushing your code to GitHub:

1. Go to your GitHub repository
2. Click on **"Actions"** tab
3. Find the latest workflow run
4. Scroll down to **"Artifacts"** section
5. Download **"ios-app-debug"**
6. Extract the .zip file to get the **App.app** file

## 📤 How to Share with Client

You can share the iOS build with your client in two ways:

### Option 1: Direct Download Link
1. Download the artifact from GitHub Actions
2. Upload to Google Drive/Dropbox/WeTransfer
3. Share the link with client
4. Explain: "This is the iOS build file (.app) - ready to install when you have the Apple Developer Account"

### Option 2: GitHub Access
1. Give client read access to your repository
2. They can download artifacts directly from GitHub Actions

## 🔧 Manual Trigger

You can manually trigger the build without pushing code:

1. Go to **Actions** tab
2. Select **"Build iOS App"** workflow
3. Click **"Run workflow"** button
4. Select branch and click **"Run workflow"**

## ⚙️ Build Configuration

- **Platform**: iOS Simulator (Debug configuration)
- **Code Signing**: Disabled (no Developer Account needed)
- **SDK**: iphonesimulator
- **Retention**: Artifacts kept for 30 days

## 📝 Notes

- This builds a **Debug version** for Simulator (not for real devices)
- To build for **real devices**, you need:
  - Apple Developer Account ($99/year)
  - Signing certificates
  - Provisioning profiles
- The current build proves iOS code compiles and is ready for deployment

## 🆘 Troubleshooting

If the build fails:
1. Check the workflow logs in GitHub Actions
2. Ensure `package.json` has all required dependencies
3. Ensure `ios/` folder is committed to git
4. Check that `capacitor.config.ts` is properly configured

## 💰 Cost

**Completely FREE!**
- GitHub provides 2,000 minutes/month of macOS build time for free
- Each build takes ~5-10 minutes
- You can build ~200-400 times per month for free
