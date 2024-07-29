

// FIXME : move to json
var py_exec = "/home/bizon/anaconda3/bin/python3"
var _core_path = "/usr/local/share/dlbt_os/"
_working_mode = "dev" //modes:  dev, production [FIXED]
_tab_name = "gpu";
// Here you read the vars from the json

var py_path = _core_path + "cockpit_"+ _tab_name  +"/py_backend/"

var _using_port = ""
var _docker_images = [];
var _jupyter_images = [];
var _img_parse_count = 0;
var _img_parse_incomplete = "";


function ping_success() {
    // console.log("Success");
}

function ping_fail(data) {
    console.log("Fail", data);
}


function process_gpus(data){
    var gpus = JSON.parse(data);
    // console.log(gpus);
    show_gpus(gpus);
}

function load_gpus(){
    options = {} 
    cockpit.spawn([py_exec,py_path + "gpu_backend.py"], options)
    .stream(process_gpus)
    .then(ping_success)
    .catch(ping_fail); 
}


function start_gpu_settings(event){
    // FIXME: _gpu_id must be set before
    console.log("GPU id is: ", event.target.id);
    var sep = event.target.id.indexOf("-");
    _gpu_id = event.target.id.slice(sep+1);

    console.log("GPU id is: ", _gpu_id);
    $("#header-commit-text").html("You are about to apply these settings to GPU # <b>"+ _gpu_id + "</b>. Are you sure?");
    var mod = document.getElementById("gpu-modal");
    UIkit.modal(mod).show();

}

function real_gpu_settings(){
    // FIXME: _gpu_id must be set before
    // var clock = document.getElementById("gpu-clock").value;
    var power = document.getElementById("power-limit").value;

    var gpu_fields = ["gpu_id","power"];
    var gpu_vals = [String(_gpu_id),power];

    var gpu_settings = []
    gpu_fields.forEach((g,idx)=>{
        op = g;
        val = gpu_vals[idx];
        gpu_settings.push(`--${op}=${val}`);
    })
    options = {
        "superuser":"require"
    } 
    args = [py_exec,py_path + "hw_interface.py"].concat(gpu_settings);
    console.log(args);
    console.log(args.join(" "));

    cockpit.spawn(args, options)
    .stream(stream_apply_settings)
    .then(ping_success)
    .catch(apply_fail); 
}

function stream_apply_settings(data){
    console.log(data)

    f = JSON.parse(data)
    if(f["success"])
        apply_success(f["output"])
    else
        apply_fail(f["output"])
}

function apply_fail(msg=undefined){
    console.log("Inside !! FAIL");
    var text = "There was an error applying the settings.";
    if(msg != undefined){
        text = msg + "Check that you have admin access.";
    }
        
    var mod = document.getElementById("gpu-modal");
    UIkit.modal(mod).hide();        
    UIkit.notification({
        message: text,
        status: 'danger',
        pos: 'top-center',
        timeout: 2000
    });
}

function apply_success(msg){
    console.log("Inside !! SUCCESS");
    var mod = document.getElementById("gpu-modal");
    UIkit.modal(mod).hide();    
    UIkit.notification({
        message: 'The settings were applied successfully:\n' + msg,
        status: 'success',
        pos: 'top-center',
        timeout: 2000
    });
}



function show_gpus(gpus){   
    var elem = document.getElementById("main-gpu");
    s = "";
    buttons = []
    gpus.forEach((gpu,idx) => {
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
                <div class="uk-margin">
                    <a class="custom-buttom uk-button-primary uk-align-left"  id="gpu_settings-${idx}">Settings</a>
                </div>
            </div>`
            buttons.push("gpu_settings-"+idx);
    });  
    elem.innerHTML = s;
    for(var i =0;i<buttons.length;i++){
        b = document.getElementById(buttons[i]);
        // console.log("Button: ",b);
        b.addEventListener("click",start_gpu_settings);
    }
    
}

function init_load_gpus(){
    let loading = setInterval(() => {
        // console.log("Loading GPU info...");
        load_gpus();
    }, 1000)
}

let stateCheck = setInterval(() => {
    if (document.readyState === 'complete') {
        console.log("Starting GPU Monitor tab...");       
        clearInterval(stateCheck);
        document.body.style = "overflow:auto;";
        $("#apply-settings").click(real_gpu_settings);
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