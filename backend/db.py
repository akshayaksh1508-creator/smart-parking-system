import mysql.connector

db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="Akshay@2006",
    database="smart_parking",
    autocommit=True
)