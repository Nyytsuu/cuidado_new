plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.cuidado.medihelp"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.cuidado.medihelp"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"

        // Android emulator uses 10.0.2.2 to reach your computer's localhost.
        // For a physical phone, replace both URLs with your computer LAN IP.
        buildConfigField(
            "String",
            "WEB_APP_URL",
            "\"http://10.0.2.2:5173?apiBase=http%3A%2F%2F10.0.2.2%3A5000\""
        )
        buildConfigField("String", "BACKEND_URL", "\"http://10.0.2.2:5000\"")
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}
