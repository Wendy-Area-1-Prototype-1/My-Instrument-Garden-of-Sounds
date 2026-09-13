"""Build the assignment site from main and the three prototype branches.

Run with --refresh-logs to also update the checked-in A2 tables and CSVs.
Only Python's standard library and Git are required.
"""
import argparse
import csv
import html
import re
import shutil
import subprocess
from pathlib import Path
from urllib.parse import unquote, urlsplit
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = "https://github.com/Wendy-Area-1-Prototype-1/My-Instrument-Garden-of-Sounds"
PROTOTYPES = [
    (1, "6857ed23429499c96515b41a13d849f52a01e680", "892e3446885a67dc927c556901d23bb5a441af18"),
    (2, "723e0ce94a9c138f04f5afb2f9ac68d951d8cdf9", "dfaa007b308771453dc0d620a909dbeb1adfd338"),
    (3, "6f57a9b1e01117d8a3750919e6f25519dc0869f9", "82202afc62d40aace0f357c9ba29536871c4d71c"),
]


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def log_records(*revisions):
    # NUL separators keep commas, quotation marks, and multiline bodies intact.
    raw = git("log", "-z", "--encoding=UTF-8",
              "--format=%H%x00%an%x00%aI%x00%s%x00%b", *revisions).decode("utf-8")
    if not raw:
        return []
    fields = raw.removesuffix("\0").split("\0")
    if len(fields) % 5:
        raise ValueError("Unexpected git log record format")
    return [dict(zip(("sha", "author", "date", "subject", "body"), fields[i:i + 5]))
            for i in range(0, len(fields), 5)]


def prototype_data(number, original_tip, import_commit):
    branch = f"Area1_Prototype{number}"
    # Freeze a revision for this build so files and logs describe the same commit.
    ref = f"refs/remotes/origin/{branch}"
    tip = git("rev-parse", ref).decode().strip()
    for ancestor in (original_tip, import_commit):
        subprocess.run(["git", "merge-base", "--is-ancestor", ancestor, tip], cwd=ROOT, check=True)
    original = log_records(original_tip)
    later = log_records("--full-history", f"{import_commit}..{tip}", "--", f"Prototype-{number}/")
    development = later + original
    full = log_records(tip)
    return dict(number=number, branch=branch, tip=tip, development=development, full=full)


def write_csv(path, records):
    path.parent.mkdir(parents=True, exist_ok=True)
    # Match the class example's four columns and lack of a header row.
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerows([r["author"], r["date"], r["subject"], r["body"]] for r in records)
    with path.open(encoding="utf-8", newline="") as stream:
        expected = [[r["author"], r["date"], r["subject"], r["body"]] for r in records]
        if list(csv.reader(stream)) != expected:
            raise ValueError(f"CSV round-trip failed: {path}")


def log_html(data):
    number = data["number"]
    rows = []
    escape = html.escape
    for record in data["development"]:
        rows.append(
            "<tr>"
            f'<td>{escape(record["author"])}</td>'
            f'<td><time datetime="{escape(record["date"])}">{escape(record["date"].replace("T", " "))}</time></td>'
            f'<td class="commit-subject">{escape(record["subject"])}'
            f'<a class="commit-id" href="{REPOSITORY}/commit/{record["sha"]}" target="_blank" rel="noopener">{record["sha"][:7]}</a></td>'
            f'<td class="commit-body">{escape(record["body"]) or "—"}</td>'
            "</tr>"
        )
    return f'''<details class="commit-log">
    <summary>Commit logs — {len(data["development"])} development commits</summary>
    <p class="log-note">Original prototype development history and later changes to this prototype's files. Repository imports and housekeeping are available in the complete branch CSV.</p>
    <p><a href="./assets/commit-history/prototype-{number}/commit_history.csv" download>Download development CSV</a> · <a href="./assets/commit-history/prototype-{number}/branch_commit_history.csv" download>Download complete branch CSV ({len(data["full"])} commits)</a></p>
    <div class="table-scroll" role="region" aria-label="Prototype {number} commit history" tabindex="0">
        <table class="commit-table">
            <caption>Prototype {number} — newest commits first</caption>
            <thead><tr><th scope="col">Author</th><th scope="col">Author date</th><th scope="col">Commit subject</th><th scope="col">Commit body</th></tr></thead>
            <tbody>{''.join(rows)}</tbody>
        </table>
    </div>
</details>'''


def refresh_logs(destination, template, datasets):
    page = template
    for data in datasets:
        number = data["number"]
        log_dir = destination / "assets" / "commit-history" / f"prototype-{number}"
        write_csv(log_dir / "commit_history.csv", data["development"])
        write_csv(log_dir / "branch_commit_history.csv", data["full"])
        start = f"<!-- BEGIN COMMIT LOG {number} -->"
        end = f"<!-- END COMMIT LOG {number} -->"
        replacement = start + "\n" + log_html(data) + "\n" + end
        page, count = re.subn(re.escape(start) + r".*?" + re.escape(end), lambda _: replacement, page, flags=re.S)
        if count != 1:
            raise ValueError(f"Expected one commit log marker for prototype {number}")
    (destination / "assignment2.html").write_text(page, encoding="utf-8")


def export_prototype(destination, data):
    prefix = f'Prototype-{data["number"]}'
    entries = git("ls-tree", "-rz", data["tip"], "--", prefix).split(b"\0")
    if not any(entries):
        raise ValueError(f"Missing prototype folder: {prefix}")
    for entry in filter(None, entries):
        metadata, encoded_path = entry.split(b"\t", 1)
        mode, kind, blob = metadata.decode().split()
        relative = Path(encoded_path.decode("utf-8"))
        if kind != "blob" or mode not in ("100644", "100755"):
            raise ValueError(f"Unsupported prototype entry: {relative}")
        target = destination / relative
        target.resolve().relative_to(destination.resolve())
        content = git("cat-file", "blob", blob)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        if target.read_bytes() != content:
            raise ValueError(f"Prototype copy differs: {relative}")
    if not (destination / prefix / "index.html").is_file():
        raise ValueError(f"Missing index.html in {prefix}")


class LocalLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for key in ("href", "src"):
            if attrs.get(key):
                self.urls.append(attrs[key])


def check_links(destination):
    errors = []
    for page in destination.rglob("*.html"):
        parser = LocalLinks()
        parser.feed(page.read_text(encoding="utf-8"))
        for url in parser.urls:
            parsed = urlsplit(url)
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            path = unquote(parsed.path)
            target = (destination / path.lstrip("/")) if path.startswith("/") else page.parent / path
            target = target.resolve()
            target.relative_to(destination.resolve())
            if target.is_dir():
                target /= "index.html"
            if not target.is_file():
                errors.append(f"{page.relative_to(destination)}: {url}")
    if errors:
        raise ValueError("Broken local links:\n" + "\n".join(errors))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh-logs", action="store_true")
    args = parser.parse_args()
    if Path(git("rev-parse", "--show-toplevel").decode().strip()).resolve() != ROOT:
        raise ValueError("Script must be inside the website repository")
    datasets = [prototype_data(*prototype) for prototype in PROTOTYPES]
    template = (ROOT / "assignment2.html").read_text(encoding="utf-8")
    if args.refresh_logs:
        refresh_logs(ROOT, template, datasets)
    output = ROOT / "_site"
    # Validate the resolved target before replacing generated files.
    if output.resolve() != ROOT / "_site" or output.is_symlink():
        raise ValueError("The generated output directory must stay inside this repository")
    if output.exists():
        shutil.rmtree(output)
    output.mkdir()
    for pattern in ("*.html", "*.css"):
        for source in ROOT.glob(pattern):
            shutil.copy2(source, output / source.name)
    shutil.copytree(ROOT / "assets", output / "assets")
    for data in datasets:
        export_prototype(output, data)
    refresh_logs(output, template, datasets)
    (output / ".nojekyll").touch()
    check_links(output)
    for data in datasets:
        print(f'Prototype {data["number"]}: {len(data["development"])} development commits; '
              f'{len(data["full"])} complete branch commits; source {data["tip"][:7]}')
    print("Built _site and verified every local HTML link and prototype file.")


if __name__ == "__main__":
    main()
