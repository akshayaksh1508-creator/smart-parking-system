# 🚗 Smart Parking System (IoT)

<div align="center">

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![ESP32](https://img.shields.io/badge/ESP32-Hardware-red?style=for-the-badge&logo=espressif)
![IoT](https://img.shields.io/badge/IoT-Smart%20City-0078D4?style=for-the-badge)

**Real-time parking slot detection and management system with ESP32 Hardware Integration.**

</div>

---

## 🚀 Overview

Smart Parking System is a complete end-to-end IoT solution that monitors and manages parking slot availability in real-time. Using ESP32 microcontrollers for hardware sensing and a responsive web dashboard for management, it helps drivers find parking faster and reduces urban congestion.

## ✨ Features

- 🟢 **Real-time slot status** — live view of available vs. occupied parking spots updated by ESP32 sensors.
- 🗺️ **Visual parking map** — grid-based layout of the parking lot.
- 📊 **Admin Dashboard** — monitor total slots, available slots, and occupied counts in real time.
- 🔍 **QR/Scanner Interface** — includes scanner functionality for vehicle entry/exit.
- 📱 **Responsive design** — dedicated user and admin views built with modern HTML/CSS/JS.

## 🛠️ Tech Stack

- **Hardware/IoT**: ESP32 Microcontroller (C++/Arduino IDE)
- **Backend**: Node.js, Express.js
- **Frontend**: Vanilla HTML5, CSS3, JavaScript, Vite
- **Real-time Comms**: WebSockets / REST API

## 📁 Repository Structure

- /esp32 - Contains the esp32.ino firmware for the microcontrollers/sensors.
- /frontend & /backend - Web application source code.
- dmin.html / user.html / scanner.html - Specific dashboard views.
- ite.config.js - Frontend tooling configuration.

## ⚡ Getting Started

### 1. Web Application Setup
`ash
git clone https://github.com/akshayaksh1508-creator/smart-parking-system.git
cd smart-parking-system
npm install
npm run dev
`

### 2. Hardware Setup
1. Open esp32/esp32.ino in the Arduino IDE.
2. Update the Wi-Fi credentials and API endpoint in the code.
3. Flash the code to your ESP32 board.

## 📄 License

MIT License

---

<div align="center">
Made with ❤️ by <a href="https://github.com/akshayaksh1508-creator">Akshay</a>
</div>