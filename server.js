
const express = require("express");
const mysql = require("mysql2");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "sri usha",
    database: "usha_hotel"
});

db.connect(err => {
    if (err) {
        console.log("MySQL Error:", err.message);
    } else {
        console.log("MySQL Connected Successfully");
    }
});

// HOME
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// GET ROOMS
app.get("/api/rooms", (req, res) => {
    db.query("SELECT * FROM room", (err, result) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json(result);
    });
});

// ADD ROOM
app.post("/api/rooms", (req, res) => {
    const { room_number, room_type, price, capacity, status } = req.body;

    db.query(
        "INSERT INTO room (room_number, room_type, price, capacity, status) VALUES (?, ?, ?, ?, ?)",
        [room_number, room_type, price, capacity, status],
        (err, result) => {
            if (err) return res.status(500).json({ message: err.message });
            res.json({ message: "Room added successfully" });
        }
    );
});

// UPDATE ROOM
app.put("/api/rooms/:id", (req, res) => {
    const { room_number, room_type, price, capacity, status } = req.body;

    db.query(
        "UPDATE room SET room_number=?, room_type=?, price=?, capacity=?, status=? WHERE room_id=?",
        [room_number, room_type, price, capacity, status, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ message: err.message });
            res.json({ message: "Room updated successfully" });
        }
    );
});

// DELETE ROOM
app.delete("/api/rooms/:id", (req, res) => {
    db.query(
        "DELETE FROM room WHERE room_id=?",
        [req.params.id],
        (err) => {
            if (err) return res.status(500).json({ message: err.message });
            res.json({ message: "Room deleted successfully" });
        }
    );
});

// CUSTOMER REGISTRATION
app.post("/api/register", (req, res) => {
    const { name, email, phone, password } = req.body;

    db.query(
        "INSERT INTO customer (name, email, phone, password) VALUES (?, ?, ?, ?)",
        [name, email, phone, password],
        (err, result) => {
            if (err) return res.status(500).json({ message: err.message });
            res.json({
                message: "Customer registered successfully",
                customer_id: result.insertId
            });
        }
    );
});

// GET BOOKINGS
app.get("/api/bookings", (req, res) => {
    const sql = `
        SELECT b.*, c.name, r.room_number, r.room_type
        FROM booking b
        JOIN customer c ON b.customer_id = c.customer_id
        JOIN room r ON b.room_id = r.room_id
        ORDER BY b.booking_id DESC
    `;

    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json(result);
    });
});

// BOOK ROOM
app.post("/api/bookings", (req, res) => {
    const { customer_id, room_id, checkin_date, checkout_date } = req.body;

    if (!customer_id || !room_id || !checkin_date || !checkout_date) {
        return res.status(400).json({ message: "Please fill all details" });
    }

    if (checkout_date <= checkin_date) {
        return res.status(400).json({
            message: "Checkout date must be after check-in date"
        });
    }

    db.query(
        "SELECT * FROM customer WHERE customer_id=?",
        [customer_id],
        (err, customers) => {
            if (err) return res.status(500).json({ message: err.message });

            if (customers.length === 0) {
                return res.status(400).json({
                    message: "Customer ID not found. Register customer first."
                });
            }

            db.query(
                "SELECT * FROM room WHERE room_id=? AND status='Available'",
                [room_id],
                (err, rooms) => {
                    if (err) return res.status(500).json({ message: err.message });

                    if (rooms.length === 0) {
                        return res.status(400).json({
                            message: "Room is not available"
                        });
                    }

                    const room = rooms[0];

                    const days = Math.ceil(
                        (new Date(checkout_date) - new Date(checkin_date))
                        / (1000 * 60 * 60 * 24)
                    );

                    const total = days * Number(room.price);

                    db.query(
                        `INSERT INTO booking
                        (customer_id, room_id, checkin_date, checkout_date, total_amount, status)
                        VALUES (?, ?, ?, ?, ?, 'Booked')`,
                        [customer_id, room_id, checkin_date, checkout_date, total],
                        (err, result) => {
                            if (err) return res.status(500).json({ message: err.message });

                            db.query(
                                "UPDATE room SET status='Booked' WHERE room_id=?",
                                [room_id]
                            );

                            res.json({
                                message: "Room booked successfully",
                                booking_id: result.insertId,
                                total_amount: total
                            });
                        }
                    );
                }
            );
        }
    );
});

// CANCEL BOOKING
app.put("/api/bookings/:id/cancel", (req, res) => {
    db.query(
        "SELECT room_id FROM booking WHERE booking_id=? AND status='Booked'",
        [req.params.id],
        (err, bookings) => {
            if (err) return res.status(500).json({ message: err.message });

            if (bookings.length === 0) {
                return res.status(400).json({
                    message: "Booking not found or already cancelled"
                });
            }

            const roomId = bookings[0].room_id;

            db.query(
                "UPDATE booking SET status='Cancelled' WHERE booking_id=?",
                [req.params.id],
                err => {
                    if (err) return res.status(500).json({ message: err.message });

                    db.query(
                        "UPDATE room SET status='Available' WHERE room_id=?",
                        [roomId]
                    );

                    res.json({ message: "Booking cancelled successfully" });
                }
            );
        }
    );
});

app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});
