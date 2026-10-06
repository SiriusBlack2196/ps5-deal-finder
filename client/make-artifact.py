# Turns dist-artifact/index.html into a claude.ai artifact page fragment
# (title + styles + body + scripts; the host supplies doctype/head/body).
import re
h = open('dist-artifact/index.html', encoding='utf-8').read()
title = re.search(r'<title>.*?</title>', h, re.S).group(0)
styles = re.findall(r'<style[^>]*>.*?</style>', h, re.S)
def ascii_js(js):
    # \uXXXX is valid inside JS strings, template literals and regex literals alike.
    return ''.join(c if ord(c) < 128 else (f'\\u{ord(c):04x}' if ord(c) < 0x10000 else ''.join(f'\\u{u:04x}' for u in __import__('struct').unpack('<2H', c.encode('utf-16-le')))) for c in js)
scripts = [ascii_js(x) for x in re.findall(r'<script[^>]*>.*?</script>', h, re.S)]
links = []  # favicon: the artifact host sets its own tab icon
meta = re.findall(r'<meta name="(?:description|theme-color)"[^>]*>', h)
body = re.search(r'<body[^>]*>(.*)</body>', h, re.S).group(1)
body = re.sub(r'<script[^>]*>.*?</script>', '', body, flags=re.S)
out = '\n'.join([title, *meta, *links, *styles, body.strip(), *scripts]) + '\n'
open('dist-artifact/ps5-deal-finder.html', 'w', encoding='utf-8').write(out)
print('non-ascii in styles:', sum(1 for st in styles for c in st if ord(c)>127)); print('artifact page:', len(out.encode()) // 1024, 'KB; non-ascii chars in scripts:', sum(1 for s in scripts for c in s if ord(c) > 127))
