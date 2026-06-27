; ─────────────────────────────────────────────────────────────────────────────
; Islamic Assistant — Custom NSIS installer / uninstaller hooks
; Included by electron-builder after its own NSIS template (see package.json).
;
; Macros available to override:
;   customInstall        — runs AFTER files are extracted
;   customUnInstall      — runs BEFORE files are removed
;   customRemoveFiles    — runs during file removal (optional)
; ─────────────────────────────────────────────────────────────────────────────

; ── Helpers ───────────────────────────────────────────────────────────────────
; App data paths used in both install and uninstall:
;   $APPDATA\Islamic Assistant          (Roaming: settings, bookmarks, userData)
;   $LOCALAPPDATA\Islamic Assistant     (Local: Chromium cache, GPU, logs)
; ─────────────────────────────────────────────────────────────────────────────


; ═════════════════════════════════════════════════════════════════════════════
; POST-INSTALL — write registry markers & clean up any orphaned old installs
; ═════════════════════════════════════════════════════════════════════════════
!macro customInstall
  ; ── 1. Stable registry marker (supplements electron-builder's own entry) ────
  ;    This key persists even if the installer-generated uninstall entry is
  ;    deleted, giving our own tools a reliable way to locate the install.
  WriteRegStr HKCU "Software\Islamic Assistant" "InstallPath"     "$INSTDIR"
  WriteRegStr HKCU "Software\Islamic Assistant" "Version"         "${VERSION}"
  WriteRegStr HKCU "Software\Islamic Assistant" "UninstallString" \
    '"$INSTDIR\Uninstall Islamic Assistant.exe"'

  ; ── 2. Remove orphaned entries from previous installs ────────────────────
  ;    Old Squirrel-based or differently-keyed NSIS installs leave stale
  ;    registry entries that confuse "Apps & Features" and prevent clean upgrades.

  ; Old NSIS entry with legacy key name
  ReadRegStr $R0 HKCU \
    "Software\Microsoft\Windows\CurrentVersion\Uninstall\islamicassistant" \
    "UninstallString"
  ${If} $R0 != ""
    DeleteRegKey HKCU \
      "Software\Microsoft\Windows\CurrentVersion\Uninstall\islamicassistant"
  ${EndIf}

  ; Old per-machine entry (if someone installed as admin before)
  ReadRegStr $R0 HKLM \
    "Software\Microsoft\Windows\CurrentVersion\Uninstall\islamicassistant" \
    "UninstallString"
  ${If} $R0 != ""
    DeleteRegKey HKLM \
      "Software\Microsoft\Windows\CurrentVersion\Uninstall\islamicassistant"
  ${EndIf}

  ; Squirrel leftover (writes to HKCU\Software\{appName})
  ReadRegStr $R0 HKCU "Software\Islamic Assistant Desktop" "InstallLocation"
  ${If} $R0 != ""
    DeleteRegKey HKCU "Software\Islamic Assistant Desktop"
  ${EndIf}

  ; ── 3. Reset setup-complete flag so the first-run wizard always appears ──
  ;    Electron's isFirstLaunch() checks for this file in %APPDATA%\Islamic
  ;    Assistant\.  Without deleting it, reinstalling over an existing build
  ;    silently skips the setup wizard, leaving location / permissions unconfigured.
  Delete "$APPDATA\Islamic Assistant\setup-complete.json"
!macroend


; ═════════════════════════════════════════════════════════════════════════════
; PRE-UNINSTALL — offer data-deletion choice, then clean registry
; ═════════════════════════════════════════════════════════════════════════════
!macro customUnInstall
  ; ── Ask the user whether to delete personal app data ─────────────────────
  ;    Default is NO (safer) — the user must actively choose to wipe data.
  MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 \
    "Remove Islamic Assistant app data?$\r$\n$\r$\n\
Your prayer settings, bookmarks, azan preferences, and downloaded$\r$\n\
content are stored separately from the application itself.$\r$\n$\r$\n\
    YES  –  Delete all personal data (clean slate if you reinstall)$\r$\n\
    NO   –  Keep your data  (safe to choose if you plan to reinstall)" \
    IDNO isa_keep_data

  ; ── User chose YES: wipe app data ────────────────────────────────────────
  DetailPrint "Removing Islamic Assistant personal data..."

  ; Roaming profile: prayer settings, bookmarks, Quran notes, userData
  RMDir /r "$APPDATA\Islamic Assistant"

  ; Local profile: Chromium cache, GPU cache, Code Cache, logs
  RMDir /r "$LOCALAPPDATA\Islamic Assistant"

  ; Custom registry marker written by customInstall above
  DeleteRegKey HKCU "Software\Islamic Assistant"

  DetailPrint "Personal data removed successfully."
  Goto isa_data_done

  ; ── User chose NO: keep everything ───────────────────────────────────────
  isa_keep_data:
  DetailPrint "Personal data preserved – your settings and bookmarks are intact."

  isa_data_done:

  ; ── Always: remove the stable registry marker (install path no longer valid)
  ;    (electron-builder removes its own Uninstall key automatically)
  DeleteRegValue HKCU "Software\Islamic Assistant" "InstallPath"
  DeleteRegValue HKCU "Software\Islamic Assistant" "UninstallString"
  ; Leave Version key in case diagnostic tools want to know what was installed.
!macroend
