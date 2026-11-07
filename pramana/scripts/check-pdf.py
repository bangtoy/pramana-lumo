"""Optional visual verification tooling: requires PyMuPDF on the developer host."""
import fitz, json
from pathlib import Path
root = Path('../docs/verification')
doc = fitz.open(root / 'inspection-DT07.pdf')
text = ' '.join(' '.join(page.get_text().split()) for page in doc)
items = ['Cabin & safety equipment', 'Brakes & air system', 'Tyres & wheel nuts', 'Dump body', 'Hydraulic cylinder', 'Body safety prop', 'Tailgate & latch', 'Lights & reflectors']
assert all(name in text for name in items)
assert 'DT-07 is not roadworthy' in text and 'STOP' in text
for index, page in enumerate(doc):
    assert abs(page.rect.width - 595.28) < 1 and abs(page.rect.height - 841.89) < 1
    page.get_pixmap(matrix=fitz.Matrix(1.3, 1.3)).save(root / 'screenshots' / f'pdf-page-{index + 1}.png')
result = {'pages': len(doc), 'items': len(items), 'photoPlacements': sum(len(page.get_image_info()) for page in doc), 'a4': True, 'verdict': True}
assert result['photoPlacements'] == 8
(root / 'pdf-check.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result))
