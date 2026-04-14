# Pran Sanjeevani — Complete Setup Guide
**AI-Powered Medical PWA for Dr. Anup Kumar Paul**
**Live URL:** https://pran-sanjeevani.web.app

---

## STEP 1 — Install Node.js

1. Go to https://nodejs.org
2. Download **LTS version** (e.g. 20.x)
3. Install it (Next → Next → Finish)
4. Verify: open Command Prompt and type `node -v`
   You should see something like `v20.11.0`

---

## STEP 2 — Extract the ZIP

1. Right-click `Pran-Sanjeevani-Final.zip` → Extract All
2. Extract to a simple path like `C:\PranSanjeevani\`
3. You'll see a folder called `pran-sanjeevani-final`

---

## STEP 3 — Add Your Anthropic API Key

### Get your API key:
1. Go to https://console.anthropic.com
2. Sign in or create account
3. Click API Keys → Create Key
4. Copy the key (starts with sk-ant-...)

### Add it to the app:
1. Open folder `pran-sanjeevani-final`
2. Find file named `.env`
   (If hidden: Windows Explorer → View → Show → Hidden items)
3. Open `.env` with Notepad
4. Replace YOUR_ANTHROPIC_API_KEY_HERE with your key:
   REACT_APP_CLAUDE_API_KEY=sk-ant-api03-xxxxxxxx
5. Save and close

### API Key Safety:
- Set a monthly spend LIMIT at console.anthropic.com → Billing → Limits (e.g. $5/month)
- Each AI diagnosis costs ~$0.001 (less than 1 paisa)
- NEVER share your .env file
- NEVER upload .env to GitHub (already in .gitignore)

---

## STEP 4 — Install Dependencies

Open Command Prompt:
```
cd C:\PranSanjeevani\pran-sanjeevani-final
npm install
```
Wait 2-3 minutes.

---

## STEP 5 — Test Locally First

```
npm start
```
Browser opens at http://localhost:3000
Press Ctrl+C to stop.

---

## STEP 6 — Add Doctor Account in Firebase

1. Go to https://console.firebase.google.com
2. Click Pran Sanjeevani project
3. Authentication → Users → Add user
4. Email: drakthephenomenal@gmail.com
5. Password: choose strong password
6. Click Add user

---

## STEP 7 — Set Firestore Security Rules

1. Firebase Console → Firestore Database → Rules tab
2. Replace all content with:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null
        && request.auth.token.email == "drakthephenomenal@gmail.com";
    }
    match /bookings/{bookingId} {
      allow create: if true;
      allow read: if request.auth != null;
    }
    match /slots/{slotId} {
      allow read: if true;
    }
  }
}

3. Click Publish

---

## STEP 8 — Deploy to Firebase

```
npm install -g firebase-tools
npm run build
firebase login
firebase deploy
```

Live at: https://pran-sanjeevani.web.app

---

## STEP 9 — Install as PWA on Phone

Android (Chrome):
- Open https://pran-sanjeevani.web.app in Chrome
- Tap menu (3 dots) → Add to Home screen → Add

iPhone (Safari):
- Open https://pran-sanjeevani.web.app in Safari
- Tap Share button → Add to Home Screen → Add

---

## STEP 10 — First Time Settings

After login → Settings tab → Fill in:
- Chamber name and address
- Consultation fee and follow-up fee
- bKash number
- Working days and hours
- Max patients per session
- Save Settings

---

## To Update App Later

After any code change:
```
npm run build
firebase deploy
```

---

## Patient Booking Link

Share with patients: https://pran-sanjeevani.web.app/book

---

## Troubleshooting

- npm install fails → Make sure Node.js is installed (node -v)
- Blank screen → Check .env has correct API key
- Login fails → Add user in Firebase Authentication (Step 6)
- AI not working → Check API key + set spend limit at console.anthropic.com
- Firebase deploy fails → Run firebase login again
- Can't see .env → Enable hidden files in Windows Explorer

---

Built with React 18 + Firebase + Anthropic Claude API
For Dr. Anup Kumar Paul | BM&DC: A-128735
