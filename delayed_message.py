import time
import pyautogui
import pyperclip

message = """Build a complete production-grade **cross-platform Islamic SmartBuild a complete production-grade **cross-platform Islamic Smart Assistant Ecosystem** including mobile apps, web dashboard, desktop apps, backend APIs, cloud services, and smart speaker integrations.

This system is NOT a simple app. It is a full-scale distributed smart ecosystem similar to Alexa / Google Home but specialized for Islamic lifestyle automation (Azan, Quran, scheduling, voice playback, multi-device sync).

---

# 1. CORE PRODUCT DEFINITION

The system is a global Islamic smart assistant that:

* Automatically detects user location
* Calculates prayer times dynamically
* Plays Azan automatically on connected devices
* Provides Quran recitation with translations
* Works across mobile, web, desktop, and smart speakers
* Syncs all devices in real-time
* Works globally (any country, timezone, daylight saving support)

---

# 2. SUPPORTED PLATFORMS

## Mobile Apps

* Android (React Native)
* iOS (React Native)

## Desktop Apps

* Windows (Electron)
* macOS (Electron)
* Linux (Electron optional)

## Web Platform

* Admin dashboard (Next.js / React)

## Backend

* Node.js with NestJS framework (preferred) OR Express.js (modular structure required)

## Cloud Infrastructure

* AWS / GCP / Azure compatible architecture
* Microservices-ready design

---

# 3. SMART SPEAKER & DEVICE INTEGRATION

The system must integrate with:

## External Smart Devices

* Amazon Alexa devices (Alexa Skills Kit integration)
* Google Home / Google Assistant devices (Google Actions / Assistant SDK)
* Bluetooth speakers
* WiFi smart speakers
* Smart TVs (optional future extension)

## Internal Device Sync System

* Mobile phones
* Tablets
* Desktop apps
* Web clients

All devices must:

* Stay synchronized in real-time
* Receive Azan triggers simultaneously
* Play audio in sync with minimal delay differences
* Support grouped devices (home / office / mosque mode)

---

# 4. USER ONBOARDING SYSTEM

On first app launch, user must configure:

## 4.1 Location Detection

* GPS-based location detection
* IP-based fallback location detection
* Timezone detection
* City, country auto mapping

Used for:

* Prayer time calculation
* Azan scheduling
* Qibla direction

---

## 4.2 Islamic Sect / Fiqh Selection

User selects:

* Sunni
* Shia

Fiqh methods:

* Hanafi
* Shafi
* Maliki
* Hanbali
* Jafari

Used for:

* Prayer time calculation differences
* Azan timing rules
* Religious configuration engine

---

## 4.3 Language Selection

Used for UI, AI assistant, Quran translation, and notifications (NOT Azan audio).

Supported languages:

* English
* Urdu
* Arabic
* Pashto
* Chinese
* Japanese
* Turkish
* French
* Hindi
* Bengali
* Others (extensible)

---

# 5. CORE FEATURE 1: AUTO PRAYER TIMING & AZAN SYSTEM

## Features:

* Global prayer time calculation
* Automatic updates based on:

  * Location
  * Timezone
  * DST (Daylight Saving Time)
  * Seasonal changes

## Azan System:

* Automatically triggers Azan at prayer time
* Configurable delay (default 5–10 minutes optional)
* Runs in background services (even app minimized or closed)

## Default Behavior:

* Default Azan voice: Makkah Azan
* User can change Azan to:

  * Makkah
  * Madinah
  * Pakistan style Azan
  * Turkish Azan
  * Egyptian Azan
  * Custom downloadable Azan packs

## Playback System:

* Multi-device simultaneous playback
* Local caching of audio for offline support
* Queue-based audio trigger system

---

# 6. CORE FEATURE 2: QURAN RECITATION SYSTEM

## Audio System:

* Authentic Arabic Quran recitation only (verified sources required)
* High-quality streaming audio

## Translation System:

* Translation shown alongside recitation (NOT replacing Arabic audio)
* Translation language defaults to user's selected native language during onboarding
* User can change translation language anytime independently

## Supported Modes:

* Arabic only recitation
* Arabic + translation synchronized display/audio

## Features:

* Full Quran playback
* Surah-specific playback
* Ayah-level navigation
* Bookmarking

## Scheduling System:

User can schedule Quran recitation:

* Daily
* Weekly
* Custom time-based schedules

Example schedules:

* After Fajr → Surah Yaseen
* After Maghrib → Surah Waqiah
* Before sleep → Surah Mulk

---

# 7. CORE FEATURE 3: SMART SCHEDULING ENGINE

System supports:

* Recurring schedules
* Timezone-aware scheduling
* Prayer-based triggers
* User-defined events

Triggers:

* Azan
* Quran recitation
* Notifications
* Voice announcements

---

# 8. BACKEND ARCHITECTURE

## Backend Stack:

* Node.js (NestJS preferred)
* REST APIs + WebSockets
* Microservice-ready architecture

## Core Services:

1. User Service
2. Prayer Time Engine Service
3. Azan Audio Service
4. Quran Recitation Service
5. Scheduling Engine Service
6. Device Sync Service
7. Notification Service
8. Authentication Service

---

# 9. DATABASE DESIGN (PostgreSQL)

Tables:

## Users

* id
* name
* email
* password_hash
* location
* timezone
* language
* sect
* fiqh_method

## Devices

* id
* user_id
* device_type (mobile/web/speaker)
* device_token
* sync_group

## PrayerTimes

* id
* user_id
* date
* fajr
* dhuhr
* asr
* maghrib
* isha

## AzanSettings

* user_id
* selected_voice
* delay_minutes
* auto_play_enabled

## QuranSchedules

* id
* user_id
* surah
* time
* repeat_type
* translation_language

---

# 10. FRONTEND (MOBILE - REACT NATIVE)

Screens:

* Splash Screen
* Onboarding (Location + Language + Sect)
* Dashboard (Prayer times)
* Azan Settings
* Quran Player
* Quran Scheduler
* Device Sync Manager
* Settings Screen

UI Requirements:

* Islamic modern minimal design
* Dark mode + light mode
* Elegant prayer cards UI
* Smooth animations
* Multi-language support

---

# 11. WEB DASHBOARD

Features:

* User management
* Device monitoring
* Audio upload management
* Analytics
* Subscription management
* Global settings control

---

# 12. REAL-TIME SYSTEMS

* WebSockets for live device sync
* Event-driven architecture for Azan triggers
* Queue system for audio playback (Redis/BullMQ recommended)

---

# 13. AUTHENTICATION SYSTEM

* JWT-based authentication
* OAuth optional (Google/Apple login)
* Secure device linking system
* Multi-device login support

---

# 14. AUDIO SYSTEM

* Cloud storage (AWS S3 / Cloudflare R2)
* Streaming optimized playback
* Preloading for Azan timing accuracy
* Offline caching support

---

# 15. DEPLOYMENT

* Docker-based deployment
* Kubernetes-ready architecture
* CI/CD pipeline support
* Environment separation:

  * Dev
  * Staging
  * Production

---

# 16. KEY NON-FUNCTIONAL REQUIREMENTS

* Highly scalable (millions of users)
* Low latency audio triggering
* Offline resilience
* Cross-platform compatibility
* Secure data handling
* Minimal battery usage on mobile

---

# FINAL OUTPUT REQUIRED FROM YOU (DEVELOPER)

Generate:

* Full system architecture diagram
* Complete folder structure (frontend + backend)
* API documentation
* Database schema SQL
* React Native full app structure
* Backend NestJS modules
* Web dashboard UI structure
* Device sync architecture
* Audio scheduling engine implementation
* Deployment instructions (Docker + cloud)

This system should be production-ready, scalable, and designed for global Islamic users across all devices.Ecosystem** including mobile apps, web dashboard, desktop apps, backend APIs, cloud services, and smart speaker integrations.

This system is NOT a simple app. It is a full-scale distributed smart ecosystem similar to Alexa / Google Home but specialized for Islamic lifestyle automation (Azan, Quran, scheduling, voice playback, multi-device sync).

---

# 1. CORE PRODUCT DEFINITION

The system is a global Islamic smart assistant that:

* Automatically detects user location
* Calculates prayer times dynamically
* Plays Azan automatically on connected devices
* Provides Quran recitation with translations
* Works across mobile, web, desktop, and smart speakers
* Syncs all devices in real-time
* Works globally (any country, timezone, daylight saving support)

---

# 2. SUPPORTED PLATFORMS

## Mobile Apps

* Android (React Native)
* iOS (React Native)

## Desktop Apps

* Windows (Electron)
* macOS (Electron)
* Linux (Electron optional)

## Web Platform

* Admin dashboard (Next.js / React)

## Backend

* Node.js with NestJS framework (preferred) OR Express.js (modular structure required)

## Cloud Infrastructure

* AWS / GCP / Azure compatible architecture
* Microservices-ready design

---

# 3. SMART SPEAKER & DEVICE INTEGRATION

The system must integrate with:

## External Smart Devices

* Amazon Alexa devices (Alexa Skills Kit integration)
* Google Home / Google Assistant devices (Google Actions / Assistant SDK)
* Bluetooth speakers
* WiFi smart speakers
* Smart TVs (optional future extension)

## Internal Device Sync System

* Mobile phones
* Tablets
* Desktop apps
* Web clients

All devices must:

* Stay synchronized in real-time
* Receive Azan triggers simultaneously
* Play audio in sync with minimal delay differences
* Support grouped devices (home / office / mosque mode)

---

# 4. USER ONBOARDING SYSTEM

On first app launch, user must configure:

## 4.1 Location Detection

* GPS-based location detection
* IP-based fallback location detection
* Timezone detection
* City, country auto mapping

Used for:

* Prayer time calculation
* Azan scheduling
* Qibla direction

---

## 4.2 Islamic Sect / Fiqh Selection

User selects:

* Sunni
* Shia

Fiqh methods:

* Hanafi
* Shafi
* Maliki
* Hanbali
* Jafari

Used for:

* Prayer time calculation differences
* Azan timing rules
* Religious configuration engine

---

## 4.3 Language Selection

Used for UI, AI assistant, Quran translation, and notifications (NOT Azan audio).

Supported languages:

* English
* Urdu
* Arabic
* Pashto
* Chinese
* Japanese
* Turkish
* French
* Hindi
* Bengali
* Others (extensible)

---

# 5. CORE FEATURE 1: AUTO PRAYER TIMING & AZAN SYSTEM

## Features:

* Global prayer time calculation
* Automatic updates based on:

  * Location
  * Timezone
  * DST (Daylight Saving Time)
  * Seasonal changes

## Azan System:

* Automatically triggers Azan at prayer time
* Configurable delay (default 5–10 minutes optional)
* Runs in background services (even app minimized or closed)

## Default Behavior:

* Default Azan voice: Makkah Azan
* User can change Azan to:

  * Makkah
  * Madinah
  * Pakistan style Azan
  * Turkish Azan
  * Egyptian Azan
  * Custom downloadable Azan packs

## Playback System:

* Multi-device simultaneous playback
* Local caching of audio for offline support
* Queue-based audio trigger system

---

# 6. CORE FEATURE 2: QURAN RECITATION SYSTEM

## Audio System:

* Authentic Arabic Quran recitation only (verified sources required)
* High-quality streaming audio

## Translation System:

* Translation shown alongside recitation (NOT replacing Arabic audio)
* Translation language defaults to user's selected native language during onboarding
* User can change translation language anytime independently

## Supported Modes:

* Arabic only recitation
* Arabic + translation synchronized display/audio

## Features:

* Full Quran playback
* Surah-specific playback
* Ayah-level navigation
* Bookmarking

## Scheduling System:

User can schedule Quran recitation:

* Daily
* Weekly
* Custom time-based schedules

Example schedules:

* After Fajr → Surah Yaseen
* After Maghrib → Surah Waqiah
* Before sleep → Surah Mulk

---

# 7. CORE FEATURE 3: SMART SCHEDULING ENGINE

System supports:

* Recurring schedules
* Timezone-aware scheduling
* Prayer-based triggers
* User-defined events

Triggers:

* Azan
* Quran recitation
* Notifications
* Voice announcements

---

# 8. BACKEND ARCHITECTURE

## Backend Stack:

* Node.js (NestJS preferred)
* REST APIs + WebSockets
* Microservice-ready architecture

## Core Services:

1. User Service
2. Prayer Time Engine Service
3. Azan Audio Service
4. Quran Recitation Service
5. Scheduling Engine Service
6. Device Sync Service
7. Notification Service
8. Authentication Service

---

# 9. DATABASE DESIGN (PostgreSQL)

Tables:

## Users

* id
* name
* email
* password_hash
* location
* timezone
* language
* sect
* fiqh_method

## Devices

* id
* user_id
* device_type (mobile/web/speaker)
* device_token
* sync_group

## PrayerTimes

* id
* user_id
* date
* fajr
* dhuhr
* asr
* maghrib
* isha

## AzanSettings

* user_id
* selected_voice
* delay_minutes
* auto_play_enabled

## QuranSchedules

* id
* user_id
* surah
* time
* repeat_type
* translation_language

---

# 10. FRONTEND (MOBILE - REACT NATIVE)

Screens:

* Splash Screen
* Onboarding (Location + Language + Sect)
* Dashboard (Prayer times)
* Azan Settings
* Quran Player
* Quran Scheduler
* Device Sync Manager
* Settings Screen

UI Requirements:

* Islamic modern minimal design
* Dark mode + light mode
* Elegant prayer cards UI
* Smooth animations
* Multi-language support

---

# 11. WEB DASHBOARD

Features:

* User management
* Device monitoring
* Audio upload management
* Analytics
* Subscription management
* Global settings control

---

# 12. REAL-TIME SYSTEMS

* WebSockets for live device sync
* Event-driven architecture for Azan triggers
* Queue system for audio playback (Redis/BullMQ recommended)

---

# 13. AUTHENTICATION SYSTEM

* JWT-based authentication
* OAuth optional (Google/Apple login)
* Secure device linking system
* Multi-device login support

---

# 14. AUDIO SYSTEM

* Cloud storage (AWS S3 / Cloudflare R2)
* Streaming optimized playback
* Preloading for Azan timing accuracy
* Offline caching support

---

# 15. DEPLOYMENT

* Docker-based deployment
* Kubernetes-ready architecture
* CI/CD pipeline support
* Environment separation:

  * Dev
  * Staging
  * Production

---

# 16. KEY NON-FUNCTIONAL REQUIREMENTS

* Highly scalable (millions of users)
* Low latency audio triggering
* Offline resilience
* Cross-platform compatibility
* Secure data handling
* Minimal battery usage on mobile

---

# FINAL OUTPUT REQUIRED FROM YOU (DEVELOPER)

Generate:

* Full system architecture diagram
* Complete folder structure (frontend + backend)
* API documentation
* Database schema SQL
* React Native full app structure
* Backend NestJS modules
* Web dashboard UI structure
* Device sync architecture
* Audio scheduling engine implementation
* Deployment instructions (Docker + cloud)

This system should be production-ready, scalable, and designed for global Islamic users across all devices."""

print("Waiting 20 minutes...")
time.sleep(1200)
print("Pasting message...")
pyperclip.copy(message)
pyautogui.hotkey('ctrl', 'v')
time.sleep(0.5)
pyautogui.press('enter')
print("Message sent!")
