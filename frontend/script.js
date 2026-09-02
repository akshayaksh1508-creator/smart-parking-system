// static/script.js

const API_URL = "http://10.228.197.103:5000";

// ---------------- LOAD STATUS ---------------- //

async function loadStatus(){

    const response = await fetch(`${API_URL}/status`);

    const data = await response.json();

    if(document.getElementById("totalSlots")){
        document.getElementById("totalSlots").innerText = data.total_slots;
    }

    if(document.getElementById("occupiedSlots")){
        document.getElementById("occupiedSlots").innerText = data.occupied_slots;
    }

    if(document.getElementById("availableSlots")){
        document.getElementById("availableSlots").innerText = data.available_slots;
    }
}

// ---------------- VEHICLE ENTRY ---------------- //
// ---------------- VEHICLE ARRIVAL ALERT ---------------- //

async function loadVehicleArrival(){

    try{
        const response = await fetch(`${API_URL}/hardware/vehicle-arrival`);
        const data = await response.json();

        const alertBox = document.getElementById("arrivalAlert");

        if(!alertBox) return;

        if(data.entry_detected){
            alertBox.style.display = "block";
            alertBox.innerText = "🚗 Vehicle detected at Entry Gate. QR scanner is ready.";
        }
        else if(data.exit_detected){
            alertBox.style.display = "block";
            alertBox.innerText = "🚙 Vehicle detected at Exit Gate.";
        }
        else{
            alertBox.style.display = "none";
        }

    }catch(error){
        console.log(error);
    }
}

// ---------------- AUTO LOAD ---------------- //

loadStatus();
loadVehicles();
loadVehicleArrival();

setInterval(() => {
    loadStatus();
    loadVehicles();
    loadVehicleArrival();
}, 5000);
async function vehicleEntry(){

    const vehicleNumber = document.getElementById("vehicleNumber").value;
    const ownerName = document.getElementById("ownerName").value;

    const response = await fetch(`${API_URL}/entry`,{
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify({
            vehicle_number:vehicleNumber,
            owner_name:ownerName
        })
    });

    const data = await response.json();

    document.getElementById("message").innerText = data.message || data.error;

    loadStatus();
}

// ---------------- VEHICLE EXIT ---------------- //

async function vehicleExit(){

    const vehicleNumber = document.getElementById("exitVehicleNumber").value;

    const response = await fetch(`${API_URL}/exit`,{
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify({
            vehicle_number:vehicleNumber
        })
    });

    const data = await response.json();

    if(data.parking_fee){
        document.getElementById("message").innerText =
            `${data.message} | Fee: ₹${data.parking_fee}`;
    }
    else{
        document.getElementById("message").innerText =
            data.message || data.error;
    }

    loadStatus();
    loadVehicles();
}

// ---------------- LOAD VEHICLES ---------------- //

async function loadVehicles(){

    const table = document.getElementById("vehicleTable");

    if(!table) return;

    const response = await fetch(`${API_URL}/vehicles`);

    const vehicles = await response.json();

    table.innerHTML = "";

    vehicles.forEach(vehicle => {

        table.innerHTML += `
            <tr>
                <td>${vehicle.id}</td>
                <td>${vehicle.vehicle_number}</td>
                <td>${vehicle.owner_name}</td>
                <td>${vehicle.entry_time || "-"}</td>
                <td>${vehicle.exit_time || "-"}</td>
                <td>₹${vehicle.fee || 0}</td>
            </tr>
        `;
    });
}

// ---------------- AUTO LOAD ---------------- //

loadStatus();
loadVehicles();

setInterval(() => {
    loadStatus();
    loadVehicles();
}, 5000);