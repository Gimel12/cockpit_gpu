### Prerequisites
pip install pynvml
pip install json


## Manual Installation 
1. Clone the repo
  `cd /usr/local/share/dlbt_os/`
  `git clone https://github.com/technopremium/cockpit_gpu.git`
1. Link the custom tab
  `cd /usr/local/share/dlbt_os/cockpit_gpu`
  `ln -snf $PWD ~/.local/share/cockpit/cockpit_gpu`
  
* [Optional]Check if the tab was correctly added
  `cockpit-bridge --packages`

2. Add the following line to `crontab -e`:
```
/home/bizon/anaconda3/bin/python3 /usr/local/share/dlbt_os/cockpit_gpu/system_scripts/nvidia_logger.py
```
3. 
```
npm install chart
```