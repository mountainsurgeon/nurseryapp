# Nursery Log starter kit

A free baby tracker two parents share from their own phones. The full
step-by-step guide is the "Build Your Own Nursery Log" document that came with
this kit. This file is the short version.

## Folders

| Path | What it is | Edit it? |
| --- | --- | --- |
| `site/` | The finished app, ready to upload to Netlify | Only `config.js` |
| `site/config.js` | Your Firebase settings go here | Yes |
| `firestore.rules` | Database security rules template | Yes: your emails |
| `watch/Code.gs` | Optional Apple Watch / Siri bridge (Google Apps Script) | Yes: settings block at the top |
| `source/` | Readable app code and build script, for making changes | Only to customize |
| `source/dev/` | A local test page that runs the app against a fake database | No |

## Quick setup

1. Create a Firebase project. Add a Web app and copy its `firebaseConfig` block.
2. Authentication: enable Email/Password and add a user for each parent.
3. Firestore: create a database (Standard edition, production mode), then paste
   `firestore.rules` into the Rules tab with your emails in lowercase, and Publish.
4. Paste your `firebaseConfig` block into `site/config.js` between the markers.
5. Sign in at netlify.com, drag the `site` folder onto app.netlify.com/drop,
   then click **Make public** (new Netlify projects start private).
6. On each phone: open the address in Safari, Share > Add to Home Screen, sign in.

## Changing the app

Edit `source/app.js` (styles are in `site/index.html`), then rebuild:

```
cd source
npm install
npm run build      # writes ../site/app.js
```

Test without Firebase: from this folder run `python3 -m http.server 8000` and
open `http://localhost:8000/source/dev/mock.html` (sign in as mom@example.com,
password `pw`).

Keep the data format unchanged so existing entries keep loading. See
"Notes for the AI" in the guide for the data model and the rules to keep.
