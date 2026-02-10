import requests
from bs4 import BeautifulSoup
import os
from urllib.parse import urljoin
import time

def download_audio_files(url):
    # Create a directory for downloads if it doesn't exist
    if not os.path.exists('downloaded_audio'):
        os.makedirs('downloaded_audio')
    
    # Get the webpage content
    try:
        response = requests.get(url)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"Error fetching the webpage: {e}")
        return
    
    # Parse the HTML
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Find all audio elements
    audio_elements = soup.find_all('audio')
    
    # Download each audio file
    for audio in audio_elements:
        source = audio.find('source')
        if source and source.get('src'):
            audio_url = urljoin(url, source['src'])
            filename = os.path.join('downloaded_audio', os.path.basename(audio_url))
            
            try:
                print(f"Downloading: {audio_url}")
                audio_response = requests.get(audio_url)
                audio_response.raise_for_status()
                
                with open(filename, 'wb') as f:
                    f.write(audio_response.content)
                print(f"Successfully downloaded: {filename}")
                
                # Add a small delay to be nice to the server
                time.sleep(1)
                
            except requests.RequestException as e:
                print(f"Error downloading {audio_url}: {e}")

if __name__ == "__main__":
    url = "https://www.orcasound.net/data/product/SRKW/call-catalog/2018-drafts/2018-12-07-spectrum_comparison.html"
    download_audio_files(url) 