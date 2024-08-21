import json

# FIXME: Add to a json
path = "/usr/local/share/dlbt_os/gen/nvidia-log.txt"

def read_file():
    with open(path,'r') as f:
        ls = f.readlines()
        d = []
        for l in ls:
            d.append(json.loads(l))
    return json.dumps(d)

if __name__ == "__main__":
    x = read_file()
    start = "*ST*"
    end = "*EN*"
    print(start + x + end)