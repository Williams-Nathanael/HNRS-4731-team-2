# HNRS-4731-team-0.5: Harding Campus Events

A simple web page for keeping track of events around campus. Students can:

- **Post an event** with a name, location, date, start time, an optional description, and a style (casual, standard, or formal) that sets its color
- **See events on a calendar**: a week view with full details, or a month view showing each event's time and name. Previous / Next move a week or a month at a time.
- **Search events** by keyword, date range, or time of day

All the events that come with the app are **fictional sample data**.

> **Note:** events you post are saved in *your own browser only*. Other people won't
> see them, and they won't follow you to another device. Sharing events between people
> would need a server or database, which we left out on purpose to keep things simple.

## Preview it on your computer

**Easiest:** download or clone this repo and double-click `index.html`. It opens in your
web browser.

**With a local server** (needed to run the full test suite): if you have Python
installed, open a terminal in this folder and run

```
python3 -m http.server 8000
```

then go to http://localhost:8000 in your browser. Press `Ctrl+C` in the terminal to stop.

## Run the tests

With the local server running, open http://localhost:8000/tests.html. You should see
"All 43 tests passed ✓". If you open `tests.html` by double-clicking instead, only the
logic tests run, because browsers block the tests that click through the page.

## Put it online with GitHub Pages (free)

1. Merge the app into the `main` branch on GitHub.
2. On GitHub, go to the repo's **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to "Deploy from a branch", pick
   **main** and **/ (root)**, and click **Save**.
4. After a minute or two, the page shows your site's address, something like
   `https://<username>.github.io/<repo-name>/`.

GitHub Pages on a free account only works for **public** repositories, and anyone with
the link can see the site. That's fine here because all the data is fictional.

## How the code is organized

| File | What it does |
| --- | --- |
| `index.html` | The structure of the page: header, calendar, forms |
| `style.css` | How it looks. The colors are at the top. |
| `events.js` | The "brains": dates, search, checking the form, saving |
| `sample-data.js` | The fictional events |
| `app.js` | Connects the page to the brains: draws the calendar, handles buttons and forms |
| `tests.html`, `tests.js` | Automatic tests |

Working on this with an AI agent? Read [AGENTS.md](AGENTS.md) first.
