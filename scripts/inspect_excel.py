"""Optional diagnostic only. Runtime dashboard tetap Node.js/Vercel.
Menampilkan nama sheet tanpa dependency Python eksternal.
"""
import sys, zipfile, xml.etree.ElementTree as ET
p=sys.argv[1] if len(sys.argv)>1 else 'sample/SPW-SOH-Jakarta-1-2.xlsx'
with zipfile.ZipFile(p) as z:
    ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    root=ET.fromstring(z.read('xl/workbook.xml'))
    print('Sheets:')
    for s in root.find('m:sheets',ns): print('-',s.attrib['name'])
