from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from datetime import datetime, timedelta
from functools import wraps
import qrcode
import os
import uuid

app = Flask(__name__)
CORS(app)

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"
ADMIN_TOKEN = "SMART_ADMIN_SECRET_TOKEN"

BOOKING_GRACE_MINUTES = 15
WRONG_SLOT_FINE = 500

hardware_command = {
    "entry_gate": False,
    "exit_gate": False
}

slot_status = {
    "slot1": "Available",
    "slot2": "Available",
    "slot3": "Available"
}


def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="Akshay@2006",
        database="smart_parking",
        autocommit=True
    )


def admin_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        token = request.headers.get("Admin-Token")

        if token != ADMIN_TOKEN:
            return jsonify({"error": "Admin access denied"}), 403

        return func(*args, **kwargs)

    return wrapper


def get_parking_settings(cursor):
    cursor.execute("SELECT * FROM parking_settings ORDER BY id DESC LIMIT 1")
    settings = cursor.fetchone()

    if not settings:
        return {
            "total_slots": 3,
            "price_per_hour": 20
        }

    return settings


def expire_old_bookings(cursor):
    now = datetime.now()
    grace_time = now - timedelta(minutes=BOOKING_GRACE_MINUTES)

    cursor.execute("""
        SELECT *
        FROM bookings
        WHERE status='Booked'
        AND booking_start < %s
    """, (grace_time,))

    bookings = cursor.fetchall()

    for booking in bookings:
        cursor.execute("""
            SELECT *
            FROM parking_logs
            WHERE vehicle_number=%s
            AND slot_number=%s
            AND entry_time BETWEEN %s AND %s
            LIMIT 1
        """, (
            booking["vehicle_number"],
            booking["slot_number"],
            booking["booking_start"],
            booking["booking_end"]
        ))

        arrived = cursor.fetchone()

        if not arrived:
            cursor.execute("""
                UPDATE bookings
                SET status='Expired',
                    expired_at=%s
                WHERE id=%s
            """, (now, booking["id"]))


def get_current_bookings(cursor):
    expire_old_bookings(cursor)

    now = datetime.now()

    cursor.execute("""
        SELECT *
        FROM bookings
        WHERE booking_start <= %s
        AND booking_end >= %s
        AND status='Booked'
    """, (now, now))

    return cursor.fetchall()


def get_occupied_slots(cursor):
    cursor.execute("""
        SELECT slot_number
        FROM parking_logs
        WHERE exit_time IS NULL
        AND slot_number IS NOT NULL
    """)

    rows = cursor.fetchall()
    return [row["slot_number"] for row in rows]


@app.route("/")
def home():
    return jsonify({"message": "Smart Parking Backend Running"})


@app.route("/esp-test", methods=["GET"])
def esp_test():
    return jsonify({"message": "ESP32 connected to Flask"})


@app.route("/admin-login", methods=["POST"])
def admin_login():
    data = request.get_json()

    username = data.get("username")
    password = data.get("password")

    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        return jsonify({
            "message": "Admin login successful",
            "token": ADMIN_TOKEN
        })

    return jsonify({"error": "Invalid admin username or password"}), 401


@app.route("/status", methods=["GET"])
def parking_status():
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    settings = get_parking_settings(cursor)
    total_slots = int(settings["total_slots"])

    occupied_slots = get_occupied_slots(cursor)
    current_bookings = get_current_bookings(cursor)
    booked_slots = [booking["slot_number"] for booking in current_bookings]

    slot_details = []

    for slot in range(1, total_slots + 1):
        hardware_key = f"slot{slot}"

        if hardware_key in slot_status:
            status = slot_status[hardware_key]
        elif slot in occupied_slots:
            status = "Occupied"
        elif slot in booked_slots:
            status = "Booked"
        else:
            status = "Available"

        slot_details.append({
            "slot_number": slot,
            "status": status
        })

    occupied = len([s for s in slot_details if s["status"] == "Occupied"])
    available = len([s for s in slot_details if s["status"] == "Available"])

    cursor.close()
    db.close()

    return jsonify({
        "total_slots": total_slots,
        "occupied_slots": occupied,
        "available_slots": available,
        "price_per_hour": float(settings["price_per_hour"]),
        "slots": slot_details
    })


@app.route("/parking-settings", methods=["GET", "POST"])
@admin_required
def parking_settings():
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    if request.method == "GET":
        settings = get_parking_settings(cursor)

        cursor.close()
        db.close()

        return jsonify({
            "total_slots": settings["total_slots"],
            "price_per_hour": float(settings["price_per_hour"])
        })

    data = request.get_json()

    total_slots = data.get("total_slots")
    price_per_hour = data.get("price_per_hour")

    if not total_slots or not price_per_hour:
        cursor.close()
        db.close()
        return jsonify({"error": "Total slots and price required"}), 400

    cursor.execute("""
        UPDATE parking_settings
        SET total_slots=%s,
            price_per_hour=%s
        WHERE id=1
    """, (total_slots, price_per_hour))

    cursor.close()
    db.close()

    return jsonify({"message": "Parking settings updated successfully"})


@app.route("/register", methods=["POST"])
def register_user():
    data = request.get_json()

    name = data.get("name")
    email = data.get("email")
    phone = data.get("phone")
    vehicle_number = data.get("vehicle_number")
    password = data.get("password")

    if not name or not email or not phone or not vehicle_number or not password:
        return jsonify({"error": "All fields are required"}), 400

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    cursor.execute("""
        SELECT *
        FROM users
        WHERE email=%s OR vehicle_number=%s
    """, (email, vehicle_number))

    existing = cursor.fetchone()

    if existing:
        cursor.close()
        db.close()
        return jsonify({"error": "Email or vehicle number already registered"}), 400

    cursor.execute("""
        INSERT INTO users(name, email, phone, vehicle_number, password)
        VALUES(%s, %s, %s, %s, %s)
    """, (name, email, phone, vehicle_number, password))

    cursor.close()
    db.close()

    return jsonify({"message": "Registration successful"})


@app.route("/login", methods=["POST"])
def login_user():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    cursor.execute("""
        SELECT id, name, email, phone, vehicle_number
        FROM users
        WHERE email=%s AND password=%s
    """, (email, password))

    user = cursor.fetchone()

    cursor.close()
    db.close()

    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    return jsonify({
        "message": "Login successful",
        "user": user
    })


@app.route("/book-slot", methods=["POST"])
def book_slot():
    data = request.get_json()

    user_id = data.get("user_id")
    name = data.get("name")
    vehicle_number = data.get("vehicle_number")
    slot_number = data.get("slot_number")
    booking_start = data.get("booking_start")
    booking_end = data.get("booking_end")

    if not user_id or not name or not vehicle_number or not slot_number or not booking_start or not booking_end:
        return jsonify({"error": "All booking fields are required"}), 400

    slot_number = int(slot_number)

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    settings = get_parking_settings(cursor)
    total_slots = int(settings["total_slots"])

    if slot_number < 1 or slot_number > total_slots:
        cursor.close()
        db.close()
        return jsonify({"error": "Invalid slot number"}), 400

    expire_old_bookings(cursor)

    cursor.execute("""
        SELECT *
        FROM bookings
        WHERE slot_number=%s
        AND status='Booked'
        AND (
            (%s BETWEEN booking_start AND booking_end)
            OR (%s BETWEEN booking_start AND booking_end)
            OR (booking_start BETWEEN %s AND %s)
        )
    """, (
        slot_number,
        booking_start,
        booking_end,
        booking_start,
        booking_end
    ))

    existing_booking = cursor.fetchone()

    if existing_booking:
        cursor.close()
        db.close()
        return jsonify({"error": "This slot is already booked for selected time"}), 400

    cursor.execute("""
        INSERT INTO bookings(user_id, name, vehicle_number, slot_number, booking_start, booking_end, status)
        VALUES(%s, %s, %s, %s, %s, %s, 'Booked')
    """, (
        user_id,
        name,
        vehicle_number,
        slot_number,
        booking_start,
        booking_end
    ))

    cursor.close()
    db.close()

    return jsonify({"message": f"Slot {slot_number} booked successfully"})


@app.route("/my-bookings/<vehicle_number>", methods=["GET"])
def my_bookings(vehicle_number):
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    expire_old_bookings(cursor)

    cursor.execute("""
        SELECT *
        FROM bookings
        WHERE vehicle_number=%s
        ORDER BY booking_start DESC
    """, (vehicle_number,))

    bookings = cursor.fetchall()

    cursor.close()
    db.close()

    return jsonify(bookings)


@app.route("/entry", methods=["POST"])
def entry_vehicle():
    global hardware_command

    data = request.get_json()

    vehicle_number = data.get("vehicle_number")
    owner_name = data.get("owner_name")
    requested_slot = data.get("slot_number")

    if not vehicle_number or not owner_name:
        return jsonify({"error": "Vehicle number and owner name required"}), 400

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    settings = get_parking_settings(cursor)
    total_slots = int(settings["total_slots"])

    cursor.execute("""
        SELECT *
        FROM users
        WHERE vehicle_number=%s
    """, (vehicle_number,))

    registered_user = cursor.fetchone()

    if not registered_user:
        cursor.close()
        db.close()
        return jsonify({"error": "Vehicle not registered"}), 403

    cursor.execute("""
        SELECT *
        FROM parking_logs
        WHERE vehicle_number=%s
        AND exit_time IS NULL
    """, (vehicle_number,))

    already_parked = cursor.fetchone()

    if already_parked:
        cursor.close()
        db.close()
        return jsonify({"message": "Vehicle already parked"}), 400

    occupied_slots = get_occupied_slots(cursor)
    current_bookings = get_current_bookings(cursor)
    booked_slots = [booking["slot_number"] for booking in current_bookings]

    user_active_booking = None

    for booking in current_bookings:
        if booking["vehicle_number"] == vehicle_number:
            user_active_booking = booking
            break

    assigned_slot = None
    fine = 0

    if user_active_booking:
        assigned_slot = user_active_booking["slot_number"]

        if assigned_slot in occupied_slots:
            cursor.close()
            db.close()
            return jsonify({"error": "Your booked slot is occupied. Contact owner."}), 400

    elif requested_slot:
        requested_slot = int(requested_slot)
        assigned_slot = requested_slot

        for booking in current_bookings:
            if booking["slot_number"] == requested_slot and booking["vehicle_number"] != vehicle_number:
                fine = WRONG_SLOT_FINE
                break

        if assigned_slot in occupied_slots:
            cursor.close()
            db.close()
            return jsonify({"error": "Selected slot already occupied"}), 400

    else:
        for slot in range(1, total_slots + 1):
            hardware_key = f"slot{slot}"

            hardware_available = slot_status.get(hardware_key, "Available") == "Available"

            if slot not in occupied_slots and slot not in booked_slots and hardware_available:
                assigned_slot = slot
                break

    if not assigned_slot:
        cursor.close()
        db.close()
        return jsonify({"message": "No available non-reserved slot"}), 400

    entry_time = datetime.now()
    qr_token = f"SMARTPARK-{vehicle_number}-{uuid.uuid4().hex}"

    cursor.execute("""
        INSERT INTO parking_logs(vehicle_number, owner_name, entry_time, slot_number, qr_token, qr_verified, fine)
        VALUES(%s, %s, %s, %s, %s, %s, %s)
    """, (
        vehicle_number,
        owner_name,
        entry_time,
        assigned_slot,
        qr_token,
        False,
        fine
    ))

    log_id = cursor.lastrowid

    qr_folder = os.path.join("static", "qrcodes")
    os.makedirs(qr_folder, exist_ok=True)

    qr_filename = f"qr_{log_id}_{vehicle_number}.png"
    qr_path = os.path.join(qr_folder, qr_filename)

    qr_img = qrcode.make(qr_token)
    qr_img.save(qr_path)

    qr_url = f"/static/qrcodes/{qr_filename}"

    cursor.execute("""
        UPDATE parking_logs
        SET qr_code=%s
        WHERE id=%s
    """, (qr_url, log_id))

    

    cursor.close()
    db.close()

    message = f"Vehicle Entered Successfully. Slot {assigned_slot} assigned."

    if fine > 0:
        message += f" Fine added: ₹{fine}"

    return jsonify({
        "message": message,
        "vehicle_number": vehicle_number,
        "owner_name": owner_name,
        "slot_number": assigned_slot,
        "fine": fine,
        "entry_time": str(entry_time),
        "qr_token": qr_token,
        "qr_code": qr_url
    })


@app.route("/verify-qr", methods=["POST"])
def verify_qr():
    global hardware_command

    data = request.get_json()
    qr_token = data.get("qr_token")

    if not qr_token:
        return jsonify({"error": "QR token required"}), 400

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    cursor.execute("""
        SELECT *
        FROM parking_logs
        WHERE qr_token=%s
        AND exit_time IS NULL
    """, (qr_token,))
    

    record = cursor.fetchone()

    if not record:
        cursor.close()
        db.close()
        return jsonify({
            "allowed": False,
            "message": "Invalid or expired QR"
        }), 404

    cursor.execute("""
        UPDATE parking_logs
        SET qr_verified=TRUE
        WHERE id=%s
    """, (record["id"],))

    hardware_command["entry_gate"] = True
    db.commit() 

    cursor.close()
    db.close()

    return jsonify({
        "allowed": True,
        "message": "QR verified. Entry gate can open.",
        "vehicle_number": record["vehicle_number"]
    })


@app.route("/exit", methods=["POST"])
def exit_vehicle():
    global hardware_command

    data = request.get_json()
    vehicle_number = data.get("vehicle_number")

    if not vehicle_number:
        return jsonify({"error": "Vehicle number required"}), 400

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    settings = get_parking_settings(cursor)
    price_per_hour = float(settings["price_per_hour"])

    cursor.execute("""
        SELECT *
        FROM parking_logs
        WHERE vehicle_number=%s
        AND exit_time IS NULL
        ORDER BY id DESC
        LIMIT 1
    """, (vehicle_number,))

    vehicle = cursor.fetchone()

    if not vehicle:
        
        db.commit()
        cursor.close()
        db.close()
        return jsonify({"message": "Vehicle not found"}), 404

    exit_time = datetime.now()
    entry_time = vehicle["entry_time"]

    duration = exit_time - entry_time
    hours = duration.total_seconds() / 3600

    parking_fee = round(max(1, hours) * price_per_hour, 2)
    fine = float(vehicle.get("fine") or 0)
    total_amount = parking_fee + fine

    cursor.execute("""
        UPDATE parking_logs
        SET exit_time=%s,
            fee=%s
        WHERE id=%s
    """, (exit_time, total_amount, vehicle["id"]))

    hardware_command["exit_gate"] = True
    
    cursor.close()
    db.close()

    return jsonify({
        "message": "Vehicle Exited Successfully",
        "vehicle_number": vehicle_number,
        "entry_time": str(entry_time),
        "exit_time": str(exit_time),
        "parking_fee": parking_fee,
        "fine": fine,
        "total_amount": total_amount
    })


@app.route("/vehicles", methods=["GET"])
@admin_required
def get_vehicles():
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    expire_old_bookings(cursor)

    cursor.execute("""
        SELECT *
        FROM parking_logs
        ORDER BY id DESC
    """)

    vehicles = cursor.fetchall()

    cursor.close()
    db.close()

    return jsonify(vehicles)


@app.route("/user-vehicles/<vehicle_number>", methods=["GET"])
def user_vehicle_history(vehicle_number):
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    cursor.execute("""
        SELECT *
        FROM parking_logs
        WHERE vehicle_number=%s
        ORDER BY id DESC
    """, (vehicle_number,))

    records = cursor.fetchall()

    cursor.close()
    db.close()

    return jsonify(records)


@app.route("/latest-active-qr/<vehicle_number>", methods=["GET"])
def latest_active_qr(vehicle_number):
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    cursor.execute("""
        SELECT qr_code, qr_token
        FROM parking_logs
        WHERE vehicle_number=%s
        AND exit_time IS NULL
        ORDER BY id DESC
        LIMIT 1
    """, (vehicle_number,))

    record = cursor.fetchone()

    cursor.close()
    db.close()

    if not record:
        return jsonify({"message": "No active QR found"}), 404

    return jsonify(record)


@app.route("/hardware/update-slots", methods=["POST"])
def update_hardware_slots():
    global slot_status

    data = request.get_json()

    slot_status["slot1"] = data.get("slot1", "Available")
    slot_status["slot2"] = data.get("slot2", "Available")
    slot_status["slot3"] = data.get("slot3", "Available")

    return jsonify({
        "message": "Slot status updated",
        "slots": slot_status
    })
vehicle_arrival = {
    "entry_detected": False,
    "exit_detected": False
}


@app.route("/hardware/vehicle-arrival", methods=["POST"])
def hardware_vehicle_arrival():
    global vehicle_arrival

    data = request.get_json()

    vehicle_arrival["entry_detected"] = data.get("entry_detected", False)
    vehicle_arrival["exit_detected"] = data.get("exit_detected", False)

    return jsonify({
        "message": "Vehicle arrival updated",
        "vehicle_arrival": vehicle_arrival
    })


@app.route("/hardware/vehicle-arrival", methods=["GET"])
def get_vehicle_arrival():
    return jsonify(vehicle_arrival)

@app.route("/hardware/gate-command", methods=["GET"])
def gate_command():

    global hardware_command

    response = hardware_command.copy()

    hardware_command["entry_gate"] = False
    hardware_command["exit_gate"] = False

    return jsonify(response)

@app.route("/hardware/open-entry", methods=["POST"])
def open_entry_from_website():
    global hardware_command

    hardware_command["entry_gate"] = True

    return jsonify({"message": "Entry gate command sent"})


@app.route("/hardware/open-exit", methods=["POST"])
def open_exit_from_website():
    global hardware_command

    hardware_command["exit_gate"] = True

    return jsonify({"message": "Exit gate command sent"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)