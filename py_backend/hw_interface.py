import argparse
import os
import json

def set_pl(gpu, power_limit):
    # Replace with correct command
    r = os.popen(f"sudo nvidia-smi -i {gpu} -pl {power_limit}").read()
    return r


if __name__ == "__main__":
    cmdline = argparse.ArgumentParser(formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    cmdline.add_argument('--op', default="")
    cmdline.add_argument('--value', default="")
    cmdline.add_argument('--gpu', default="")
    flags, unk_args = cmdline.parse_known_args()
    result = {
        "success": False,
    }
    if flags.op == "" or flags.value == "" or flags.gpu == "":
        print(json.dumps(result))
        exit(1)
    
    if op == "power":
        r = set_pl(int(flags.gpu),int(flags.value))
