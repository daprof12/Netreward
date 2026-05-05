# SDK Hosting Guide: Free Platforms & Implementation

To enable SPs and ISPs to download your SDKs via package managers, you need to host them on public registries. Below are the best free platforms and the steps to set them up.

---

## 1. Web & React Native (NPM)
**Platform**: [npmjs.com](https://www.npmjs.com/)
**Cost**: Free for public packages.

### Steps:
1.  **Create Account**: Sign up at npmjs.com.
2.  **Prepare `package.json`**:
    ```json
    {
      "name": "@netreward/sdk-web",
      "version": "1.0.0",
      "main": "dist/index.js",
      "types": "dist/index.d.ts",
      "publishConfig": {
        "access": "public"
      }
    }
    ```
3.  **Publish**:
    ```bash
    npm login
    npm publish --access public
    ```

---

## 2. Android (Maven via JitPack)
**Platform**: [jitpack.io](https://jitpack.io/)
**Cost**: Free for public GitHub repositories.

### Steps:
1.  **GitHub Repo**: Create a public repository (e.g., `netreward/sdk-android`).
2.  **Add `build.gradle`**: Ensure you have the `maven-publish` plugin configured.
3.  **Release**: Create a "Release" or "Tag" on GitHub (e.g., `v1.0.0`).
4.  **JitPack**: Go to jitpack.io, enter your repo URL, and click "Get it".
5.  **Result**: Developers add `implementation 'com.github.netreward:sdk-android:v1.0.0'`.

---

## 3. iOS (Swift Package Manager)
**Platform**: [GitHub](https://github.com/)
**Cost**: Free.

### Steps:
1.  **GitHub Repo**: Create a public repository (e.g., `netreward/sdk-ios`).
2.  **Add `Package.swift`**:
    ```swift
    import PackageDescription
    let package = Package(
        name: "NetRewardSDK",
        products: [.library(name: "NetRewardSDK", targets: ["NetRewardSDK"])],
        targets: [.target(name: "NetRewardSDK", dependencies: [])]
    )
    ```
3.  **Tag**: Create a git tag (e.g., `1.0.0`).
4.  **Result**: Developers add the GitHub URL directly in Xcode.

---

## 4. Flutter (Pub.dev)
**Platform**: [pub.dev](https://pub.dev/)
**Cost**: Free.

### Steps:
1.  **Prepare `pubspec.yaml`**:
    ```yaml
    name: net_reward_sdk
    version: 1.0.0
    homepage: https://netreward.online
    ```
2.  **Dry Run**: `flutter pub publish --dry-run`
3.  **Publish**: `flutter pub publish`

---

## 5. Universal Option: GitHub Packages
**Platform**: [GitHub Packages](https://github.com/features/packages)
**Cost**: Free for public repositories.

If you want to keep everything in one place, GitHub Packages supports:
- **NPM** (Web)
- **Maven** (Android)
- **NuGet** (C#)
- **RubyGems**
- **Docker**

### Why use GitHub Packages?
- Unified authentication with your source code.
- Great for private enterprise SDKs (though public is free).
- Built-in versioning tied to your GitHub Actions.

---

## Summary Recommendation
For the **NetReward** ecosystem, we recommend:
1.  **NPM** for Web/JS (Industry standard).
2.  **GitHub (Native)** for Swift/iOS (Easiest for devs).
3.  **JitPack** for Android (Zero configuration Maven hosting).
4.  **Pub.dev** for Flutter (Official registry).
