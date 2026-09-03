# سنجه · Sanjeh

A static user-testing platform. Screens participants, runs the session, records
evidence, and assembles the findings into an evidence board. Works for any
product with a web prototype — Mohajer is just the first study in it.

Live: `https://<your-username>.github.io/<repo>/`

---

## Why it exists

Two problems, both of which quietly ruin a research round:

**The wrong people get tested.** Every study here starts with a *behavioural*
screener — it qualifies on what someone has actually done, not on what they say
they are. Options carry a score, and any option can be a hard disqualifier
(people connected to the team are always one: they are the politest and least
useful participants you can get). Rejections are recorded too, because a high
rejection rate tells you your recruiting channel or your segment definition is
wrong, and that is worth knowing before you blame the product.

**The questions get polite answers.** Every question you write is checked
against The Mom Test as you type. Hypotheticals, opinion-seeking, leading
questions, pitching, yes/no and double-barrelled questions are each flagged with
*why* they fail and a concrete rewrite. Past behaviour is data; future
intentions are fiction.

---

## Pages

| File | What it does |
|---|---|
| `index.html` | Hub — every study, with session counts |
| `study.html` | One study: participant link, facilitator link, status |
| `builder.html` | Build or edit a study; the Mom Test linter lives here |
| `run.html` | **Participant runner** — welcome → screener → tasks → questions → export |
| `console.html` | **Facilitator console** — protocol script, timer, tagged note-taking |
| `results.html` | Import sessions, evidence board per hypothesis, CSV/JSON export |
| `guide.html` | How to run a session; try the linter on your own question |

---

## Adding a study

Two ways.

**In the browser** — `builder.html`, fill it in, Save. It lives in that
browser's localStorage only. Use **خروجی JSON** to get the file.

**In the repo** (so the whole team sees it) — put the JSON in `studies/` and add
it to `studies/index.json`:

```json
[ { "file": "mohajer-ws0.json" }, { "file": "your-study.json" } ]
```

A study needs `id`, `name`, `prototypeUrl`, and whichever of `hypotheses`,
`screener`, `tasks`, `postQuestions` you want. `studies/mohajer-ws0.json` is a
complete worked example.

`prototypeUrl` must be **https** and must not send `X-Frame-Options: DENY`, or
the browser will refuse to frame it. GitHub Pages URLs are fine.

---

## The honest constraint

This is a static site so it can run on GitHub Pages with no server, no database
and no cost. The consequence: **nothing is stored centrally.** A session is
recorded in the participant's own browser and leaves as an export — a downloaded
JSON file or a copied blob they send you. You import those in `results.html`.

For remote unmoderated tests, tell the participant up front that the last step
is sending you the code. Most people are recruited through a chat app anyway, so
"paste this back to me" is one message.

**To collect automatically:** set `settings.webhook` on the study to any endpoint
that accepts a POST (Formspree, a Google Apps Script, your own API). Sessions
post themselves on completion. Nothing else changes. It is sent `no-cors`, so
delivery is best-effort — the local copy stays the record of truth.

**Not in this version:** audio/video recording. Use whatever call tool you are
already running the session on.

---

## Data shapes

**Session**
```
{ studyId, code, mode, startedAt, endedAt, completed,
  screener: { answers, score, qualified, reasons[] },
  tasks:    [{ id, title, hypothesis, ms, outcome, note }],
  answers:  { questionId: value },
  notes:    [{ t, tag, text, step }] }
```
`outcome` is one of `done` / `partial` / `stuck` / `wouldnt`.
`tag` is `behaviour` / `explanation` / `commitment` / `quote` / `blocker` / `asked`.

**How the evidence board scores a hypothesis.** Tasks are mapped to hypotheses.
`done` counts for, `stuck` and `wouldnt` count against, `partial` counts as
neither — that ambiguity is exactly what a human has to read. Below three
qualified sessions the board refuses to give a verdict and says so.

---

## Local development

```bash
python -m http.server 8766 --directory platform
```

Opening `index.html` directly from disk mostly works, but `fetch` of the bundled
studies is blocked on `file://`, so studies made in the builder will show and
bundled ones will not. Use the server.
