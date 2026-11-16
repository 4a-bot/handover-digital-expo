"""Generate actual downloadable Markdown forms from the authoritative JSON."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def cell(value):
    return value.replace('|', '\\|').replace('\n', '<br>')

def main():
    templates = json.loads((ROOT / 'dist/data/templates.json').read_text())
    output = ROOT / 'dist/downloads'
    output.mkdir(exist_ok=True)
    for template in templates:
        for sample in (False, True):
            suffix = 'example' if sample else 'blank'
            title = '填寫示例' if sample else '空白範本'
            lines = [f'# {template["title"]}｜{title}', '', template['purpose'], '',
                     f'使用時機：{template["when"]}', '',
                     '此示例用於說明填寫方式，未填寫的檢查結果不代表已通過驗證。' if sample
                     else '請依實際情況填寫；未確認的事項請保留待確認狀態。', '',
                     '| 欄位 | 填寫說明 | 內容 |', '| --- | --- | --- |']
            for label, guidance, example in template['fields']:
                lines.append('| ' + ' | '.join(cell(v) for v in (label, guidance, example if sample else '待填')) + ' |')
            filename = output / f'{template["id"]}-{suffix}.md'
            filename.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'Generated {len(templates) * 2} downloadable Markdown files.')

if __name__ == '__main__':
    main()
