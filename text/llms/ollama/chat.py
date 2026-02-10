# https://docs.ollama.com/quickstart
import requests

messages = []

while True:
    messages.append({"role": "user", "content": input("> ")})
    response = requests.post("http://localhost:11434/api/chat", json={
        "model": "llama2:latest",
        "messages": messages,
        "stream": False
    })

    message = response.json()["message"]
    messages.append(message)
    # print(message['content'])
    print(response.json()['message'])

