# Assignment website

Edit `index.html`, `assignment1.html`, and `assignment2.html` on `main`.
The assignment link is `./assignment2.html` because both assignment pages and
the home page are in the same directory. They belong to `main`, not the isolated
prototype branches.

## Live links

- Assignment 2: https://wendy-area-1-prototype-1.github.io/My-Instrument-Garden-of-Sounds/assignment2.html
- Prototype 1: https://wendy-area-1-prototype-1.github.io/My-Instrument-Garden-of-Sounds/Prototype-1/
- Prototype 2: https://wendy-area-1-prototype-1.github.io/My-Instrument-Garden-of-Sounds/Prototype-2/
- Prototype 3: https://wendy-area-1-prototype-1.github.io/My-Instrument-Garden-of-Sounds/Prototype-3/

The build reads each prototype from its `Area1_PrototypeN` branch. It assembles
the published files under `_site`; it does not merge or commit those files to
`main`. Each prototype branch continues to contain only its own prototype.

## Publish updates

Pushing `main` builds and publishes the whole website, including the latest
pushed versions of the three prototype branches and their commit logs.

After pushing changes to a prototype branch, open the repository's **Actions**
tab, choose **Publish assignment website**, then **Run workflow** on **main**.
Prototype pushes alone do not trigger this workflow because the workflow file
lives only on `main`. This keeps infrastructure files out of prototype branches.

## Refresh the CSV files and tables manually

First commit your prototype changes and push them to GitHub. On `main`, run:

```bash
git fetch origin
python scripts/build_site.py --refresh-logs
```

Use `python3` if that is your Python command. Commit `assignment2.html` and
`assets/commit-history/` and push `main` to publish the refreshed snapshots.

Each `assets/commit-history/prototype-N/commit_history.csv` contains the original
prototype development commits plus later commits affecting that prototype's
files. `branch_commit_history.csv` contains the complete branch history,
including imports, repository housekeeping, and inherited commits. The A2
tables label the development history explicitly; complete logs remain available
as downloads. Original authors, dates, subjects, and bodies are preserved.

Both CSV exports have the class guide's four columns, in this order, with no
header row: author name, author date, commit subject, commit body. Dates use
ISO 8601 with the original timezone. CSV quoting preserves commas, quotes,
and multiline commit messages; raw comma-separated `git log` output cannot
reliably do that by itself. The HTML tables escape the same data and sit inside
`<details>` elements. No commits or reflections are invented.

Builds always refresh the published tables and CSVs from Git history. They do
not modify the committed source snapshots; use `--refresh-logs` for that.

## Local preview

On `main`, with Python and Git installed:

```bash
git fetch origin
python scripts/build_site.py
python -m http.server 8000 --directory _site
```

Open http://localhost:8000/assignment2.html. The generated `_site` includes all
three prototypes, so the prototype links also work locally. `_site` is ignored
by Git and should not be committed.
