with open('ordenes_excel.txt') as f:
    excel = set(f.read().strip().split('\n'))

with open('ordenes_bd_con_fix.txt') as f:
    bd = set([line.strip() for line in f if line.strip() and not line.strip().endswith('affected')])

print('En BD pero NO en Excel:')
print('\n'.join(sorted(bd - excel)))

print('\n\nEn Excel pero NO en BD:')
print('\n'.join(sorted(excel - bd)))
