

// FIXME : move to json
var py_exec = "/home/tony/anaconda3/bin/python3"
var _core_path = "/home/tony/Documents/side_proj/ruben/cockpit/"
_working_mode = "dev" //modes:  dev, production
_tab_name = "gpu";
// Here you read the vars from the json

var py_path = _core_path + "cockpit_"+ _tab_name  +"/py_backend/"

var _using_port = ""
var _docker_images = [];
var _jupyter_images = [];
var _img_parse_count = 0;
var _img_parse_incomplete = "";


function ping_success() {
    console.log("Success");
}

function ping_fail(data) {
    console.log("Fail", data);
}


function process_gpus(data){
    var gpus = JSON.parse(data);
    console.log(gpus);
    show_gpus(gpus);
}

function load_gpus(){
    if(_working_mode == "production"){          
        cockpit.spawn([py_path + "dist/read_images"])
            .stream(process_images)
            .then(ping_success)
            .catch(console.log('Failed mode production of load_Containers')); 
    }       
    else{
        options = {
            "superuser":"try"
        } 
        cockpit.spawn([py_exec,py_path + "gpu_backend.py"], options)
        .stream(process_gpus)
        .then(ping_success)
        .catch(ping_fail); 
    }
}


function show_gpus(gpus){
    var containers = ["1","2"];    
    var elem = document.getElementById("main-gpu");
    s = "";
    // gpus = [{id: 0,
    //     memory_free: 50,
    //     memory_total: 4023,
    //     memory_used: 50,
    //     memory_utilization: 20,
    //     gpu_utilization: 50,
    //     name: "Nvidia1",
    //     temperature: 32
    //     },
    //  {id: 1,
    //     memory_free: 50,
    //     memory_total: 4023,
    //     memory_used: 10,
    //     memory_utilization: 40,
    //     gpu_utilization: 80,
    //     name: "Nvidia1",
    //     temperature: 32
    // }]
    gpus.forEach(gpu => {
        s += `<div class="uk-card uk-card-default uk-card-body">
                <h2>${gpu.name} (GPU ${gpu.id})</h2>
                <div class="uk-margin">
                    <span class="uk-text-bold">Temperature: ${gpu.temperature}°C</span>
                </div>
                <div class="uk-margin">
                    <span class="uk-text-bold">GPU Utilization: ${gpu.gpu_utilization}%</span>
                    <progress class="uk-progress" value="${gpu.gpu_utilization}" max="100"></progress>
                </div>
                <div class="uk-margin">
                    <span class="uk-text-bold">Memory Utilization: ${gpu.memory_utilization}%</span>
                    <progress class="uk-progress" value="${gpu.memory_utilization}" max="100"></progress>
                </div>
                <div class="uk-margin">
                    <span class="uk-text-bold">Memory Used: ${gpu.memory_used} / ${gpu.memory_total} MB</span>
                    <progress class="uk-progress" value="${(gpu.memory_used / gpu.memory_total) * 100}" max="100"></progress>
                </div>
            </div>`
    });    
    elem.innerHTML = s;
}

function init_load_gpus(){
    let loading = setInterval(() => {
        console.log("Loading GPU info...");
        load_gpus();
    }, 1000)
}

let stateCheck = setInterval(() => {
    if (document.readyState === 'complete') {
        console.log("Starting GPU Monitor tab...");       
        clearInterval(stateCheck);
        document.body.style = "overflow:auto;";
        $("#volume-bind-check").click(function(){
            if($("#volume-bind-check").prop("checked")){
                $(".volume-bind").removeClass("hidden");
            }
            else{
                $(".volume-bind").addClass("hidden");
            }
        })
        // Checking access to the document object
        init_load_gpus();
    }
}, 500);