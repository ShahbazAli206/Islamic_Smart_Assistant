; ─────────────────────────────────────────────────────────────────────────────
; Islamic Assistant — Universal Windows Installer
;
; A thin ia32 wrapper that embeds both the x64 and ia32 electron-builder
; installers.  NSIS always produces a 32-bit (ia32) PE, so this file runs on
; every flavour of Windows: 32-bit, 64-bit, and ARM64.
;
; At install-time it:
;   1. Shows a brief "detecting your system" progress window.
;   2. Extracts the matching installer to %TEMP%.
;   3. Launches it (the user sees the full electron-builder installer UI).
;   4. Cleans up the temp file and exits.
;
; Compiled by scripts/build-universal-win.js via electron-builder's bundled
; makensis.  PRODUCT_VERSION is injected by that script with /DPRODUCT_VERSION.
; ─────────────────────────────────────────────────────────────────────────────

; Allow manual testing without the build script
!ifndef PRODUCT_VERSION
  !define PRODUCT_VERSION "1.0.0"
!endif

!define PRODUCT_NAME  "Islamic Assistant"
!define DIST_DIR      "dist"

; These paths must match the `artifactName` pattern in package.json:
;   "${productName} Setup ${version} ${arch}.${ext}"
!define X64_EXE  "${DIST_DIR}\${PRODUCT_NAME} Setup ${PRODUCT_VERSION} x64.exe"
!define IA32_EXE "${DIST_DIR}\${PRODUCT_NAME} Setup ${PRODUCT_VERSION} ia32.exe"

; ── Installer metadata ────────────────────────────────────────────────────────
Name    "${PRODUCT_NAME}"
Caption "${PRODUCT_NAME} Setup"
OutFile "${DIST_DIR}\${PRODUCT_NAME} Setup ${PRODUCT_VERSION}.exe"

; The inner installer handles any elevation it needs.
RequestExecutionLevel user

; Solid LZMA is the best algorithm for large Electron binaries.
; The two builds share most of their content (Next.js bundle, assets, Quran
; audio) so solid compression deduplicates heavily — the combined file is
; typically only 10-25 % larger than a single-arch installer.
SetCompressor /SOLID lzma

; Auto-close the wrapper once the inner installer exits.
AutoCloseWindow true

; ── Headers ───────────────────────────────────────────────────────────────────
!include "MUI2.nsh"   ; modern UI
!include "x64.nsh"    ; ${RunningX64} macro
!include "LogicLib.nsh"

; Single page — just the progress/details view while we extract and hand off.
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

; ── Main Section ──────────────────────────────────────────────────────────────
Section "-Bootstrap" SEC_MAIN
  SetDetailsPrint textonly

  ; ── 1. Detect architecture ─────────────────────────────────────────────────
  ; ${RunningX64} returns TRUE on any 64-bit OS — including ARM64 Windows,
  ; where a 32-bit process runs under WOW64.  ARM64 users therefore receive
  ; the x64 build, which Windows runs via its native x64 emulation layer
  ; (faster than the x86 emulation that the ia32 build would use).
  DetailPrint "Detecting your Windows version..."

  ${If} ${RunningX64}
    DetailPrint "64-bit system detected — selecting x64 installer..."
    SetOutPath $TEMP
    File /oname=isa_bootstrap.exe "${X64_EXE}"
  ${Else}
    DetailPrint "32-bit system detected — selecting ia32 installer..."
    SetOutPath $TEMP
    File /oname=isa_bootstrap.exe "${IA32_EXE}"
  ${EndIf}

  ; ── 2. Hand off to the real installer ────────────────────────────────────
  DetailPrint "Launching Islamic Assistant installer..."
  HideWindow                                   ; hide this brief wrapper
  ExecWait '"$TEMP\isa_bootstrap.exe"' $0      ; wait for the full install UI
  ShowWindow $HWNDPARENT 1                     ; restore (needed if user cancels)

  ; ── 3. Clean up ──────────────────────────────────────────────────────────
  Delete "$TEMP\isa_bootstrap.exe"

  ; Mirror the exit code of the inner installer so CI / silent installs work.
  SetErrorLevel $0
SectionEnd
