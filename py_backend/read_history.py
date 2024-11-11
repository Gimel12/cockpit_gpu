import json
import argparse

# FIXME: Add to a json
path = "/usr/local/share/dlbt_os/gen/nvidia-log.txt"

def read_lines():
    with open(path,'r') as f:
        ls = f.readlines()
        d = []
        for l in ls:
            d.append(json.loads(l))
    return d

def read_file():
    d = read_lines()
    return json.dumps(d)

def read_next_logs(num,last_timestamp):
    lines = read_lines()
    idx = -1
    out = []
    if last_timestamp != "":
        for i,l in enumerate(lines):
            if l["timestamp"] == last_timestamp:
                idx = i
                break
    if idx >= 0 and idx < len(lines)-1:
        out = lines[idx+1:idx+1+num]
    return json.dumps(out)        

if __name__ == "__main__":
    cmdline = argparse.ArgumentParser(formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    cmdline.add_argument('--last_log', default="")
    cmdline.add_argument('--batch_size', default="5")
    flags, unk_args = cmdline.parse_known_args()
    out = read_next_logs(int(flags.batch_size),flags.last_log)
    print(out)
