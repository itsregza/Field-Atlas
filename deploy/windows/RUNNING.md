# Start / stop

```powershell
Start-ScheduledTask -TaskName "FieldAtlasAPI"
```

```powershell
Stop-ScheduledTask -TaskName "FieldAtlasAPI"
```

# Update site (after one-time setup below)

```powershell
cd C:\Users\Administrator\Desktop\Field-Atlas-main
powershell -ExecutionPolicy Bypass -File .\deploy\windows\update.ps1
```

# One-time setup (private GitHub, no more copy/paste)

## 1. Make the repo private

On GitHub: **Field-Atlas → Settings → General → Danger zone → Change visibility → Private**

## 2. Install Git on the server

Download and run: https://git-scm.com/download/win  
Leave defaults. **Close and reopen PowerShell** after install.

## 3. Add a deploy key (lets the server pull, read-only)

On the server:

```powershell
ssh-keygen -t ed25519 -C "fieldatlas-server" -f $env:USERPROFILE\.ssh\fieldatlas_deploy -N '""'
Get-Content $env:USERPROFILE\.ssh\fieldatlas_deploy.pub
```

Copy the printed key. On GitHub: **Field-Atlas → Settings → Deploy keys → Add deploy key**  
Title: `Windows server`. Paste the key. Leave **Allow write access** unchecked.

Tell Git to use that key:

```powershell
@"
Host github.com
  HostName github.com
  User git
  IdentityFile $env:USERPROFILE\.ssh\fieldatlas_deploy
  IdentitiesOnly yes
"@ | Set-Content $env:USERPROFILE\.ssh\config
```

## 4. Swap your folder for a git clone

Back up secrets and data first:

```powershell
mkdir C:\fa-backup -Force
copy C:\Users\Administrator\Desktop\Field-Atlas-main\apps\api\.env C:\fa-backup\ -ErrorAction SilentlyContinue
copy C:\Users\Administrator\Desktop\Field-Atlas-main\apps\web\.env.local C:\fa-backup\ -ErrorAction SilentlyContinue
xcopy C:\Users\Administrator\Desktop\Field-Atlas-main\apps\api\data C:\fa-backup\data /E /I /Y
xcopy C:\Users\Administrator\Desktop\Field-Atlas-main\apps\api\uploads C:\fa-backup\uploads /E /I /Y
```

Clone (uses the deploy key):

```powershell
cd C:\Users\Administrator\Desktop
ren Field-Atlas-main Field-Atlas-main-old
git clone git@github.com:itsregza/Field-Atlas.git Field-Atlas-main
```

Restore secrets and data:

```powershell
copy C:\fa-backup\.env C:\Users\Administrator\Desktop\Field-Atlas-main\apps\api\ -ErrorAction SilentlyContinue
copy C:\fa-backup\.env.local C:\Users\Administrator\Desktop\Field-Atlas-main\apps\web\ -ErrorAction SilentlyContinue
xcopy C:\fa-backup\data C:\Users\Administrator\Desktop\Field-Atlas-main\apps\api\data /E /I /Y
xcopy C:\fa-backup\uploads C:\Users\Administrator\Desktop\Field-Atlas-main\apps\api\uploads /E /I /Y
```

First build:

```powershell
cd C:\Users\Administrator\Desktop\Field-Atlas-main
powershell -ExecutionPolicy Bypass -File .\deploy\windows\deploy.ps1
Stop-ScheduledTask -TaskName "FieldAtlasAPI"
Start-ScheduledTask -TaskName "FieldAtlasAPI"
```

Check the scheduled task still points at this folder. If it used the old path, update the task action to match.

After this, every update is just `update.ps1`.

MapTiler key: keep it in `apps\web\.env.local` on the server.
