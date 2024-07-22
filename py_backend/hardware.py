import GPUtil
import os
import numpy.random as rnd
import subprocess 
import re
from modules.cred.credentials import min_get_pass
ov_script = """
#!/bin/sh

# README
# Before proceeding make sure that you set your coolbits to 31
# Open a terminal and do
# $ sudo nvidia-xconfig -a --cool-bits=31 --allow-empty-initial-configuration

# To be able to set the power limit you need to enable sudo commands without password
# Do 
# $ sudo visudo
# And then at the end of the file add the following while changing username to your user
# Note the tabs after username as otherwise it won't work
# username        ALL = (ALL) NOPASSWD: /usr/bin/nvidia-persistenced
# username        ALL = (ALL) NOPASSWD: /usr/bin/nvidia-smi
# Reboot the system now and continue setting the OC limits 

# =========================== Define OC limts ===========================================
# Fans speed is in %
FANS_SPEED=65
# ========================================================================================
# It is advisable not to change anything below this line if you don't know what you are doing

SET='/usr/bin/nvidia-settings'

#Set Power Limit
$power_line



#Send notification
#notify-send "OC Done: Fans = $FANS_SPEED% | GPU=$GPU_OFFSET | Memory=$MEMORY_OFFSET" -t 4000 -i messagebox_info

# Check how many GPUs on the system and check if the GPUs are RTX 40 series then set the clocks speeds for all of them
arr=$gpu_selection

for i in $arr; do
    ${SET} -a [gpu:${i}]/GpuPowerMizerMode=1
    $fan_line
    $oc_line
    $memory_line
done
"""
EMPTY_CMD = 'echo "Ignoring other parameters..."'

class HardwareInterface():
    
    def __init__(self, num_virtuals = 0):
        self.num_virtuals = num_virtuals
        self.devices = []
        self.init_devs()
        self.script_mode = "production" # ddecides whether the commands actually run on the PC (production) or not (dev)
        # print(self.devices)
        
    def init_devs(self):
        d = []
        i = 0
        # real gpus 
        for g in GPUtil.getGPUs():
            x = {
                'id': g.id,
                'name': g.name,
                'virtual': False
            }
            i+= 1
            d.append(x)
        
        # virtual gpus (for debugging purposes)
        for v in range(self.num_virtuals):
            x = {
                'id': i,
                'name': 'VGPU #' + str(i),
                'virtual': True
            }
            i+=1
            d.append(x)
        # print(d)
        self.devices = d
        
    def get_temperature(self, id):
        
        if self.devices[id]['virtual']:
            return 34 + round(rnd.random(),2)  * 10
        
        info = os.popen("nvidia-smi -i "+str(id)+" --query-gpu=temperature.gpu --format=csv,noheader,nounits").read()
        try:
            return float(info)
        except ValueError:
            return 0.0    
            
    def get_memory_clock(self, id):
        if self.devices[id]['virtual']:
            return 1000 + round(rnd.random(),2) * 100
        info = os.popen("nvidia-smi -i "+str(id)+" --query-gpu=clocks.mem --format=csv,noheader,nounits").read()
        try:
            return float(info)
        except ValueError:
            return 0.0
            
    def get_fan_speed(self, id):
        if self.devices[id]['virtual']:
            return 30 + round(rnd.random(),2) * 10
        info = os.popen("nvidia-smi -i "+str(id)+" --query-gpu=fan.speed --format=csv,noheader,nounits").read()
        try:
            return float(info)
        except ValueError:
            return 0.0
    
    def get_power(self, id):
        if self.devices[id]['virtual']:
            return 6 + round(rnd.random(),2) * 8
        info = os.popen("nvidia-smi -i "+str(id)+" --query-gpu=power.draw --format=csv,noheader,nounits").read()
        try:
            return float(info)
        except ValueError:
            return 0.0
    
    def get_clockspeed(self, id):
        if self.devices[id]['virtual']:
            return 1000 + round(rnd.random(),2) * 100
        
        info = os.popen("nvidia-smi -i "+str(id)+" --query-gpu=clocks.current.graphics --format=csv,noheader,nounits").read()
        try:
            return float(info)
        except ValueError:
            return 0.0
    
    
    
    def run_script(self, cmd, sudo=False):
        with open("./script.sh",'w') as f:
            f.write(cmd)
        # print(cmd)
        s = min_get_pass()
        rcmd_sudo = f"echo {s} | sudo -S bash script.sh"
        rcmd = "bash script.sh"
        # print(rcmd)
        m = "Development mode active. Commands not executed"
        if(self.script_mode == "production"):
            if sudo:
                m = os.popen(rcmd_sudo).read()
                if len(m) == 0:
                    m = os.popen(rcmd).read()
                    m += "\nERROR: The command failed to run with sudo. Restart the app with the correct credentials."
            else:
                m = os.popen(rcmd).read()
        return m
        
    def get_default_power_limit(self):
        cmd = 'nvidia-smi -q'
        output = subprocess.check_output(cmd, shell=True)
        output = output.decode("utf-8")
        output = output.split("\n")
        for line in output:
            if "Default Power Limit" in line:
                default_power_limit = re.findall(r'\d+', line)
        return default_power_limit
            
    def reset_gpus(self):
        devs = range(len(self.devices))
        power_line = EMPTY_CMD
        def_power = self.get_default_power_limit()
        if len(def_power) > 0:
            power_line = "sudo nvidia-smi -pl $POWER_LIMIT".replace("$POWER_LIMIT", str(def_power[0]))
            
        memory_line = "${SET} -a [gpu:${i}]/GPUMemoryTransferRateOffsetAllPerformanceLevels=$MEMORY_OFFSET".replace("$MEMORY_OFFSET", "0")
        gpu_line = "${SET} -a [gpu:${i}]/GPUGraphicsClockOffsetAllPerformanceLevels=$GPU_OFFSET".replace("$GPU_OFFSET","0")
        # build the selection
        cmd = ov_script
        ar = "("
        for d in devs:
            ar += " \"" + str(d) + "\" "
        ar += ")"
        
        # build the params
        cmd = cmd.replace("$gpu_selection", ar)
        cmd = cmd.replace("$memory_line", memory_line)
        cmd = cmd.replace("$oc_line", gpu_line)
        cmd = cmd.replace("$fan_line", EMPTY_CMD)
        cmd = cmd.replace("$power_line", power_line)
        
        # print(os.popen(cmd))
        return self.run_script(cmd)
    
    
    def oc_apply_pl(self, devices, value):
        line = "sudo nvidia-smi -pl $POWER_LIMIT"
        # build the selection
        cmd = ov_script
        ar = "("
        for d in devices:
            ar += " \"" + str(d) + "\" "
        ar += ")"
        
        # build the params
        cmd = cmd.replace("$gpu_selection", ar)
        cmd = cmd.replace("$memory_line", EMPTY_CMD)
        cmd = cmd.replace("$oc_line", EMPTY_CMD)
        cmd = cmd.replace("$fan_line", EMPTY_CMD)
        cmd = cmd.replace("$power_line", line.replace("$POWER_LIMIT", str(value)))
        
        # print(os.popen(cmd))
        return self.run_script(cmd)
        
    
    def oc_apply_mem(self, devices, value):
        line = "${SET} -a [gpu:${i}]/GPUMemoryTransferRateOffsetAllPerformanceLevels=$MEMORY_OFFSET"
        # build the selection
        cmd = ov_script
        ar = "("
        for d in devices:
            ar += " \"" + str(d) + "\" "
        ar += ")"
        
        # build the params
        cmd = cmd.replace("$gpu_selection", ar)
        cmd = cmd.replace("$power_line", EMPTY_CMD)
        cmd = cmd.replace("$oc_line", EMPTY_CMD)
        cmd = cmd.replace("$fan_line", EMPTY_CMD)
        cmd = cmd.replace("$memory_line", line.replace("$MEMORY_OFFSET", str(value)))
        
        return self.run_script(cmd)
            
    
    def oc_apply_goc(self, devices, value):
        line = "${SET} -a [gpu:${i}]/GPUGraphicsClockOffsetAllPerformanceLevels=$GPU_OFFSET"
        # build the selection
        cmd = ov_script
        ar = "("
        for d in devices:
            ar += " \"" + str(d) + "\" "
        ar += ")"
        
        # build the params
        cmd = cmd.replace("$gpu_selection", ar)
        cmd = cmd.replace("$memory_line", EMPTY_CMD)
        cmd = cmd.replace("$power_line", EMPTY_CMD)
        cmd = cmd.replace("$fan_line", EMPTY_CMD)
        cmd = cmd.replace("$oc_line", line.replace("$GPU_OFFSET", str(value)))
        
        return self.run_script(cmd)
            
    
    def oc_apply_fs(self, devices, value):
        line = "${SET} -a [fan:${i}]/GPUTargetFanSpeed=$FAN_SPEED" # TODO: Add a line for changing the fan rev/minutes
        # build the selection
        cmd = ov_script
        ar = "("
        for d in devices:
            ar += " \"" + str(d) + "\" "
        ar += ")"
        
        # build the params
        cmd = cmd.replace("$gpu_selection", ar)
        cmd = cmd.replace("$memory_line", EMPTY_CMD)
        cmd = cmd.replace("$power_line", EMPTY_CMD)
        cmd = cmd.replace("$oc_line", EMPTY_CMD)
        cmd = cmd.replace("$fan_line", line.replace("$FAN_SPEED", str(value)))
        
        return self.run_script(cmd, True)
        
    
if __name__ == "__main__":
    d = [1,2]
    v = 82
    h = HardwareInterface()
    print(h.get_default_power_limit())
    