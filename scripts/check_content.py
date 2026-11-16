"""Validate the handover site's content relationships without extra packages."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'dist' / 'data'

def main():
    groups = {name: json.loads((DATA / f'{name}.json').read_text())
              for name in ('phases', 'tasks', 'exhibits', 'templates', 'incidents')}
    errors = []
    indexes = {}
    for name, records in groups.items():
        ids = [item.get('id') for item in records]
        if len(ids) != len(set(ids)) or None in ids:
            errors.append(f'{name}: missing or duplicate id')
        indexes[name] = {item['id']: item for item in records}
    relation_groups = {'taskIds': 'tasks', 'templateIds': 'templates',
                       'exhibitIds': 'exhibits', 'incidentIds': 'incidents', 'nextIds': 'tasks'}
    for name, records in groups.items():
        for record in records:
            for field, target in relation_groups.items():
                for ref in record.get(field, []):
                    if ref not in indexes[target]:
                        errors.append(f'{name}/{record["id"]}: unknown {field} {ref}')
    scheduled = []
    for phase in groups['phases']:
        for task_id in phase['taskIds']:
            scheduled.append(task_id)
            task = indexes['tasks'].get(task_id)
            if task and task['phaseId'] != phase['id']:
                errors.append(f'{task_id}: phase mismatch')
    if len(scheduled) != len(set(scheduled)) or set(scheduled) != set(indexes['tasks']):
        errors.append('Each task must belong to exactly one phase.')
    for task in groups['tasks']:
        for field in ('role', 'prerequisites', 'steps', 'deliverable', 'doneWhen'):
            if not task.get(field):
                errors.append(f'{task["id"]}: missing {field}')
        if task.get('phaseId') not in indexes['phases']:
            errors.append(f'{task["id"]}: unknown phase')
    for template in groups['templates']:
        if not template.get('fields'):
            errors.append(f'{template["id"]}: no fields')
        for field in template.get('fields', []):
            if len(field) != 3 or not all(isinstance(v, str) and v.strip() for v in field):
                errors.append(f'{template["id"]}: field needs label, guidance and sample')
    for exhibit in groups['exhibits']:
        for field in ('purpose', 'creation', 'sampleInput', 'expectedOutput', 'steps', 'limits'):
            if not exhibit.get(field):
                errors.append(f'{exhibit["id"]}: missing {field}')
    if errors:
        raise SystemExit('\n'.join(errors))
    print('Content relationships and required fields: PASS')
    for name, records in groups.items():
        print(f'{name}: {len(records)}')

if __name__ == '__main__':
    main()
