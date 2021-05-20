import pandas as pd
import numpy as np
import glob

# alberta = pd.read_json("./output/data-ab.json")
# alberta["province"] = "Alberta"
# alberta["level"] = "Provincial"
# pei = pd.read_json("./output/data-pe.json")
# pei["province"] = "Prince Edward Island"
# pei["level"] = "Provincial"
# newbrunswick = pd.read_json("./output/data-nb.json")
# newbrunswick["province"] = "New Brunswick"
# newbrunswick["level"] = "Provincial"
# saskatchewan = pd.read_json("./output/data-sk.json")
# saskatchewan["province"] = "Saskatchewan"
# saskatchewan["level"] = "Provincial"

li = []

# Read in data.
all_files = glob.glob("./output/*.json")



for filename in all_files:
    frame = pd.read_json(filename)
    li.append(frame)

df = pd.concat(li, axis=0, ignore_index=True)

print(df)