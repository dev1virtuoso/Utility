import pathlib

src = pathlib.Path(__file__).resolve().parent
html = (src / 'index.html').read_text(encoding='utf-8')
css = (src / 'style.css').read_text(encoding='utf-8')
three = (src / 'three.min.js').read_text(encoding='utf-8')
world = (src / 'world.js').read_text(encoding='utf-8')
game = (src / 'game.js').read_text(encoding='utf-8')

html = html.replace('<link rel="stylesheet" href="style.css" />', '<style>\n' + css + '\n</style>')
html = html.replace(
    '<script src="three.min.js"></script>\n  <script src="world.js"></script>\n  <script src="game.js"></script>',
    '<script>\n' + three + '\n</script>\n<script>\n' + world + '\n</script>\n<script>\n' + game + '\n</script>',
)
out = src.parent / 'ember-3d.html'
out.write_text(html, encoding='utf-8')
print(f'wrote {out} ({len(html)} chars, {len(html.encode())} bytes)')
