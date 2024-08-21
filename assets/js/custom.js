

// FIXME : move to json
// var py_exec = "/home/bizon/anaconda3/bin/python3"
// var _core_path = "/usr/local/share/dlbt_os/"
// _working_mode = "dev" //modes:  dev, production [FIXED]
// _tab_name = "gpu";
// Here you read the vars from the json

//local version -dev tony
var py_exec = "/home/tony/anaconda3/bin/python3"
var _core_path = "/home/tony/Documents/side_proj/ruben/cockpit/"
_working_mode = "dev" //modes:  dev, production [FIXED]
_tab_name = "gpu";

var py_path = _core_path + "cockpit_"+ _tab_name  +"/py_backend/"

// Tab Specific
let _gpu_fields = ["temperature","gpu_utilization","memory_utilization","power_usage"];
var _active_field = "temperature";
var _plotting_data = {};
var _chart = undefined;
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
        update_log();
    }, 1000)
}



// Plotting module
function init_gpu_fields(){
    const $field_select = $("#gpu-field-select");
    $.each(_gpu_fields, (idx,field) => {
        $field_select.append(
            $('<option></option>')
                .attr('value', field)
                .text(field)
        );
    });
}


function update_log(){
    args = [py_exec,py_path + "read_history.py"];
    cockpit.spawn(args)
    .stream(stream_update_log)
    .then(ping_success)
    .catch(ping_fail); 
}

_buffer = ""
function stream_update_log(data){

    let st_idx = data.indexOf("*ST*");
    let en_idx = data.indexOf("*EN*");
    let samples = undefined;
    // console.log(_buffer);
    if(st_idx >=0 && en_idx >= 0){
        // console.log("Entered in beg|end");
        samples = JSON.parse(data); 
    }
    else if(st_idx >=0){
        // console.log("Entered in beg");
        _buffer = data.slice(st_idx + 4);
        return;
    }
    else if(en_idx >=0){
        // console.log("Entered in end");
        _buffer += data.slice(0,en_idx);
        samples = JSON.parse(_buffer);
    }
    else {
        // console.log("Entered in mid");
        _buffer += data;
        return;
    }
    // let samples = JSON.parse(data);
    // Update each field's data
    try {
        samples = JSON.parse(data);
    }
    catch(error){
        // console.log("Fatal: ", error);
    }

    // console.log("Samples received: ", samples);
    _gpu_fields.forEach(f => {
        _plotting_data[f] = draw(samples,f);
    });
    plot_active_field();
}

function update_selection_field(){
    field = $("#gpu-field-select").val();
    _active_field = field;
    plot_active_field();
}

function plot_active_field(){
    const ctx = document.getElementById('myChart');
    if (_chart){
        _chart.destroy();
    }
    _chart = new Chart(ctx, {
        type: 'line',
        data: {
        labels: _plotting_data[_active_field]["labels"],
        datasets: _plotting_data[_active_field]["datasets"],
        },
        options: {
        scales: {
            x: {
                ticks: {
                    callback: function(value, index, values) {
                        // Show label only every n samples
                        var n = 2; // Change this value to control the frequency
                        if (index % n === 0) {
                            return this.getLabelForValue(value);
                        } else {
                            return '';
                        }
                    }
                }
                },
            y: {
            beginAtZero: true
            }
        },
        
        animation: {
            duration: 0 // Disable animation to avoid the line shifting during update
        }
        }
    });
}

function draw(samples, field){
    let labels = [];
    let datasets = [];
    let n_gpus = samples[0]["data"].length
    for(var i=0;i<n_gpus;i+=1){
        datasets.push({
            label: "GPU " + String(samples[0]["data"][0]["id"]),
            data: [],
            pointRadius: 1,
            borderWidth: 1
        })
    }
    samples.forEach((x,idx)=>{
        // console.log(idx);
        labels[idx] = x["timestamp"].slice(11,16);
        // console.log("Inside x[data]", x["data"][String(0)]["temperature"]);
        for(var i=0;i<n_gpus;i+=1){
            datasets[i]["data"].push(x["data"][i][field]);
        }
    })
    data = {
        labels: labels,
        datasets: datasets 
    }
    return data
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
        init_gpu_fields();
        const fieldSelect = document.getElementById('gpu-field-select');
        fieldSelect.addEventListener('change', update_selection_field);
        init_load_gpus();
        // start_plots();
        
    }
}, 500);