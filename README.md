# LotusScript Class Map

**Version 0.9** — An interactive visual reference for the HCL Domino LotusScript class library, published by [OpenNTF](https://openntf.org).

Based on the original *Domino Objects for LotusScript/COM/OLE* poster published by Lotus Software circa 1997, updated for HCL Domino 14.5.1.

![OpenNTF](openntf_iconlogo_trans_200.png)

---

## Features

- **Interactive map** of all 97 LotusScript classes, with 1,001 properties, 997 methods, and 72 events
- **Click any property or method** to see its full description, parameters, return value, and links to the HCL documentation
- **Search** filters both the sidebar list and highlights matching nodes on the canvas simultaneously
- **Filter by type** — All, UI classes, Backend classes, or classes with Events
- **Hover a node** to highlight its direct neighbours and connections, dimming everything else
- **Hover a link** to reveal the method or property name that creates the relationship (visible above 60% zoom)
- **Auto-saves layout** — drag nodes to arrange your workspace; positions are saved automatically to localStorage and restored on next visit
- **Reset Layout** returns to the default hub-and-spoke arrangement
- **Easter egg** — try the Konami code (↑↑↓↓←→←→BA) for a tribute to the original poster

---

## File Structure

```
├── index.html                        # Main application
├── openntf_iconlogo_trans_200.png    # OpenNTF logo
├── css/
│   └── style.css                     # All styles including retro theme
├── js/
│   └── engine.js                     # JointJS map engine
├── data/
│   └── ls_classes.json               # Class reference data (97 classes)
├── tools/                            # Maintenance tools (not part of the app)
│   ├── README.md                     # Scrape and merge workflow
│   ├── scraper.py                    # HCL docs scraper
│   └── merge.py                      # Merge scraped data into master JSON
├── LICENSE
└── README.md
```

---

## Browser Support

**Recommended: Chrome or Firefox.**

Safari is not supported due to [WebKit bug #23113](https://bugs.webkit.org/show_bug.cgi?id=23113), which affects how `foreignObject` elements render scrollable HTML content inside SVGs. This is a long-standing WebKit limitation unrelated to this application or JointJS.

---

## Running Locally

The app is entirely client-side. Serve it from any static web server — it cannot be opened directly as a `file://` URL because it fetches `data/ls_classes.json` via `fetch()`.

**Using Python:**
```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

**Using Node.js:**
```bash
npx serve .
```

---

## Copyright & Attribution

**Application**
Copyright © 2026 OpenNTF. Licensed under the [Apache License 2.0](LICENSE).

**Class Reference Data**
Sourced from the [HCL Domino Designer 14.5.1 documentation](https://help.hcl-software.com/dom_designer/14.5.1/).
Copyright © HCL Technologies Ltd. All rights reserved.

**Third-Party Libraries**
- [JointJS](https://jointjs.com) 3.7.7 — Mozilla Public License 2.0
- jQuery, Lodash, Backbone.js, Dagre, Graphlib — MIT License