# Start / stop (Windows server)

```powershell
Start-ScheduledTask -TaskName "FieldAtlasAPI"
```

```powershell
Stop-ScheduledTask -TaskName "FieldAtlasAPI"
```

# Update site after new code

Copying files or `git pull` alone is not enough. The server runs the **built** site in `apps\web\dist`, not the source.

```powershell
cd C:\apps\FieldAtlas
git pull
powershell -ExecutionPolicy Bypass -File .\deploy\windows\deploy.ps1
Stop-ScheduledTask -TaskName "FieldAtlasAPI"
Start-ScheduledTask -TaskName "FieldAtlasAPI"
```

`deploy.ps1` rebuilds the website. Restart picks up the new build.

MapTiler key: put it in `apps\web\.env.local` on the server so deploy picks it up.
