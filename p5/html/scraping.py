import requests
from bs4 import BeautifulSoup

base_url = 'https://www.quantcast.com/top-sites/US/'
html = requests.get(base_url).text

soup = BeautifulSoup(html)
print(soup)
soup.root.x

#container > div.twoColumn > div.left-half > table > tbody