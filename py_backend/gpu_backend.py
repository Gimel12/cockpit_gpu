from pynvml import *
import json
import argparse
import gpu_backend

def get_gpu_info():
    try:
        nvmlInit()
        deviceCount = nvmlDeviceGetCount()
        gpus = []
        for i in range(deviceCount):
            handle = nvmlDeviceGetHandleByIndex(i)
            info = nvmlDeviceGetMemoryInfo(handle)

            gpus.append({
                'id': i,
                'name': nvmlDeviceGetName(handle),
                'temperature': nvmlDeviceGetTemperature(handle, NVML_TEMPERATURE_GPU),
                'gpu_utilization': nvmlDeviceGetUtilizationRates(handle).gpu,
                'memory_utilization': nvmlDeviceGetUtilizationRates(handle).memory,
                'memory_total': info.total // 1024 // 1024,
                'memory_used': info.used // 1024 // 1024,
                'memory_free': info.free // 1024 // 1024
            })
        nvmlShutdown()
        return gpus
    except NVMLError as error:
        print(f"Error fetching GPU info: {error}")
        return []


if __name__ == "__main__":
    l = get_gpu_info()
    d = json.dumps(l)
    print(d)
    exit(0)