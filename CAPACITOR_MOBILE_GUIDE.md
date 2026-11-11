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

### Step 5: Direct Command-Line APK Build (No Android Studio required)
You can directly compile the Release APK (Signed with dedicated Keystore) from your project root:
```powershell
npm run build:android
```
Or specifically:
```powershell
# For Signed Release APK (Recommended for device install & distribution):
npm run build:android:release

# For Debug APK (Testing only):
npm run build:android:debug
```
The resulting signed release APK will be created at:
`android/app/build/outputs/apk/release/app-release.apk`
(Also automatically copied to `downloads/Marko-1.3.0.apk`)

---

## 🛡️ Android Play Protect & Default App Behavior

### 1. Setting Marko as Default Markdown Viewer
- **Intent Filters Configured**: Marko registers `android.intent.action.VIEW` for `text/markdown`, `text/x-markdown`, `text/plain`, and files with `.md` or `.markdown` extensions.
- **How to Set Default**:
  1. Open your phone's File Manager / Downloads.
  2. Tap on any `.md` file.
  3. Select **Marko** from the list of apps.
  4. Tap **Always** (or **Set as default**).
  5. The file will automatically open inside Marko's reader and editor.

### 2. Google Play Protect Warning on Sideloaded APKs
- **Why Google warns for APKs**: When installing APKs outside the Play Store (sideloading via WhatsApp, USB, or browser), Google Play Protect does not initially recognise the new developer key and displays a warning: *"Unsafe app blocked / Unknown developer"*.
- **Fix Applied**: The app is now built with a dedicated release RSA-2048 keystore (`marko-release-key.jks`) using APK Signature Scheme v2 rather than standard debug keys.
- **To install on your device**:
  1. In the Play Protect prompt, tap **More details**.
  2. Tap **Install anyway**.
  3. *(Optional for testing)*: In Play Store > Profile > Play Protect > Settings (Gear icon), turn off "Scan apps with Play Protect" temporarily.

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
