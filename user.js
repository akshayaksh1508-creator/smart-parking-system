const API_URL = "http://172.17.38.167:5000";


let currentUser = JSON.parse(localStorage.getItem("parkingUser"));

/* =========================
   THREE JS VARIABLES
========================= */

let threeScene;
let threeCamera;
let threeRenderer;
let lastTotalSlots = 0;
let threeSlots = [];
let threeCars = [];
let threeInitialized = false;

/* =========================
   WINDOW LOAD
========================= */

window.onload = () => {
  startClock();
  if (currentUser) {
    showDashboard();
  }
};

/* =========================
   CLOCK
========================= */

function startClock() {
  setInterval(() => {
    const clock = document.getElementById("clock");
    if (clock) {
      clock.innerText = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
    }
  }, 1000);
}

/* =========================
   PAGE NAVIGATION
========================= */

function showPage(pageId, clickedBtn = null) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active-page");
  });

  document.getElementById(pageId).classList.add("active-page");

  document.querySelectorAll(".nav").forEach(btn => {
    btn.classList.remove("active");
  });

  if (clickedBtn) {
    clickedBtn.classList.add("active");
  }

  if (pageId === "bookingsPage") loadMyBookings();
  if (pageId === "historyPage") loadMyRecords();
  if (pageId === "vehiclePage") loadVehicleDetails();
  if (pageId === "profilePage") loadProfileDetails();
}

/* =========================
   AUTH TABS
========================= */

function showLogin() {
  document.getElementById("loginForm").style.display = "block";
  document.getElementById("registerForm").style.display = "none";
  document.querySelectorAll(".tab")[0].classList.add("active");
  document.querySelectorAll(".tab")[1].classList.remove("active");
}

function showRegister() {
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("registerForm").style.display = "block";
  document.querySelectorAll(".tab")[0].classList.remove("active");
  document.querySelectorAll(".tab")[1].classList.add("active");
}

/* =========================
   REGISTER USER
========================= */

async function registerUser() {
  const data = {
    name: document.getElementById("regName").value.trim(),
    email: document.getElementById("regEmail").value.trim(),
    phone: document.getElementById("regPhone").value.trim(),
    vehicle_number: document.getElementById("regVehicle").value.trim(),
    password: document.getElementById("regPassword").value.trim()
  };

  if (!data.name || !data.email || !data.phone || !data.vehicle_number || !data.password) {
    document.getElementById("authMessage").innerText = "Please fill all fields.";
    return;
  }

  try {
    const res = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await res.json();
    document.getElementById("authMessage").innerText = result.message || result.error;

    if (result.message) {
      showLogin();
    }
  } catch (err) {
    document.getElementById("authMessage").innerText = "Registration failed. Check server connection.";
    console.error(err);
  }
}

/* =========================
   LOGIN USER
========================= */

async function loginUser() {
  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: document.getElementById("loginEmail").value.trim(),
        password: document.getElementById("loginPassword").value.trim()
      })
    });

    const result = await res.json();

    if (result.user) {
      currentUser = result.user;
      localStorage.setItem("parkingUser", JSON.stringify(currentUser));
      showDashboard();
    } else {
      document.getElementById("authMessage").innerText = result.error || "Login failed";
    }
  } catch (err) {
    document.getElementById("authMessage").innerText = "Login failed. Check server connection.";
    console.error(err);
  }
}

/* =========================
   SHOW DASHBOARD
========================= */

function showDashboard() {
  document.getElementById("authBox").style.display = "none";
  document.getElementById("dashboard").style.display = "block";
  document.getElementById("logoutBtn").style.display = "block";

  document.getElementById("sideUser").innerText = currentUser.name;
  document.getElementById("sideVehicle").innerText = currentUser.vehicle_number;
  document.getElementById("dashVehicle").innerText = currentUser.vehicle_number;
  document.getElementById("dashProfile").innerText = currentUser.name;

  loadStatus();
  loadMyRecords();
  loadMyBookings();
  loadLatestQR();
  loadVehicleArrival();
  loadVehicleDetails();
  loadProfileDetails();
}

/* =========================
   LOAD STATUS
========================= */

async function loadStatus() {
  try {
    const res = await fetch(`${API_URL}/status`);
    const data = await res.json();

    document.getElementById("totalSlots").innerText = data.total_slots;
    document.getElementById("availableSlots").innerText = data.available_slots;
    document.getElementById("occupiedSlots").innerText = data.occupied_slots;

    document.getElementById("sideAvailable").innerText = data.available_slots;
    document.getElementById("sideOccupied").innerText = data.occupied_slots;
    document.getElementById("sideTotal").innerText = data.total_slots;

    document.getElementById("vehicleCountMini") &&
      (document.getElementById("vehicleCountMini").innerText = data.occupied_slots);

    const booked = (data.slots || []).filter(slot => slot.status === "Booked").length;
    document.getElementById("bookedSlots").innerText = booked;
    document.getElementById("sideBooked").innerText = booked;

    const percent = Math.round((data.occupied_slots / data.total_slots) * 100) || 0;
    document.getElementById("capacityPercent").innerText = `${percent}%`;

    initThreeParkingMap(data.total_slots);
    updateSlots(data.slots || [], data.total_slots);
  } catch (err) {
    console.error("loadStatus error:", err);
  }
}

/* =========================
   THREE JS MAP
========================= */

function initThreeParkingMap(totalSlots = 3) {
  const container = document.getElementById("threeParkingModel");
  if (!container) return;

  if (threeInitialized && lastTotalSlots === totalSlots) return;

  container.innerHTML = "";
  threeSlots = [];
  threeCars = [];
  lastTotalSlots = totalSlots;
  threeInitialized = true;

  threeScene = new THREE.Scene();
  threeScene.background = new THREE.Color(0x020617);

  threeCamera = new THREE.PerspectiveCamera(
    55,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  threeCamera.position.set(0, 10, 12);
  threeCamera.lookAt(0, 0, 0);

  threeRenderer = new THREE.WebGLRenderer({ antialias: true });
  threeRenderer.setSize(container.clientWidth, container.clientHeight);
  threeRenderer.shadowMap.enabled = true;
  container.appendChild(threeRenderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  threeScene.add(ambient);

  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  light.position.set(5, 14, 8);
  light.castShadow = true;
  threeScene.add(light);

  const rows = Math.ceil(totalSlots / 4);
  const groundWidth = Math.max(18, totalSlots * 2.2);
  const groundDepth = Math.max(12, rows * 6 + 8);

  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(groundWidth, 0.2, groundDepth),
    new THREE.MeshStandardMaterial({ color: 0x111827 })
  );
  ground.receiveShadow = true;
  threeScene.add(ground);

  createRoad(0, 0, 2.7, groundDepth - 1);
  createRoad(-groundWidth / 2 + 2.5, 0, 2.2, groundDepth - 1);
  createRoad(groundWidth / 2 - 2.5, 0, 2.2, groundDepth - 1);

  createGate(-groundWidth / 2 + 1.5, -groundDepth / 2 + 0.8, "ENTRY", 0x16a34a);
  createGate(groundWidth / 2 - 1.5, -groundDepth / 2 + 0.8, "EXIT", 0xef4444);

  createDynamicSlots(totalSlots);
  createTreesDynamic(groundWidth, groundDepth);

  animateThree();
}

/* =========================
   CREATE DYNAMIC SLOTS
========================= */

function createDynamicSlots(totalSlots) {
  const slotsPerRow = 4;
  const spacingX = 3.5;
  const spacingZ = 5;
  const rows = Math.ceil(totalSlots / slotsPerRow);

  for (let i = 1; i <= totalSlots; i++) {
    const index = i - 1;
    const row = Math.floor(index / slotsPerRow);
    const col = index % slotsPerRow;
    const rowSlots = Math.min(slotsPerRow, totalSlots - row * slotsPerRow);
    const startX = -((rowSlots - 1) * spacingX) / 2;
    const x = startX + col * spacingX;
    const z = (row - (rows - 1) / 2) * spacingZ;
    createSlot(i, x, z);
  }
}

/* =========================
   CREATE ROAD
========================= */

function createRoad(x, z, w, h) {
  const road = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.04, h),
    new THREE.MeshStandardMaterial({ color: 0x1f2937 })
  );
  road.position.set(x, 0.13, z);
  threeScene.add(road);

  for (let i = -4; i <= 4; i++) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.03, 0.7),
      new THREE.MeshStandardMaterial({ color: 0xe5e7eb })
    );
    line.position.set(x, 0.18, i * 1.1);
    threeScene.add(line);
  }
}

/* =========================
   CREATE SLOT
========================= */

function createSlot(num, x, z) {
  const slotGroup = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.08, 4.3),
    new THREE.MeshStandardMaterial({ color: 0x052e16, transparent: true, opacity: 0.82 })
  );
  base.position.y = 0.25;
  slotGroup.add(base);

  const borderMaterial = new THREE.MeshStandardMaterial({ color: 0x22c55e });

  const front = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.08), borderMaterial.clone());
  front.position.set(0, 0.36, 2.15);

  const back = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.08), borderMaterial.clone());
  back.position.set(0, 0.36, -2.15);

  const left = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 4.3), borderMaterial.clone());
  left.position.set(-1.3, 0.36, 0);

  const right = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 4.3), borderMaterial.clone());
  right.position.set(1.3, 0.36, 0);

  slotGroup.add(front, back, left, right);

  const car = createCar(0x3b82f6);
  car.position.set(0, 0.55, 0);
  car.visible = false;
  slotGroup.add(car);

  slotGroup.position.set(x, 0, z);
  threeScene.add(slotGroup);

  threeSlots[num] = { group: slotGroup, base: base, borders: [front, back, left, right] };
  threeCars[num] = car;
}

/* =========================
   CREATE CAR
========================= */

function createCar(color) {
  const car = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 0.42, 2.2),
    new THREE.MeshStandardMaterial({ color })
  );
  body.position.y = 0.25;
  body.castShadow = true;

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.35, 1.05),
    new THREE.MeshStandardMaterial({ color: 0x0f172a })
  );
  top.position.y = 0.65;

  car.add(body, top);

  for (let wx of [-0.75, 0.75]) {
    for (let wz of [-0.75, 0.75]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.18, 24),
        new THREE.MeshStandardMaterial({ color: 0x020617 })
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.12, wz);
      car.add(wheel);
    }
  }

  return car;
}

/* =========================
   CREATE GATE
========================= */

function createGate(x, z, text, color) {
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.15, 0.5),
    new THREE.MeshStandardMaterial({ color })
  );
  box.position.set(x, 0.55, z);
  threeScene.add(box);
}

/* =========================
   CREATE TREES
========================= */

function createTreesDynamic(width, depth) {
  const treeCount = Math.floor(width);

  for (let i = 0; i < treeCount; i++) {
    const x = -width / 2 + i;

    const tree = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 1.1, 12),
      new THREE.MeshStandardMaterial({ color: 0x166534 })
    );
    tree.position.set(x, 0.8, -depth / 2 + 0.4);
    threeScene.add(tree);

    const tree2 = tree.clone();
    tree2.position.z = depth / 2 - 0.4;
    threeScene.add(tree2);
  }
}

/* =========================
   ANIMATE THREE
========================= */

function animateThree() {
  requestAnimationFrame(animateThree);

  threeCars.forEach(car => {
    if (car && car.visible) {
      car.rotation.y += 0.002;
    }
  });

  threeRenderer.render(threeScene, threeCamera);
}

/* =========================
   UPDATE SLOTS
========================= */

function updateSlots(slots, totalSlots) {
  if (!threeInitialized) return;

  const count = totalSlots || slots.length || lastTotalSlots;

  for (let i = 1; i <= count; i++) {
    const slot = threeSlots[i];
    const car = threeCars[i];
    if (!slot || !car) continue;

    const info = slots.find(s => s.slot_number === i);
    const status = info ? info.status : "Available";

    let color = 0x22c55e;
    let baseColor = 0x052e16;
    car.visible = false;
    car.scale.set(1, 1, 1);

    if (status === "Occupied") {
      color = 0xef4444;
      baseColor = 0x3f1111;
      car.visible = true;
    }

    if (status === "Booked") {
      color = 0xf59e0b;
      baseColor = 0x422006;
      car.visible = true;
      car.scale.set(0.85, 0.85, 0.85);
    }

    slot.base.material.color.setHex(baseColor);
    slot.borders.forEach(border => {
      border.material.color.setHex(color);
    });
  }
}

/* =========================
   MAP VIEW
========================= */

function setMapView(view) {
  document.getElementById("btn2d").classList.remove("active");
  document.getElementById("btn3d").classList.remove("active");

  if (view === "2d") {
    threeCamera.position.set(0, 20, 0.1);
    threeCamera.lookAt(0, 0, 0);
    document.getElementById("btn2d").classList.add("active");
  } else {
    threeCamera.position.set(0, 10, 12);
    threeCamera.lookAt(0, 0, 0);
    document.getElementById("btn3d").classList.add("active");
  }
}

/* =========================
   FULLSCREEN
========================= */

function fullscreenMap() {
  const map = document.querySelector(".three-map");
  if (!document.fullscreenElement) {
    map.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

/* =========================
   VEHICLE ARRIVAL
========================= */

async function loadVehicleArrival() {
  try {
    const response = await fetch(`${API_URL}/hardware/vehicle-arrival`);
    const data = await response.json();

    const box = document.getElementById("arrivalAlert");
    if (!box) return;

    if (data.entry_detected) {
      box.innerText = "🚗 Vehicle detected at Entry Gate. Scanner is ready.";
      box.style.display = "block";
    } else if (data.exit_detected) {
      box.innerText = "🚙 Vehicle detected at Exit Gate.";
      box.style.display = "block";
    } else {
      box.style.display = "none";
    }
  } catch (error) {
    console.log(error);
  }
}

/* =========================
   GENERATE ENTRY QR
========================= */

async function generateEntryQR(){

  const vehicleNumber =
    document.getElementById("entryVehicleNumber").value.trim();

  const ownerName =
    document.getElementById("entryOwnerName").value.trim();

  if(!vehicleNumber || !ownerName){

    document.getElementById("entryMessage").innerText =
      "Please enter vehicle number and owner name";

    return;
  }

  try{

    const response = await fetch(`${API_URL}/entry`, {

      method:"POST",

      headers:{
        "Content-Type":"application/json"
      },

      body:JSON.stringify({
        vehicle_number: vehicleNumber,
        owner_name: ownerName
      })
    });

    const data = await response.json();

    if(data.qr_code){

      const qrUrl = `${API_URL}${data.qr_code}`;

      document.getElementById("qrSection").style.display = "block";

      document.getElementById("qrImage").src = qrUrl;

      document.getElementById("entryMessage").innerText =
        "QR generated successfully";

    }else{

      document.getElementById("entryMessage").innerText =
        data.message || data.error || "QR not generated";
    }

  }catch(error){

    console.log(error);

    document.getElementById("entryMessage").innerText =
      "Error connecting to server";
  }
}



/* =========================
   BOOK SLOT
========================= */

async function bookSlot() {
  const bookingSlot = document.getElementById("bookingSlot");
  const bookingStart = document.getElementById("bookingStart");
  const bookingEnd = document.getElementById("bookingEnd");
  const bookingMessage = document.getElementById("bookingMessage");

  if (!bookingSlot.value || !bookingStart.value || !bookingEnd.value) {
    bookingMessage.innerText = "Select slot, start time and end time.";
    return;
  }

  try {
    const res = await fetch(`${API_URL}/book-slot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: currentUser.id,
        name: currentUser.name,
        vehicle_number: currentUser.vehicle_number,
        slot_number: bookingSlot.value,
        booking_start: bookingStart.value,
        booking_end: bookingEnd.value
      })
    });

    const data = await res.json();
    bookingMessage.innerText = data.message || data.error;
    loadStatus();
    loadMyBookings();
  } catch (err) {
    bookingMessage.innerText = "Booking failed. Check server connection.";
    console.error(err);
  }
}

/* =========================
   VEHICLE ENTRY
========================= */

async function vehicleEntry() {
  try {
    const res = await fetch(`${API_URL}/entry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicle_number: currentUser.vehicle_number,
        owner_name: currentUser.name
      })
    });

    const data = await res.json();
    document.getElementById("message").innerText = data.message || data.error;

    if (data.qr_code) showQR(data.qr_code);

    loadStatus();
    loadMyRecords();
  } catch (err) {
    console.error(err);
  }
}

/* =========================
   VEHICLE EXIT
========================= */

async function vehicleExit() {
  try {
    const res = await fetch(`${API_URL}/exit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicle_number: currentUser.vehicle_number })
    });

    const data = await res.json();

    if (data.total_amount) {
      document.getElementById("message").innerText =
        `${data.message} | Parking: ₹${data.parking_fee} | Fine: ₹${data.fine} | Total: ₹${data.total_amount}`;
    } else {
      document.getElementById("message").innerText = data.message || data.error;
    }

    hideQR();
    loadStatus();
    loadMyRecords();
  } catch (err) {
    console.error(err);
  }
}

/* =========================
   QR
========================= */

async function loadLatestQR() {
  try {
    const res = await fetch(`${API_URL}/latest-active-qr/${currentUser.vehicle_number}`);
    if (!res.ok) { hideQR(); return; }
    const data = await res.json();
    if (data.qr_code) showQR(data.qr_code);
  } catch (error) {
    console.log(error);
  }
}

function showQR(path) {
  document.getElementById("qrSection").style.display = "block";
  document.getElementById("qrImage").src = `${API_URL}${path}`;
}

function hideQR() {
  document.getElementById("qrSection").style.display = "none";
  document.getElementById("qrImage").src = "";
}

/* =========================
   BOOKINGS
========================= */

async function loadMyBookings() {
  try {
    const res = await fetch(`${API_URL}/my-bookings/${currentUser.vehicle_number}`);
    const bookings = await res.json();
    const container = document.getElementById("myBookings");
    container.innerHTML = "";

    if (bookings.length === 0) {
      container.innerHTML = "<p>No slot bookings found.</p>";
      return;
    }

    bookings.forEach(b => {
      container.innerHTML += `
        <div class="record">
          <p><b>Slot:</b> ${b.slot_number}</p>
          <p><b>Start:</b> ${formatDate(b.booking_start)}</p>
          <p><b>End:</b> ${formatDate(b.booking_end)}</p>
          <p class="booked-text">${b.status}</p>
        </div>
      `;
    });
  } catch (err) {
    console.error(err);
  }
}

/* =========================
   HISTORY
========================= */

async function loadMyRecords() {
  try {
    const res = await fetch(`${API_URL}/user-vehicles/${currentUser.vehicle_number}`);
    const records = await res.json();
    const container = document.getElementById("myRecords");
    container.innerHTML = "";

    if (records.length === 0) {
      container.innerHTML = "<p>No parking records found.</p>";
      return;
    }

    records.forEach(r => {
      container.innerHTML += `
        <div class="record">
          <p><b>Slot:</b> ${r.slot_number || "-"}</p>
          <p><b>Entry:</b> ${formatDate(r.entry_time)}</p>
          <p><b>Exit:</b> ${r.exit_time ? formatDate(r.exit_time) : "Still Parked"}</p>
          <p><b>Fee:</b> ₹${r.fee || 0}</p>
          <p><b>Fine:</b> ₹${r.fine || 0}</p>
          <p class="${r.exit_time ? "exited" : "active-text"}">
            ${r.exit_time ? "Exited" : "Currently Parked"}
          </p>
        </div>
      `;
    });
  } catch (err) {
    console.error(err);
  }
}

/* =========================
   VEHICLE DETAILS
========================= */

function loadVehicleDetails() {
  document.getElementById("ownerDetail").innerText = currentUser.name;
  document.getElementById("vehicleDetail").innerText = currentUser.vehicle_number;
}

/* =========================
   PROFILE DETAILS
========================= */

function loadProfileDetails() {
  document.getElementById("profileName").innerText = currentUser.name;
  document.getElementById("profileEmail").innerText = currentUser.email;
  document.getElementById("profilePhone").innerText = currentUser.phone;
  document.getElementById("profileVehicle").innerText = currentUser.vehicle_number;
}

/* =========================
   LOGOUT
========================= */

function logout() {
  localStorage.removeItem("parkingUser");
  location.reload();
}

/* =========================
   DATE FORMAT
========================= */

function formatDate(dateString) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString();
}

/* =========================
   AUTO REFRESH
========================= */

setInterval(() => {
  if (currentUser) {
    loadStatus();
    loadMyRecords();
    loadMyBookings();
    loadVehicleArrival();
    loadLatestQR();
  }
}, 5000);