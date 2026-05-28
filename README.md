# JoSAA Choice Filler

A modern, open-source web app for organizing your JoSAA counselling preferences.

## Features

- 📂 **Bulk HTML Upload** — Drop multiple JoSAA cutoff pages (saved with Ctrl+S)
- 🔍 **Smart Filters** — Search by institute, branch, round, seat type, quota, gender
- 🎯 **Drag & Drop** — Drag cards from the left panel to your priority list
- 🔢 **Priority Ordering** — Reorder your list via drag-and-drop with live serial numbers
- 💾 **Auto-Save** — Priority list persists via `localStorage`
- ⬇ **Export** — Download your final numbered preference list as `.txt`

## Supported HTML Files

Save the JoSAA Opening & Closing Ranks page using **Ctrl+S** in your browser. The filename should contain the round number, e.g.:
- `JoSAA NIT R1.html`
- `JoSAA IIT Round2.html`
- `cutoffs_r3.html`

## Getting Started

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173)

## Tech Stack

- **Vite** + **React 18**
- **@dnd-kit** for drag-and-drop
- **Tailwind CSS v4**
- Pure client-side — no backend, no data leaves your browser

## Folder Structure

```
src/
  components/
    CutoffCard.jsx      # Left panel card (draggable)
    ExportButton.jsx    # Download .txt
    FileUploader.jsx    # Drag-drop file uploader
    FilterBar.jsx       # Filter controls
    Navbar.jsx          # Top navigation
    PriorityItem.jsx    # Right panel sortable item
    PriorityList.jsx    # Right panel drop zone
  utils/
    localStorage.js     # Persistence helpers
    parseHTML.js        # DOMParser-based HTML extraction
    roundDetect.js      # Filename → round number
  App.jsx
  main.jsx
  index.css
```

## License

MIT
