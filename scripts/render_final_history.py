"""Render logical development entries without modifying the original commit CSV or Git history."""
from pathlib import Path
from datetime import datetime
from html import escape
import csv
import hashlib
import json
import re

ROOT=Path(__file__).resolve().parents[1]

def main():
    folder=ROOT/'assets/commit-history/final-instrument'
    data=json.loads((folder/'logical_groups.json').read_text(encoding='utf-8'))
    csvpath=folder/'commit_history.csv'
    csv_bytes=csvpath.read_bytes()
    # The provenance export is deliberately read-only.
    assert hashlib.sha256(csv_bytes).hexdigest()==data['original_csv_sha256']
    commits=data['commits']
    by_sha={c['sha']:c for c in commits}
    assigned=[sha for g in data['groups'] for sha in g['commits']]
    assert len(assigned)==len(commits)==len(set(assigned))
    assert set(assigned)==set(by_sha)
    assert list(csv.reader(csvpath.open(encoding='utf-8',newline='')))==[[c['author'],c['date'],c['subject'],c['body']] for c in commits]
    e=escape
    def date(sha): return datetime.fromisoformat(by_sha[sha]['date'])
    groups=sorted(data['groups'],key=lambda g:max(date(sha) for sha in g['commits']),reverse=True)
    count=len(commits)
    repo=data['repository']
    revision=data['revision']
    block='<!-- BEGIN FINAL COMMIT LOG -->\n<details class="commitLog" id="final-commit-log">\n'
    block+=f'<summary>Final instrument development log — {len(groups)} grouped entries ({count} original commits)</summary>\n'
    block+='<p><strong>About the commit timestamps:</strong> I usually draft commit messages in a separate document, then copy and paste them when committing the changes. Some changes were recorded together as separate commits after implementation. Their timestamps indicate when the work was committed, rather than the duration of each development task.</p>\n'
    block+=f'<p>Development tasks are grouped below for readability. Each entry may contain several original Git commits; a grouped entry is not an individual commit. All {count} original commits through <a href="{repo}/commit/{revision}">{revision[:7]}</a> remain traceable. Groups are ordered by their latest original author date; each commit retains its own date and time zone.</p>\n'
    block+=f'<p><a href="./assets/commit-history/final-instrument/commit_history.csv" download>Download the unchanged original {count}-commit CSV</a></p>\n'
    block+='<div class="tableScroll" role="region" aria-label="Grouped final-instrument development history" tabindex="0"><table class="commitTable groupedHistory"><caption>Garden of Sounds — development tasks with original commit references</caption><thead><tr><th scope="col">Development task and summary</th><th scope="col">Original commits and author dates</th></tr></thead><tbody>\n'
    for g in groups:
        block+=f'<tr><td><h4>{e(g["title"])}</h4><p>{e(g["summary"])}</p></td><td><ul class="originalCommits">\n'
        for sha in sorted(g['commits'],key=date,reverse=True):
            c=by_sha[sha]
            block+=f'<li><a href="{repo}/commit/{sha}" title="{e(c["subject"],quote=True)}"><code>{sha}</code></a><time datetime="{e(c["date"],quote=True)}">{e(c["date"])}</time><span class="originalCommitAuthor">{e(c["author"])}</span></li>\n'
        block+='</ul></td></tr>\n'
    block+='</tbody></table></div></details>\n<!-- END FINAL COMMIT LOG -->'
    for name in ('index.html','assignment3.html'):
        path=ROOT/name
        text=path.read_text(encoding='utf-8')
        pattern=r'<!-- BEGIN FINAL COMMIT LOG -->[\s\S]*?<!-- END FINAL COMMIT LOG -->'
        assert len(re.findall(pattern,text))==1
        text=re.sub(pattern,lambda _:block,text)
        text=text.replace('The final instrument’s complete main-branch history is shown below, including the 26–27 October work, with a matching downloadable CSV.', 'The final instrument’s development history is grouped by task below. Every original commit remains linked and dated within its group, and the unchanged CSV preserves all 41 individual commit records.')
        path.write_text(text,encoding='utf-8')
    assert csvpath.read_bytes()==csv_bytes
    print(f'Rendered {len(groups)} logical development entries with all {count} original commit references; CSV unchanged.')

if __name__=='__main__': main()
