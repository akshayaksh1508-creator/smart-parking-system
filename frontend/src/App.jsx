import { useEffect, useState } from "react";
import axios from "axios";

function App() {

  const [isLogin, setIsLogin] = useState(true);

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [dashboard, setDashboard] = useState({});

  const [logs, setLogs] = useState([]);

  const [slots, setSlots] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    vehicle_number: "",
    password: ""
  });

  // HANDLE INPUT CHANGE
  const handleChange = (e) => {

    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // REGISTER USER
  const handleRegister = async (e) => {

    e.preventDefault();

    try {

      const response = await axios.post(
        "http://127.0.0.1:5000/register",
        formData
      );

      alert(response.data.message);

    } catch (error) {

      console.log(error);

      alert("Registration Failed");
    }
  };

  // LOGIN USER
  const handleLogin = async (e) => {

    e.preventDefault();

    try {

      const response = await axios.post(
        "http://127.0.0.1:5000/login",
        {
          email: formData.email,
          password: formData.password
        }
      );

      if (response.data.success) {

        alert("Login Successful");

        setIsLoggedIn(true);

        fetchDashboard();
        fetchLogs();
        fetchSlots();

      } else {

        alert("Invalid Credentials");
      }

    } catch (error) {

      console.log(error);

      alert("Server Error");
    }
  };

  // FETCH DASHBOARD
  const fetchDashboard = async () => {

    try {

      const response = await axios.get(
        "http://127.0.0.1:5000/dashboard"
      );

      setDashboard(response.data);

    } catch (error) {

      console.log(error);
    }
  };

  // FETCH LOGS
  const fetchLogs = async () => {

    try {

      const response = await axios.get(
        "http://127.0.0.1:5000/logs"
      );

      setLogs(response.data);

    } catch (error) {

      console.log(error);
    }
  };

  // FETCH PARKING SLOTS
  const fetchSlots = async () => {

    try {

      const response = await axios.get(
        "http://127.0.0.1:5000/slots"
      );

      setSlots(response.data);

    } catch (error) {

      console.log(error);
    }
  };

  // LIVE UPDATES
  useEffect(() => {

    if (isLoggedIn) {

      const interval = setInterval(() => {

        fetchDashboard();
        fetchLogs();
        fetchSlots();

      }, 3000);

      return () => clearInterval(interval);
    }

  }, [isLoggedIn]);

  // DASHBOARD PAGE
  if (isLoggedIn) {

    return (

      <div style={{ padding: "30px" }}>

        <h1>Smart Parking Dashboard</h1>

        {/* DASHBOARD CARDS */}

        <div style={{
          display: "flex",
          gap: "20px",
          marginBottom: "30px",
          flexWrap: "wrap"
        }}>

          <div style={{
            border: "1px solid black",
            padding: "20px",
            width: "200px",
            borderRadius: "10px"
          }}>

            <h2>Total Vehicles</h2>

            <h1>{dashboard.total_vehicles}</h1>

          </div>

          <div style={{
            border: "1px solid black",
            padding: "20px",
            width: "200px",
            borderRadius: "10px"
          }}>

            <h2>Revenue</h2>

            <h1>₹ {dashboard.revenue}</h1>

          </div>

          <div style={{
            border: "1px solid black",
            padding: "20px",
            width: "200px",
            borderRadius: "10px"
          }}>

            <h2>Active Parking</h2>

            <h1>{dashboard.active_parking}</h1>

          </div>

        </div>

        {/* PARKING SLOTS */}

        <h2>Parking Slots</h2>

        <div style={{
          display: "flex",
          gap: "20px",
          marginBottom: "30px",
          flexWrap: "wrap"
        }}>

          {
            slots.map((slot, index) => (

              <div
                key={index}
                style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "10px",
                  backgroundColor:
                    slot.status === "Occupied"
                      ? "red"
                      : "green",
                  color: "white",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  fontSize: "20px",
                  fontWeight: "bold"
                }}
              >

                <div>{slot.slot_id}</div>

                <div style={{ fontSize: "16px" }}>
                  {slot.status}
                </div>

              </div>
            ))
          }

        </div>

        {/* VEHICLE LOGS */}

        <h2>Vehicle Logs</h2>

        <table
          border="1"
          cellPadding="10"
          style={{
            width: "100%",
            borderCollapse: "collapse"
          }}
        >

          <thead>

            <tr>

              <th>Vehicle Number</th>
              <th>Entry Time</th>
              <th>Exit Time</th>
              <th>Amount</th>
              <th>Duration</th>

            </tr>

          </thead>

          <tbody>

            {
              logs.map((log, index) => (

                <tr key={index}>

                  <td>{log.vehicle_number}</td>
                  <td>{log.entry_time}</td>
                  <td>{log.exit_time}</td>
                  <td>{log.amount}</td>
                  <td>{log.duration}</td>

                </tr>
              ))
            }

          </tbody>

        </table>

      </div>
    );
  }

  // LOGIN + REGISTER PAGE
  return (

    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      backgroundColor: "#f4f4f4"
    }}>

      <div style={{
        backgroundColor: "white",
        padding: "40px",
        borderRadius: "10px",
        width: "400px",
        boxShadow: "0px 0px 10px rgba(0,0,0,0.2)"
      }}>

        <h1 style={{ textAlign: "center" }}>
          Smart Parking System
        </h1>

        {/* TOGGLE BUTTONS */}

        <div style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "20px"
        }}>

          <button
            onClick={() => setIsLogin(true)}
            style={{
              width: "48%",
              padding: "10px"
            }}
          >
            Login
          </button>

          <button
            onClick={() => setIsLogin(false)}
            style={{
              width: "48%",
              padding: "10px"
            }}
          >
            Register
          </button>

        </div>

        {
          isLogin ? (

            // LOGIN FORM

            <form onSubmit={handleLogin}>

              <input
                type="email"
                name="email"
                placeholder="Enter Email"
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  marginTop: "20px"
                }}
              />

              <input
                type="password"
                name="password"
                placeholder="Enter Password"
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  marginTop: "20px"
                }}
              />

              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "12px",
                  marginTop: "20px",
                  backgroundColor: "blue",
                  color: "white",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                Login
              </button>

            </form>

          ) : (

            // REGISTER FORM

            <form onSubmit={handleRegister}>

              <input
                type="text"
                name="name"
                placeholder="Enter Name"
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  marginTop: "20px"
                }}
              />

              <input
                type="email"
                name="email"
                placeholder="Enter Email"
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  marginTop: "20px"
                }}
              />

              <input
                type="text"
                name="phone"
                placeholder="Enter Phone"
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  marginTop: "20px"
                }}
              />

              <input
                type="text"
                name="vehicle_number"
                placeholder="Vehicle Number"
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  marginTop: "20px"
                }}
              />

              <input
                type="password"
                name="password"
                placeholder="Enter Password"
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  marginTop: "20px"
                }}
              />

              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "12px",
                  marginTop: "20px",
                  backgroundColor: "green",
                  color: "white",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                Register
              </button>

            </form>
          )
        }

      </div>

    </div>
  );
}

export default App;