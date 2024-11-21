

// FIXME : move to json
var py_exec = "/home/bizon/anaconda3/bin/python3"
var _core_path = "/usr/local/share/dlbt_os/"
_working_mode = "dev" //modes:  dev, production [FIXED]
_tab_name = "gpu";
// Here you read the vars from the json

//local version -dev tony
// var py_exec = "/home/tony/anaconda3/bin/python3"
// var _core_path = "/home/tony/Documents/side_proj/ruben/cockpit/"
// _working_mode = "dev" //modes:  dev, production [FIXED]
// _tab_name = "gpu";

var py_path = _core_path + "cockpit_"+ _tab_name  +"/py_backend/"

// Tab Specific
let _gpu_fields = ["temperature","gpu_utilization","memory_utilization","power_usage"];
var _active_field = "temperature";
var _initial_load_done = false;
var _plotting_data = {};
const _sampling_size = 550;
var _samples = [];
var _chart = undefined;
function ping_success() {
    // console.log("Ping Success");
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
    // UIkit.modal('#my-modal').show(); // Open modal
    // console.log(document.documentElement.classList)
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
    .then(() => {
        console.log("Hereee")
        location.reload();
    })
    .catch(() => {
        console.log("ERROR");
        location.reload();
    }); 
}

function stream_apply_settings(data){
    f = JSON.parse(data)
    if(f["success"])
        apply_success(f["output"])
    else
        apply_fail(f["output"])
    location.reload()
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
    buttons = [];
    s += `<table class="uk-table uk-table-divider">
        <thead>
            <tr>
                <th>GPU Name</th>
                <th>Temperature</th>
                <th>GPU Utilization</th>
                <th>Memory Utilization</th>
                <th>Memory Used</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>`;

    gpus.forEach((gpu, idx) => {
        g = `<tr>
                <td>${gpu.name} (GPU ${gpu.id})</td>
                <td>${gpu.temperature}°C</td>
                <td>
                    ${gpu.gpu_utilization}%
                    <progress class="uk-progress" value="${gpu.gpu_utilization}" max="100"></progress>
                </td>
                <td>
                    ${gpu.memory_pct}% <progress class="uk-progress" value="${gpu.memory_pct}" max="100"></progress>
                </td>
                <td>
                    ${gpu.memory_used} / ${gpu.memory_total} MB <progress class="uk-progress" value="${(gpu.memory_used / gpu.memory_total) * 100}" max="100"></progress>
                </td>
                <td>
                    <a class="custom-buttom uk-button-primary uk-align-left"  id="gpu_settings-${idx}">Settings</a>
                </td>
            </tr>`;
        buttons.push("gpu_settings-" + idx);
        s += g;
        
    });

    s += `</tbody></table>`;
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
        
    }, 1000);

    let updating_plots = setInterval(() => {
        if(_initial_load_done){
            get_logs();
        }
    },1000*60*5);

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



function get_logs(initialize=false){
    var last_sample = "NIL";
    var stream_call = update_stream;
    if(initialize){
        stream_call = initial_fill_stream;
    }
    if (_samples.length > 0){
        last_sample = _samples[_samples.length-1]["timestamp"];
    }
    console.log()
    args = [py_exec,py_path + "read_history.py","--last_log=\""+ last_sample +"\"","--sampling_size="+_sampling_size];

    cockpit.spawn(args)
        .stream(stream_call)
        .then(ping_success)
        .catch(ping_fail); 
}

function update_stream(data){
    resp = JSON.parse(data);
    nsamples = resp["values"];
    _samples = _samples.concat(nsamples);
    st_idx = _samples.length - _sampling_size;
    _samples = _samples.slice(st_idx)
    plot();
}

function initial_fill_stream(data){
    resp = JSON.parse(data);
    nsamples = resp["values"];
    _samples = _samples.concat(nsamples);
    // console.log("The size of the  samples is: ", _samples.length)
    if ( !resp["end"] && _samples.length < _sampling_size){
        get_logs(true);
    }
    else {
        _initial_load_done = true;
        console.log("All the samples loaded.");
        plot();
    }
}

function plot(){
    _gpu_fields.forEach(f => {
        _plotting_data[f] = draw(_samples,f);
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

function createBarChart(canvasElement) {
    // Check if the canvas element is valid
    if (!canvasElement || !(canvasElement instanceof HTMLCanvasElement)) {
        console.error("Please provide a valid HTML canvas element.");
        return;
    }

    // Chart.js setup
    const ctx = canvasElement.getContext('2d');

    // Define the data for the chart
    const data = {
        labels: ['January', 'February', 'March', 'April', 'May', 'June'],
        datasets: [{
            label: 'Monthly Sales',
            data: [65, 59, 80, 81, 56, 55],
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
        }]
    };

    // Define chart options
    const options = {
        responsive: true,
        scales: {
            y: {
                beginAtZero: true
            }
        }
    };

    // Create the chart
    new Chart(ctx, {
        type: 'bar',
        data: data,
        options: options
    });
}
let stateCheck = setInterval(() => {
    if (document.readyState === 'complete') {
        console.log("Starting GPU Monitor tab...");       
        clearInterval(stateCheck);
        document.body.style = "overflow:auto;";
        $("#apply-settings").click(real_gpu_settings);
        $("#cancel-apply-settings").click(() => {
            console.log("Entering cancel..");
            location.reload();
        });
        $("#volume-bind-check").click(function(){
            if($("#volume-bind-check").prop("checked")){
                $(".volume-bind").removeClass("hidden");
            }
            else{
                $(".volume-bind").addClass("hidden");
            }
        })
        // Checking access to the document object
        get_logs(true);
        init_gpu_fields();
        const fieldSelect = document.getElementById('gpu-field-select');
        fieldSelect.addEventListener('change', update_selection_field);
        init_load_gpus();
        
    }
}, 500);