
import json, subprocess, sys, unicodedata, re
pdf, reg, out = sys.argv[1], sys.argv[2], sys.argv[3]
n = int(re.search(r'Pages:\s+(\d+)', subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout).group(1))
def norm(t): return re.sub(r'\s+', ' ', unicodedata.normalize('NFC', t)).strip().lower()
pages = [norm(subprocess.run(['pdftotext', '-layout', '-f', str(i), '-l', str(i), pdf, '-'], capture_output=True, text=True).stdout) for i in range(1, n+1)]
body_start = next(i for i, p in enumerate(pages) if 'danh mục từ viết tắt' in p) + 1   # index 0-based của trang body đầu tiên
R = json.load(open(reg))
keys = [h['text'] for h in R['headings']] + [f"{f['label']}: {f['text']}" for f in R['figures']] + [f"{f['label']}: {f['text']}" for f in R['tables']]
res, ptr, miss = {}, body_start, []
for k in keys:
    nk = norm(k); probe = nk[:40]
    found = None
    for i in range(ptr, n):
        if probe in pages[i]: found = i; break
    if found is None:
        for i in range(body_start, n):          # thử lại từ đầu với probe ngắn hơn
            if nk[:25] in pages[i]: found = i; break
    if found is None: miss.append(k); continue
    res[nk] = str(found - body_start + 1); ptr = found
json.dump(res, open(out, 'w'), ensure_ascii=False, indent=1)
print(f'pages={n} body_start_pdf={body_start+1} mapped={len(res)} missing={len(miss)}')
for m in miss: print('  MISSING:', m[:70])
