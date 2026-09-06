@echo off
rem LouvorJA PIANO — Palco kiosk multi-monitor (Windows)
rem Uso: palco-kiosk.cmd --url "https://.../palco/?code=ABC123" [--all | --screen X,Y,L,A ...]
rem Cada monitor vira slot N na URL (tela 1 = slot 1, tela 2 = slot 2...).
setlocal EnableDelayedExpansion
set "URL="
set "CHROME_EXE="
set "SCREENS="

:parse
if "%~1"=="" goto run
if /i "%~1"=="--url" ( set "URL=%~2" & shift & goto parse )
if /i "%~1"=="--screen" ( set "SCREENS=!SCREENS!;%~2" & shift & goto parse )
if /i "%~1"=="--all" ( set "ALL=1" & shift & goto parse )
shift
goto parse

:run
if not defined URL ( echo Erro: --url obrigatorio & exit /b 1 )
rem Browser-agnostic: Edge (Chromium, mesmo flag) > Chrome > Brave > Firefox.
rem Firefox aceita -kiosk mas ignora --window-position de forma confiavel —
rem multi-monitor por bounds e' garantido so' na familia Chromium.
set "BROWSER="
set "FLAGS=--kiosk --app"
set "CANDIDATES="
rem Edge primeiro: vem pre-instalado em todo Windows 10/11
set "CANDIDATES=!CANDIDATES! "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe""
set "CANDIDATES=!CANDIDATES! "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "%LocalAppData%\Google\Chrome\Application\chrome.exe""
set "CANDIDATES=!CANDIDATES! "%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe""
set "CANDIDATES=!CANDIDATES! "%ProgramFiles%\Mozilla Firefox\firefox.exe" "%ProgramFiles(x86)%\Mozilla Firefox\firefox.exe""
for %%C in (%CANDIDATES%) do if not defined BROWSER if exist %%C ( set "BROWSER=%%~C" )
if not defined BROWSER (
  where msedge.exe >nul 2>&1 && ( set "BROWSER=msedge.exe" & goto found )
  where chrome.exe >nul 2>&1 && ( set "BROWSER=chrome.exe" & goto found )
  where firefox.exe >nul 2>&1 && ( set "BROWSER=firefox.exe" & goto found )
)
if not defined BROWSER ( echo Erro: nenhum browser suportado encontrado (Edge/Chrome/Brave/Firefox) & exit /b 127 )
echo !BROWSER! | find /i "firefox" >nul && ( set "FLAGS=-kiosk" & set "APPFLAG=" ) || set "APPFLAG=--app"
:found

rem Detecta monitores via .NET (System.Windows.Forms.Screen — coordenadas virtuais)
set "PS_DETECT=powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::AllScreens | ForEach-Object { \"$($_.Bounds.X),$($_.Bounds.Y),$($_.Bounds.Width),$($_.Bounds.Height)\" }""

set "MONITORS="
if defined ALL (
  for /f "usebackq delims=" %%M in (`%PS_DETECT%`) do set "MONITORS=!MONITORS!;%%M"
) else (
  set "MONITORS=%SCREENS%"
)
if "%MONITORS:~1%"=="" ( echo Erro: nenhum monitor detectado & exit /b 2 )

set /a N=0
for %%M in ("%MONITORS:;=" "%") do (
  set "GEO=%%~M"
  if not "!GEO!"=="" (
    set /a N+=1
    for /f "tokens=1-4 delims=," %%a in ("!GEO!") do (
      rem slot=N na URL: se ja tem slot=, substitui pelo slot desta tela
      set "SURL=!URL!"
      echo(!SURL!| findstr /r "slot=[0-9]" >nul
      if not errorlevel 1 (
        set "SURL=!SURL:slot=[SL]!"
        set "SURL=!SURL:[SL]=!N!"
      ) else set "SURL=!SURL!&slot=!N!"
      echo Tela !N! (slot !N!): !SURL!
      if defined APPFLAG (
        start "" "!BROWSER!" !FLAGS! %APPFLAG%="!SURL!" --user-data-dir="%LOCALAPPDATA%\louvorja-palco-kiosk\screen-!N!" --window-position=%%a,%%b --window-size=%%c,%%d --no-first-run --disable-session-crashed-bubble
      ) else (
        start "" "!BROWSER!" !FLAGS! "!SURL!" --window-position=%%a,%%b --window-size=%%c,%%d --no-first-run
      )
    )
  )
)
echo Palco iniciado em !N! tela(s). Para encerrar: feche cada janela (Alt+F4).
endlocal
