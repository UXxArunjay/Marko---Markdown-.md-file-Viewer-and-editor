# 📱 Mobile Expansion Guide: Android & iOS with Capacitor

This guide explains how to package and run **MD File View** as native mobile applications on **Android** and **iOS** using the pre-configured Capacitor setup.

---

## 📋 Prerequisites

### For Android:
1. **Node.js**: Installed (v18+).
2. **Android Studio**: Download from [developer.android.com/studio](https://developer.android.com/studio).
3. **Android SDK & Command-line Tools**: Installed via Android Studio SDK Manager.
4. **Java Development Kit (JDK)**: OpenJDK 17 or 21 (bundled with Android Studio).

### For iOS:
1. **macOS**: Mac computer (MacBook, Mac Mini, iMac).
2. **Xcode**: Version 14+ installed from the Mac App Store.
3. **CocoaPods**: Installed via `sudo gem install cocoapods` or `brew install cocoapods`.

---

## 🚀 Step-by-Step Android Build

### Step 1: Build the Web Distribution
Compile the web frontend into the `./dist` folder:
```bash
npm run build
```

### Step 2: Add the Android Platform
Run the following command once to initialize the native Android project:
```bash
npm run cap:add:android
```
This generates a native Android Studio project inside the `./android` directory.

### Step 3: Sync Web Assets to Android
Whenever you modify your HTML, CSS, or JS code, rebuild and sync:
```bash
npm run build
npm run cap:sync
```

### Step 4: Open in Android Studio & Run
Launch Android Studio with the project:
```bash
npm run cap:open:android
```
In Android Studio:
1. Connect an Android phone via USB (with Developer Mode & USB Debugging enabled) OR start an Android Emulator.
2. Click the green **Play (Run)** button.
3. To generate a release APK: go to **Build > Generate Signed Bundle / APK > APK**.

---

## 🍏 Step-by-Step iOS Build

*(Requires macOS)*

### Step 1: Build Web Distribution
```bash
npm run build
```

### Step 2: Add the iOS Platform
Run once on your Mac:
```bash
npm run cap:add:ios
```
This generates a native Xcode workspace inside `./ios`.

### Step 3: Sync Web Assets to iOS
```bash
npm run build
npm run cap:sync
```

### Step 4: Open in Xcode & Run
Launch Xcode:
```bash
npm run cap:open:ios
```
In Xcode:
1. Select your target device (iPhone Simulator or physical connected iPhone).
2. Under **Signing & Capabilities**, select your Apple Developer Team.
3. Click the **Run** button to install and test the app.

---

## ⚙️ Capacitor Configuration Details

The project includes `capacitor.config.json`:

```json
{
  "appId": "com.markdownview.app",
  "appName": "MD File View",
  "webDir": "dist"
}
```

- **`appId`**: The unique bundle identifier used on Google Play Store and Apple App Store.
- **`appName`**: The display name of the app shown on the home screen.
- **`webDir`**: The directory containing built web assets (`dist`).

---

## 📂 Handling Mobile Files on Android & iOS

The application automatically utilizes:
1. **File Input Fallback**: On mobile browsers and webviews, tapping "Open" triggers the native Android document picker or iOS Files app.
2. **Download Fallback**: Tapping "Save" or "Export" automatically saves files into the mobile device's **Downloads** or **Files** folder.
3. **Native Plugins (Optional enhancement)**: You can install `@capacitor/filesystem` or `@capacitor/share` for direct native file system sandbox access:
   ```bash
   npm install @capacitor/filesystem @capacitor/share
   npx cap sync
   ```
