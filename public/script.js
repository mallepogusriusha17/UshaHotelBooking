
const API = "/api";

// Load rooms when website opens
document.addEventListener("DOMContentLoaded", () => {
    loadRooms();
    loadBookings();
});

// Get rooms from database
async function loadRooms() {
    try {
        const response = await fetch(`${API}/rooms`);
        const rooms = await response.json();

        displayRooms(rooms);
        displayAdminRooms(rooms);
        populateBookingRooms(rooms);
    } catch (error) {
        alert("Unable to load rooms. Check server connection.");
    }
}

// Display rooms on home page
function displayRooms(rooms) {
    const container = document.getElementById("roomContainer");
    container.innerHTML = "";

    const availableRooms = rooms.filter(room =>
        room.status === "Available"
    );

    if (availableRooms.length === 0) {
        container.innerHTML = "<p>No available rooms found.</p>";
        return;
    }

    availableRooms.forEach(room => {
        container.innerHTML += `
            <div class="room-card">
                <div class="room-image">🛏️</div>

                <div class="room-details">
                    <h3>${room.room_type} Room</h3>
                    <p>Room Number: ${room.room_number}</p>
                    <p>Capacity: ${room.capacity} Guests</p>
                    <p class="room-price">₹${room.price} / Night</p>

                    <button onclick="selectRoom(${room.room_id})">
                        Book This Room
                    </button>
                </div>
            </div>
        `;
    });
}

// Search rooms
function searchRooms() {
    const type = document.getElementById("searchType").value;

    fetch(`${API}/rooms`)
        .then(response => response.json())
        .then(rooms => {
            let filtered = rooms.filter(room =>
                room.status === "Available"
            );

            if (type !== "") {
                filtered = filtered.filter(room =>
                    room.room_type === type
                );
            }

            displayRooms(filtered);
        });
}

// Select room for booking
function selectRoom(id) {
    document.getElementById("bookingRoom").value = id;

    document.getElementById("booking").scrollIntoView({
        behavior: "smooth"
    });
}

// Populate booking room dropdown
function populateBookingRooms(rooms) {
    const select = document.getElementById("bookingRoom");

    select.innerHTML = '<option value="">Select Room</option>';

    rooms.filter(room => room.status === "Available")
        .forEach(room => {
            select.innerHTML += `
                <option value="${room.room_id}">
                    ${room.room_number} - ${room.room_type}
                    - ₹${room.price}
                </option>
            `;
        });
}

// Book a room
document.getElementById("bookingForm").addEventListener("submit",
    async function(event) {
        event.preventDefault();

        const booking = {
            customer_id: document.getElementById("customerId").value,
            room_id: document.getElementById("bookingRoom").value,
            checkin_date: document.getElementById("checkin").value,
            checkout_date: document.getElementById("checkout").value
        };

        if (!booking.room_id) {
            alert("Please select a room");
            return;
        }

        try {
            const response = await fetch(`${API}/bookings`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(booking)
            });

            const result = await response.json();

            if (!response.ok) {
                alert(result.message || "Booking failed");
                return;
            }

            alert(
                "Booking Successful!\nBooking ID: " +
                result.booking_id +
                "\nTotal Amount: ₹" +
                result.total_amount
            );

            this.reset();

            loadRooms();
            loadBookings();
        } catch (error) {
            alert("Server error");
        }
    }
);

// Load all bookings
async function loadBookings() {
    try {
        const response = await fetch(`${API}/bookings`);
        const bookings = await response.json();

        const table = document.getElementById("bookingTable");
        table.innerHTML = "";

        bookings.forEach(booking => {
            const action = booking.status === "Booked"
                ? `<button class="cancel-btn"
                    onclick="cancelBooking(${booking.booking_id})">
                    Cancel
                   </button>`
                : "-";

            table.innerHTML += `
                <tr>
                    <td>${booking.booking_id}</td>
                    <td>${booking.name}</td>
                    <td>${booking.room_number}</td>
                    <td>${booking.checkin_date}</td>
                    <td>${booking.checkout_date}</td>
                    <td>₹${booking.total_amount}</td>
                    <td>${booking.status}</td>
                    <td>${action}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.log(error);
    }
}

// Cancel booking
async function cancelBooking(id) {
    if (!confirm("Are you sure you want to cancel this booking?")) {
        return;
    }

    const response = await fetch(`${API}/bookings/${id}/cancel`, {
        method: "PUT"
    });

    const result = await response.json();

    alert(result.message);

    loadBookings();
    loadRooms();
}

// Display admin room table
function displayAdminRooms(rooms) {
    const table = document.getElementById("adminRoomTable");
    table.innerHTML = "";

    rooms.forEach(room => {
        table.innerHTML += `
            <tr>
                <td>${room.room_id}</td>
                <td>${room.room_number}</td>
                <td>${room.room_type}</td>
                <td>₹${room.price}</td>
                <td>${room.capacity}</td>
                <td>${room.status}</td>

                <td>
                    <button onclick="editRoom(${room.room_id},
                        '${room.room_number}',
                        '${room.room_type}',
                        ${room.price},
                        ${room.capacity},
                        '${room.status}')">
                        Edit
                    </button>

                    <button class="delete-btn"
                        onclick="deleteRoom(${room.room_id})">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });
}

// Add or update room
document.getElementById("roomForm").addEventListener("submit",
    async function(event) {
        event.preventDefault();

        const id = document.getElementById("roomId").value;

        const room = {
            room_number: document.getElementById("roomNumber").value,
            room_type: document.getElementById("roomType").value,
            price: document.getElementById("roomPrice").value,
            capacity: document.getElementById("roomCapacity").value,
            status: document.getElementById("roomStatus").value
        };

        const url = id
            ? `${API}/rooms/${id}`
            : `${API}/rooms`;

        const method = id ? "PUT" : "POST";

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(room)
            });

            const result = await response.json();

            if (!response.ok) {
                alert(result.message || "Operation failed");
                return;
            }

            alert(result.message);

            resetRoomForm();
            loadRooms();
        } catch (error) {
            alert("Server error");
        }
    }
);

// Edit room
function editRoom(id, number, type, price, capacity, status) {
    document.getElementById("roomId").value = id;
    document.getElementById("roomNumber").value = number;
    document.getElementById("roomType").value = type;
    document.getElementById("roomPrice").value = price;
    document.getElementById("roomCapacity").value = capacity;
    document.getElementById("roomStatus").value = status;

    document.getElementById("roomSubmit").textContent = "Update Room";

    document.getElementById("admin").scrollIntoView({
        behavior: "smooth"
    });
}

// Delete room
async function deleteRoom(id) {
    if (!confirm("Do you want to delete this room?")) {
        return;
    }

    const response = await fetch(`${API}/rooms/${id}`, {
        method: "DELETE"
    });

    const result = await response.json();

    alert(result.message);

    loadRooms();
}

// Clear room form
function resetRoomForm() {
    document.getElementById("roomForm").reset();
    document.getElementById("roomId").value = "";
    document.getElementById("roomSubmit").textContent = "Add Room";
}
