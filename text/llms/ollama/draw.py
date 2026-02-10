import requests
import base64
import time

DRAW_THINGS_URL = 'http://127.0.0.1:7860/sdapi/v1/txt2img'
BATCH_COUNT = 5
IMG_SIZE = 512
MAX_FILE_NAME_LEN = 30

prompt = 'a computational creativity class'

params = {
    "prompt": prompt,
    "negative_prompt": "(worst quality, low quality, normal quality, (variations):1.4), blur:1.5",
    "seed": -1,
    "steps": 20,
    "guidance_scale": 4,
    "batch_count": BATCH_COUNT,
    "width": IMG_SIZE,
    "height": IMG_SIZE
}

headers = {
    "Content-Type": "application/json"
}

now = int(time.time())

def get_file_name(idx):
    sanitized_prompt = prompt.replace(" ", "_")[:MAX_FILE_NAME_LEN].lower()
    return f"{sanitized_prompt}_{now}_{idx}.png"

def save_img(data, idx):
    file_name = get_file_name(idx)
    with open(file_name, "wb") as img_file:
        img_file.write(base64.b64decode(data))

response = requests.post(DRAW_THINGS_URL, json=params, headers=headers)

if response.status_code == 200:
    data = response.json()
    images = data.get("images", [])
    for idx, img_data in enumerate(images):
        save_img(img_data, idx)
else:
    print(f"Error: {response.status_code}, {response.text}")
