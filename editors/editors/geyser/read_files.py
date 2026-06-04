import os

cmu = [
  "S",
  "T",
  "AA",
  "R",
  "IH",
  "NG",
  "P",
  "OY",
  "N",
  "F",
  "AO",
  "ER",
  "K",
  "AH",
  "M",
  "Y",
  "UW",
  "EY",
  "SH",
  "DH",
  "IY",
  "W",
  "Z",
  "OW",
  "L",
  "CH",
  "HH",
  "D",
  "AY",
  "AE",
  "V",
  "EH",
  "JH",
  "B",
  "G",
  "TH",
  "UH",
  "AW",
  "ZH"
]

path = "./assets/"

# n = set()

for phoneme in cmu:
    try:
        filename = path + f'{phoneme}.m4a'
        with open(filename) as f:
            # print('yes', path + f'{phoneme}.m4a')
            pass
    except:
        print('no', path + f'{phoneme}.m4a')