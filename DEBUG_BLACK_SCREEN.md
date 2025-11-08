# Fix Black Screen on iOS App

## 🐛 Common Causes

1. **JavaScript error on startup**
2. **Web assets not loaded correctly**
3. **Configuration issue with Capacitor**
4. **Network/API endpoint issue**
5. **iOS WebView compatibility**

---

## 🔍 **Quick Diagnostics**

### **Step 1: Check Safari Web Inspector (Best Method)**

If you have access to a Mac (even temporarily):

1. **Connect iPhone to Mac via USB**
2. **On iPhone:** Settings → Safari → Advanced → Enable **Web Inspector**
3. **On Mac:** Open Safari → Develop menu → Select your iPhone → Select your app
4. **Check Console** for errors

This will show you exactly what's failing!

---

### **Step 2: Check Common Issues**

#### **Issue 1: Server URL Not Set**

Your app might be trying to connect to a server that's not configured.

**Check:** `src/config/environment.js` or similar config files

**Fix:** Make sure server URLs are set for production

#### **Issue 2: Capacitor Config**

Check `capacitor.config.json`:

```json
{
  "server": {
    "androidScheme": "http"
  }
}
```

For iOS, this might cause issues. Should be:

```json
{
  "server": {
    "androidScheme": "https",
    "iosScheme": "capacitor"
  }
}
```

#### **Issue 3: Build Assets Not Included**

The `dist/` folder might not have been copied correctly.

---

## 🔧 **Fixes to Try**

### **Fix 1: Add Better Error Handling**

Let me check your app's entry point and add error logging.

### **Fix 2: Add Splash Screen Timeout**

The splash screen might be covering the app.

### **Fix 3: Check iOS Scheme in Config**

Let me verify your Capacitor configuration.

---

## 📱 **Immediate Workaround**

While I investigate, try:

1. **Force close the app** (swipe up from app switcher)
2. **Delete and reinstall** from Diawi
3. **Restart iPhone**
4. **Check if other apps work** (verify it's not a system issue)

---

Let me check your configuration files...
