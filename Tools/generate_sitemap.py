from bs4 import BeautifulSoup
import os

def generate_sitemap(directory):
    urls = []
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.html'):
                filepath = os.path.join(root, file)
                filename = os.path.basename(filepath)
                url = f'file://{filepath}'
                urls.append((filename, url))

    # 生成Sitemap文件
    with open('sitemap.html', 'w', encoding='utf-8') as f:
        f.write('<!DOCTYPE html>\n<html>\n<head>\n<title>Sitemap</title>\n</head>\n<body>\n')
        for filename, url in urls:
            f.write(f'<a href="{url}">{filename}</a><br>\n')
        f.write('</body>\n</html>')

if __name__ == '__main__':
    directory = '/path/to/directory'
    generate_sitemap(directory)
