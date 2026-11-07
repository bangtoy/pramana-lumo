"""Optional verification dependency: PyMuPDF. Run after integration-check.mjs."""
import json
import re
from pathlib import Path
from urllib.request import urlopen
import fitz

root = Path('../docs/verification')
evidence = json.loads((root / 'integration-check.json').read_text())
checks = []
for run in evidence['runs']:
    with urlopen(f"{evidence['base']}/api/laporan/{run['reportId']}") as response:
        report = json.load(response)
    pdf = fitz.open(root / f"demo-{run['run']}-report.pdf")
    text = ''.join(page.get_text() for page in pdf)
    normalize = lambda value: re.sub(r'\W', '', value).lower()
    assert all(normalize(item['nama']) in normalize(text) for item in report['rencana_snapshot']['items'])
    assert f"DEMO-{run['run']} is not roadworthy" in text
    assert all(abs(page.rect.width - 595.28) < 1 and abs(page.rect.height - 841.89) < 1 for page in pdf)
    placements = sum(len(page.get_image_info()) for page in pdf)
    expected = sum(len(item['bukti_ids']) for item in report['hasil'].values())
    assert placements == expected
    for number in set([0, len(pdf) - 1]):
        pdf[number].get_pixmap(matrix=fitz.Matrix(1.3, 1.3)).save(root / 'screenshots' / f"demo-{run['run']}-pdf-{number + 1}.png")
    checks.append({'run': run['run'], 'pages': len(pdf), 'items': len(report['hasil']), 'photos': placements, 'a4': True, 'allItemNames': True, 'verdict': True})
(root / 'demo-pdf-check.json').write_text(json.dumps(checks, indent=2))
print(json.dumps(checks, indent=2))
