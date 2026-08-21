# Jal Shakti Board · NLUO

Educational water portal for the Jal Shakti Board, National Law University Odisha.

## Open locally

```bash
python3 -m http.server 8080
```

Open the folder in a browser. 3D view loads Three.js from a CDN.

## Publish

Upload the whole folder (`brand/` + `assets/` + `index.html`) to GitHub Pages, Netlify, or any static host.

## Built in

- EN / हिं toggle
- **2D / 3D** view toggle (remembered)
- Liquid-glass cards in 2D; glass materials + HUD in 3D
- Schematic 2D and 3D campus maps of NLU Odisha, Naraj (educational, not a surveyed GIS plan)
- Quiz: 12 new shuffled questions from a 44-question bank every visit
- A–Z atlas, cycle, save-water, life, SDG 6, pledge, sources
- Committee page and monthly newsletters
- Transparent PNG logos (black backgrounds removed from the supplied files)
- Locked **Edit** desk for members + photos + newsletters

Campus maps follow public NLUO campus descriptions.

## Editor desk

The footer **Edit** link is only for the Board editor and NLUO IT. Passphrases are hashed in `assets/js/content.js` — they are not stored as plain text.

- Editor: `SanchayJal#NLUO`
- IT: `IT.Desk@NLUO`

Change those hashes before a wide public launch if you need new secrets.

**Save on this device** shows photos and letters to anyone using this browser. **Download publish file** gives JSON you can keep with the site records. To show the same list to every visitor after a new issue, replace the arrays in `assets/js/content.js` and re-upload.
