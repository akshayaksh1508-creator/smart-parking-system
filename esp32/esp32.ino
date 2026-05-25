#include <WiFi.h>
#include <HTTPClient.h>
#include <ESP32Servo.h>
#include <WiFiClient.h>

/* ================= WIFI DETAILS ================= */


const char* ssid = "Akshay's Laptop";
const char* password = "244466666";

/* ================= FLASK BACKEND ================= */

String serverURL = "http://172.17.38.167:5000";

/* ================= IR SENSOR PINS ================= */

#define ENTRY_IR 32
#define EXIT_IR 33

#define SLOT1_IR 25
#define SLOT2_IR 26
#define SLOT3_IR 27

/* ================= SERVO PINS ================= */

#define ENTRY_SERVO_PIN 14
#define EXIT_SERVO_PIN 13

/* ================= SERVO OBJECTS ================= */

Servo entryServo;
Servo exitServo;

/* ================= SERVO ANGLES ================= */

int gateClosed = 0;
int gateOpen = 120;

/* ================= TIMING ================= */

unsigned long lastServerUpdate = 0;
const unsigned long updateInterval = 2000;

/* ================= GATE STATE ================= */

bool entryGateBusy = false;
bool exitGateBusy = false;

/* ================= SETUP ================= */

void setup() {
  Serial.begin(115200);
  Serial.println(serverURL);
  pinMode(ENTRY_IR, INPUT);
  pinMode(EXIT_IR, INPUT);

  pinMode(SLOT1_IR, INPUT);
  pinMode(SLOT2_IR, INPUT);
  pinMode(SLOT3_IR, INPUT);

  entryServo.setPeriodHertz(50);
  exitServo.setPeriodHertz(50);

  entryServo.attach(ENTRY_SERVO_PIN, 500, 2400);
  exitServo.attach(EXIT_SERVO_PIN, 500, 2400);

  entryServo.write(gateClosed);
  exitServo.write(gateClosed);

  delay(1000);

  WiFi.begin(ssid, password);

  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi Connected");
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());

  Serial.println("Smart Parking Hardware Started");
}

/* ================= LOOP ================= */

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    reconnectWiFi();
  }

  if (millis() - lastServerUpdate >= updateInterval) {
  sendSlotStatusToWebsite();
  sendVehicleArrivalToWebsite();
  checkGateCommandFromWebsite();
  lastServerUpdate = millis();
}
}

/* ================= WIFI RECONNECT ================= */

void reconnectWiFi() {
  Serial.println("WiFi disconnected. Reconnecting...");

  WiFi.disconnect();
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Reconnected");
}

/* ================= SEND SLOT STATUS ================= */

void sendSlotStatusToWebsite() {
  String slot1 = digitalRead(SLOT1_IR) == LOW ? "Occupied" : "Available";
  String slot2 = digitalRead(SLOT2_IR) == LOW ? "Occupied" : "Available";
  String slot3 = digitalRead(SLOT3_IR) == LOW ? "Occupied" : "Available";

  WiFiClient client;
  HTTPClient http;

  String url = serverURL + "/hardware/update-slots";

  Serial.print("POST URL: ");
  Serial.println(url);

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");

  String body = "{";
  body += "\"slot1\":\"" + slot1 + "\",";
  body += "\"slot2\":\"" + slot2 + "\",";
  body += "\"slot3\":\"" + slot3 + "\"";
  body += "}";

  int responseCode = http.POST(body);

  Serial.println("========== SLOT UPDATE ==========");
  Serial.println(body);
  Serial.print("Server Response: ");
  Serial.println(responseCode);

  if(responseCode > 0){
    Serial.println(http.getString());
  }

  Serial.println("=================================");

  http.end();
}
void sendVehicleArrivalToWebsite() {
  String entryDetected = digitalRead(ENTRY_IR) == LOW ? "true" : "false";
  String exitDetected  = digitalRead(EXIT_IR) == LOW ? "true" : "false";

  WiFiClient client;
  HTTPClient http;

  String url = serverURL + "/hardware/vehicle-arrival";

  Serial.print("ARRIVAL URL:");
  Serial.println(url);

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");

  String body = "{";
  body += "\"entry_detected\":" + entryDetected + ",";
  body += "\"exit_detected\":" + exitDetected;
  body += "}";

  int responseCode = http.POST(body);

  Serial.print("Arrival Response: ");
  Serial.println(responseCode);
  Serial.println(body);

  http.end();
}
/* ================= CHECK GATE COMMAND ================= */

void checkGateCommandFromWebsite() {
  WiFiClient client;
  HTTPClient http;

  String url = serverURL + "/hardware/gate-command";

  Serial.print("GET URL:");
  Serial.println(url);

  http.begin(client, url);

  int responseCode = http.GET();

  if (responseCode == 200) {
    String response = http.getString();

    Serial.println("========== GATE COMMAND ==========");
    Serial.println(response);
    Serial.println("==================================");

    if (response.indexOf("\"entry_gate\":true") >= 0 ||
        response.indexOf("\"entry_gate\": true") >= 0) {
      openEntryGate();
    }

    if (response.indexOf("\"exit_gate\":true") >= 0 ||
        response.indexOf("\"exit_gate\": true") >= 0) {
      openExitGate();
    }
  } else {
    Serial.print("Gate Command Error: ");
    Serial.println(responseCode);
  }

  http.end();
}
/* ================= ENTRY GATE ================= */

void openEntryGate() {
  if (entryGateBusy) return;

  entryGateBusy = true;

  Serial.println("ENTRY GATE OPENING");

  entryServo.write(gateOpen);

  delay(3000);

  entryServo.write(gateClosed);

  delay(1000);

  Serial.println("ENTRY GATE CLOSED");

  entryGateBusy = false;
}
/* ================= EXIT GATE ================= */

void openExitGate() {
  if (exitGateBusy) return;

  exitGateBusy = true;

  Serial.println("EXIT GATE OPENING");

  exitServo.write(gateOpen);

  delay(3000);

  exitServo.write(gateClosed);

  delay(1000);

  Serial.println("EXIT GATE CLOSED");

  exitGateBusy = false;
}