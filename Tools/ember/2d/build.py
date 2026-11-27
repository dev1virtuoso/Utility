import pathlib

src = pathlib.Path(__file__).resolve().parent
html = (src / 'index.html').read_text(encoding='utf-8')
css = (src / 'style.css').read_text(encoding='utf-8')
sim = (src / 'sim.js').read_text(encoding='utf-8')
city = (src / 'city.js').read_text(encoding='utf-8')
ren = (src / 'renderer.js').read_text(encoding='utf-8')
ui = (src / 'ui.js').read_text(encoding='utf-8')

html = html.replace('<link rel="stylesheet" href="style.css" />', '<style>\n' + css + '\n</style>')
html = html.replace(
    '<script src="sim.js"></script>\n<script src="city.js"></script>\n<script src="renderer.js"></script>\n<script src="ui.js"></script>',
    '<script>\n' + sim + '\n</script>\n<script>\n' + city + '\n</script>\n<script>\n' + ren + '\n</script>\n<script>\n' + ui + '\n</script>',
)
out = src.parent / 'ember-wildfire.html'
out.write_text(html, encoding='utf-8')
print(f'wrote {out} ({len(html)} chars)')
