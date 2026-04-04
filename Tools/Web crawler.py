import requests
from bs4 import BeautifulSoup
import json

url = 'https://example.com'
response = requests.get(url)

soup = BeautifulSoup(response.text, 'html.parser')

title = soup.title.text
paragraphs = soup.find_all('p')

data = {
    'url': url,
    'title': title,
    'paragraphs': [p.text for p in paragraphs]
}

json_data = json.dumps(data, indent=4)

output_file = 'output.json'

with open(output_file, 'w') as file:
    file.write(json_data)

print('The data has been saved to:', output_file)
