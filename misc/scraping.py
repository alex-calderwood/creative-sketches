import urllib.request

from bs4 import BeautifulSoup


def scrape_links(full_url):
    print('scraping', full_url)
    page = urllib.request.urlopen(full_url)
    soup = BeautifulSoup(page, features="html.parser")
    # print(soup.findAll('link'))
    icon_link = soup.find("link", rel="shortcut icon")
    # print('ic', icon_link['href'])
    icon = urllib.request.urlopen(icon_link['href'])
    return icon


for url in open('assets/Quantcast-Top-Million.txt', 'r').readlines()[6:1006]:
    url = url.split('\t')[1].strip()
    full_url = 'http://' + url + '/'
    try:
        icon = scrape_links(full_url)
        with open("assets/icons/" + url + ".ico", "wb") as f:
            f.write(icon.read())
    except Exception:
        print('None')