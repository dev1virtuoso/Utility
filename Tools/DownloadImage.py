# Copyright © 2024 Carson. All rights reserved.

from bs4 import BeautifulSoup
import requests
import os

input_image = input("Please enter the image you want to download: ")

response = requests.get(f"https://unsplash.com/s/photos/{input_image}")
soup = BeautifulSoup(response.text, "lxml")

results = soup.find_all("img", {"class": "_2VWD4 _2zEKz"}, limit=5)

image_links = [result.get("src") for result in results]  # Get image source links

for index, link in enumerate(image_links):

    if not os.path.exists("images"):
        os.mkdir("images")  # Create directory

    img = requests.get(link)  # Download the image

    with open("images\\" + input_image + str(index+1) + ".jpg", "wb") as file:  # Open the directory and name the image file
        file.write(img.content)  # Write the image's binary data