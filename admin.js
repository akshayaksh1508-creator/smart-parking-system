const API_URL = "http://172.17.38.167:5000";

let adminToken = localStorage.getItem("adminToken");

window.onload = () => {
  if(adminToken){
    showAdminDashboard();
  }
};

function adminHeaders(){
  return {
    "Content-Type": "application/json",
    "Admin-Token": adminToken
  };
}

async function adminLogin(){
  const username = document.getElementById("adminUsername").value.trim();
  const password = document.getElementById("adminPassword").value.trim();

  const res = await fetch(`${API_URL}/admin-login`, {
    method:"POST",
    headers:{
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      username,
      password
    })
  });

  const data = await res.json();

  if(data.token){
    adminToken = data.token;
    localStorage.setItem("adminToken", adminToken);
    showAdminDashboard();
  }else{
    document.getElementById("adminLoginMessage").innerText =
      data.error || "Login failed";
  }
}

function showAdminDashboard(){
  document.getElementById("adminLoginBox").style.display = "none";
  document.getElementById("adminDashboard").style.display = "block";

  refreshDashboard();
  loadParkingSettings();
}

function adminLogout(){
  localStorage.removeItem("adminToken");
  location.reload();
}

async function loadStatus(){
  try{
    const response = await fetch(`${API_URL}/status`);
    const data = await response.json();

    document.getElementById("totalSlots").innerText = data.total_slots;
    document.getElementById("availableSlots").innerText = data.available_slots;
    document.getElementById("occupiedSlots").innerText = data.occupied_slots;

    updateSlots(data.slots || []);
  }catch(error){
    console.log(error);
  }
}
async function loadVehicleArrival(){
  try{
    const res = await fetch(`${API_URL}/hardware/vehicle-arrival`);
    const data = await res.json();

    const box = document.getElementById("arrivalAlert");
    if(!box) return;

    if(data.entry_detected){
      box.innerText = "🚗 Vehicle detected at Entry Gate. Scanner is ready.";
      box.style.display = "block";
    }
    else if(data.exit_detected){
      box.innerText = "🚙 Vehicle detected at Exit Gate.";
      box.style.display = "block";
    }
    else{
      box.style.display = "none";
    }
  }catch(error){
    console.log(error);
  }
}

function updateSlots(slots){
  const slotGrid = document.getElementById("slotGrid");
  slotGrid.innerHTML = "";

  slots.forEach(slot => {
    let className = "slot";

    if(slot.status === "Occupied"){
      className += " occupied";
    }

    if(slot.status === "Booked"){
      className += " booked";
    }

    slotGrid.innerHTML += `
      <div class="${className}">
        <h3>Slot ${slot.slot_number}</h3>
        <p>${slot.status}</p>
      </div>
    `;
  });
}

async function loadVehicles(){
  try{
    const response = await fetch(`${API_URL}/vehicles`, {
      headers: adminHeaders()
    });

    const vehicles = await response.json();

    if(vehicles.error){
      alert(vehicles.error);
      adminLogout();
      return;
    }

    const table = document.getElementById("vehicleTable");
    table.innerHTML = "";

    let revenue = 0;

    vehicles.forEach(vehicle => {
      const fee = Number(vehicle.fee || 0);
      const fine = Number(vehicle.fine || 0);

      revenue += fee;

      const status = vehicle.exit_time ? "Exited" : "Parked";
      const badgeClass = vehicle.exit_time ? "exited" : "active";

      table.innerHTML += `
        <tr>
          <td>${vehicle.id}</td>
          <td>${vehicle.vehicle_number}</td>
          <td>${vehicle.owner_name || "-"}</td>
          <td>${vehicle.slot_number || "-"}</td>
          <td>${formatDate(vehicle.entry_time)}</td>
          <td>${vehicle.exit_time ? formatDate(vehicle.exit_time) : "-"}</td>
          <td>₹${fee}</td>
          <td>₹${fine}</td>
          <td><span class="badge ${badgeClass}">${status}</span></td>
        </tr>
      `;
    });

    document.getElementById("totalRevenue").innerText = `₹${revenue}`;
  }catch(error){
    console.log(error);
  }
}

async function loadParkingSettings(){
  try{
    const res = await fetch(`${API_URL}/parking-settings`, {
      headers: adminHeaders()
    });

    const data = await res.json();

    document.getElementById("adminTotalSlots").value = data.total_slots;
    document.getElementById("adminPrice").value = data.price_per_hour;
  }catch(error){
    console.log(error);
  }
}

async function saveParkingSettings(){
  const totalSlots = document.getElementById("adminTotalSlots").value;
  const price = document.getElementById("adminPrice").value;

  const res = await fetch(`${API_URL}/parking-settings`, {
    method:"POST",
    headers: adminHeaders(),
    body:JSON.stringify({
      total_slots: totalSlots,
      price_per_hour: price
    })
  });

  const data = await res.json();

  document.getElementById("settingsMessage").innerText =
    data.message || data.error;

  refreshDashboard();
}

function filterTable(){
  const value = document.getElementById("searchInput").value.toLowerCase();
  const rows = document.querySelectorAll("#vehicleTable tr");

  rows.forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(value)
      ? ""
      : "none";
  });
}

function refreshDashboard(){
  loadStatus();
  loadVehicles();
  loadVehicleArrival();
}

function formatDate(dateString){
  if(!dateString) return "-";
  return new Date(dateString).toLocaleString();
}

setInterval(() => {
  if(adminToken){
    refreshDashboard();
  }
}, 5000);