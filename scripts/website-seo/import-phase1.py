"""Read-only source import. Run with the bundled Python runtime and a source directory."""
import hashlib
import json
import sys
from pathlib import Path
import openpyxl

source = Path(sys.argv[1])
target = Path(__file__).resolve().parents[2] / 'data' / 'seo'
target.mkdir(parents=True, exist_ok=True)
names = ['RideGrid_Launch_Phase1_Travel_Demand_Report_v2.xlsx', 'RideGrid_Phase1_SEO_Keyword_Map_v1.xlsx', 'RideGrid_Phase1_SEO_Keyword_Map_v1.json']
workbook = openpyxl.load_workbook(source / names[0], read_only=True, data_only=True)
tables = {}
for name in ['Cities', 'Travel Areas 105', 'Services', 'Airports', 'Vehicles', 'Routes 210', 'Tours 20']:
    rows = list(workbook[name].values)
    headers = rows[0]
    tables[name] = [{str(key): value for key, value in zip(headers, row) if key} for row in rows[1:] if row[0] is not None]
keywords = json.loads((source / names[2]).read_text(encoding='utf-8-sig'))
assert len(keywords) == 408
keyword_book = openpyxl.load_workbook(source / names[1], read_only=True, data_only=True)
sheet_rows = [row for sheet in keyword_book for row in sheet.values if row and isinstance(row[0], str) and row[0].startswith('RG-P1-')]
assert len(sheet_rows) == 408, f'Keyword workbook rows: {len(sheet_rows)}'
for page, row in zip(keywords, sheet_rows):
    assert page['pageId'] == row[0] and page['canonicalUrl'] == row[6] and page['primaryKeyword'] == row[8], page['pageId']
for page in keywords:
    for field in ['secondaryKeywords', 'transactionalKeywords', 'longTailKeywords', 'questionKeywords', 'excludedKeywords']:
        page[field] = [word.strip() for word in page[field].split('|') if word.strip()]
for name, data in [('phase1-source-data.json', tables), ('phase1-keyword-map.json', keywords), ('phase1-input-provenance.json', {'files': [{'name': name, 'sha256': hashlib.sha256((source / name).read_bytes()).hexdigest()} for name in names], 'keywordWorkbookMatches': True})]:
    (target / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'keywords': len(keywords), 'tables': {key: len(value) for key, value in tables.items()}}))
