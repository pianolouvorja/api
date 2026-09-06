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
rem Acha Chrome em ordem: PATH, ProgramFiles, x86, LocalAppData
set "CANDIDATES=%CHROME_EXE% "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "%LocalAppData%\Google\Chrome\Application\chrome.exe""
for %%C in (%CANDIDATES%) do if exist %%C ( set "CHROME=%%~C" & goto found )
where chrome.exe >nul 2>&1 && ( set "CHROME=chrome.exe" & goto found )
echo Erro: Chrome nao encontrado & exit /b 127
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
      start "" "!CHROME!" --kiosk --app="!SURL!" --user-data-dir="%LOCALAPPDATA%\louvorja-palco-kiosk\screen-!N!" --window-position=%%a,%%b --window-size=%%c,%%d --no-first-run --disable-session-crashed-bubble
    )
  )
)
echo Palco iniciado em !N! tela(s). Para encerrar: feche cada janela (Alt+F4).
endlocal
