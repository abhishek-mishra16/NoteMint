# NoteMint - AI Notes Summarizer

NoteMint converts PDF, DOCX, or TXT notes into a full study pack: summaries, MCQs,
short questions, mind maps, and flashcards. The app stays client-side and stores
study packs, theme, student profile, and mascot name in `localStorage`.

## Upgraded features

- Richer mascot motion on the home screen.
- Clear thinking/analyzing animation during processing with orbit, rings, thought
  bubbles, scan highlight, and progress stages.
- More polished responsive UI with micro-animations.
- Top-right student sign-up, login, and sign-out UI.
- Client-side local student profiles using name and email.
- Custom mascot/character name, persisted locally per browser.
- Preserved note upload, analysis, summary, MCQ, short-question, mind-map,
  flashcard, library, theme, and persistence behavior.

## Architecture

There is no backend and no real server authentication. Student login/sign-up is a
local browser profile stored with `localStorage`, matching the original offline
client-side architecture.

PDF parsing uses `pdf.js` and DOCX parsing uses `mammoth.js` from CDN links in
`index.html`, as in the original project. TXT and sample-note processing work
directly in the browser.

## Project structure

```text
notemint/
├── index.html
├── style.css
├── script.js
├── assets/
│   └── mascot.png
└── README.md
```

The original `assets/mascot.png` was referenced by the uploaded HTML but was not
available in this task's accessible attachments. The UI keeps the same image path
and includes a visual fallback if the file is missing.

## Run locally

```bash
python -m http.server 8765
```

Then open `http://127.0.0.1:8765/index.html`.

## Reference UI upgrade
The dashboard now follows the supplied NoteMint visual reference: rounded glass panels, pastel coral accents, a top-right student profile menu, animated mascot presentation, animated study-processing preview, responsive layouts, and a cleaner student sign-up/login flow. The sign-up/login copy intentionally stays focused on the student's experience.


## Downloading generated study material

After generating a study pack, NoteMint can download:
- Summary as TXT
- MCQs as TXT
- Short Questions as TXT
- Flashcards as CSV
- Mind Map as SVG
- Complete Study Pack as a standalone HTML file containing all sections and the generated mind map

The processing mascot now changes motion for each stage: Reading, Analyzing, Understanding, Organizing, Generating, and Done.
Now NoteMint is ready to use . 
