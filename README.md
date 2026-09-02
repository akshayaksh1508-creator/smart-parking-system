#Smart Parking System

<div align="center">

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![IoT](https://img.shields.io/badge/IoT-Smart%20City-0078D4?style=for-the-badge)

**Real-time parking slot detection and management system.**

</div>

---

##Overview

Smart Parking System is a web-based application that simulates real-time parking slot monitoring and management. It provides a visual dashboard showing available and occupied slots, helping drivers find parking faster and reducing urban congestion.

# Features

-  **Real-time slot status** â€” live view of available vs. occupied parking spots
- **Visual parking map** â€” grid-based layout of the parking lot
- **Dashboard stats** â€” total slots, available, occupied counts
- **Auto-refresh** â€” status updates automatically without page reload
- **Responsive design** â€” works on mobile and desktop

##Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: HTML5, CSS3, JavaScript
- **Real-time**: WebSockets / polling
- **Data**: JSON-based slot state management

##Getting Started

```bash
git clone https://github.com/akshayaksh1508-creator/smart-parking-system.git
cd smart-parking-system
npm install
node server.js
```

Open [http://localhost:3000](http://localhost:3000)

##How It Works

1. Parking slots are represented as a grid
2. Each slot has a status: `available` or `occupied`
3. On entry/exit events, slot status updates in real-time
4. Dashboard reflects current stats instantly

##Future Enhancements

- [ ] QR code check-in/check-out
- [ ] License plate recognition integration
- [ ] Mobile app companion
- [ ] Payment gateway integration

##License

MIT License

---

<div align="center">
Made with by <a href="https://github.com/akshayaksh1508-creator">Akshay</a>
</div>
