# Field Atlas mobile

Expo (React Native) app. Login-required; shares the website API.

## On your phone (Expo Go)

`http://127.0.0.1:8787` is the **API**, not the app. Your phone cannot open that.

1. Install **Expo Go** from the App Store / Play Store.
2. Put phone and PC on the **same Wi‑Fi**.
3. On the PC:

```bash
cd apps/mobile
npx expo start --lan
```

4. Scan the QR code with Expo Go (Android) or the Camera app (iPhone).
5. On the login screen tap **Continue in demo mode**.

If the QR fails, in the terminal press `s` to switch to tunnel mode, or open the `exp://192.168.x.x:8081` URL Expo prints.

For a live API from the phone, set in `.env`:

```
EXPO_PUBLIC_API_URL=http://YOUR_PC_LAN_IP:8787
```

(example: `http://192.168.0.12:8787`) and restart Expo. Also run `npm run dev:api` on the PC.

## On this PC (browser)

```bash
cd apps/mobile
npm start
# press w
```

Opens at http://localhost:8081
