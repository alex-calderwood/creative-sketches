# Run

Start a web server and open index.html.

    npm install -g serve
    serve .

# Notes

# Pseudocode

```
def get_phonemes(word): -> Optional[List[str]] ...

    if dictionary mapping return phonemes
    else return our custom list .mapping
    

current_word = 'Baba'
valid = get_phonemes(current_word)

if valid:
    return valid[-1]

while not valid and current_word:
    current_word = current_word[1:]
    valid = get_phonemes(current_word) #  or get_common_mapping(current_word)

```