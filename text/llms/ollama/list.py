import requests

response = requests.get("http://localhost:11434/api/tags")
models = response.json()["models"]

for model in models:
    print(model["name"])