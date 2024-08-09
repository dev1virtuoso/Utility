import requests
from bs4 import BeautifulSoup
import json

# Send a GET request to fetch the web page content
url = 'https://example.com'
response = requests.get(url)

# Parse the HTML content
soup = BeautifulSoup(response.text, 'html.parser')

# Extract the desired information
# This is just an example, you can modify and expand this code as per your needs
title = soup.title.text
paragraphs = soup.find_all('p')

# Create a dictionary to store the extracted data
data = {
    'url': url,
    'title': title,
    'paragraphs': [p.text for p in paragraphs]
}

# Convert the dictionary to JSON format
json_data = json.dumps(data, indent=4)

# Specify the output file path
output_file = 'output.json'

# Save the JSON data to the output file
with open(output_file, 'w') as file:
    file.write(json_data)

# Print the file path
print('The data has been saved to:', output_file)
