// --- UNIFIED CART ---
window.cart = {}; // Global cart object

document.addEventListener("DOMContentLoaded", () => {
    const cartList = document.getElementById("cart-items");
    const totalEl = document.getElementById("total");
    const countEl = document.getElementById("cart-count");
    const cartItemsDiv = document.getElementById("cartItems");

    const chatBtn = document.getElementById("chatButton");
    const chatBox = document.getElementById("chatBox");
    const chatInput = document.getElementById("chatInput");
    const chatSend = document.getElementById("chatSend");
    const chatMessages = document.getElementById("chatMessages");
    const voiceBtn = document.getElementById("voiceBtn");

    // --- LOAD PRODUCTS FROM SHEETY ---
    async function loadProducts() {
        const grid = document.getElementById("product-grid");
        grid.innerHTML = "Loading...";

        try {
            // ✅ correct URL
            const res = await fetch(
                "https://api.sheety.co/e5f42c6a1510007d10970f8672a067dd/داتا تجربة/medicinesPrices"
            );

            const data = await res.json();

            // ❗ Your sheet returns:  { "medicinesPrices": [ ... ] }
            const products = data.medicinesPrices;

            grid.innerHTML = "";

            products.forEach(p => {
                const name = p.medicine || "Unknown";
                const price = Number(p["price ($)"]) || 0;

                const div = document.createElement("div");
                div.className = "product-card";

                div.innerHTML = `
                    <h3>${name}</h3>
                    <p>Price: $${price}</p>
                    <button onclick="addToCart('${name}', ${price})">
                        Add to Cart
                    </button>
                `;

                grid.appendChild(div);
            });

        } catch (err) {
            grid.innerHTML = "Failed to load products.";
            console.error("PRODUCT LOAD ERROR:", err);
        }
    }

    loadProducts();

    // --- CART UPDATE FUNCTION ---
    function updateCartUI() {
        const keys = Object.keys(window.cart);

        // Main cart page
        if (cartList) {
            cartList.innerHTML = "";
            if (keys.length === 0) {
                const li = document.createElement("li");
                li.textContent = "لا يوجد منتجات بعد";
                cartList.appendChild(li);
                totalEl.textContent = "0";
            } else {
                keys.forEach(key => {
                    const item = window.cart[key];
                    const li = document.createElement("li");
                    li.textContent = `${key} × ${item.quantity} = $${(item.price * item.quantity).toFixed(2)}`;

                    const btnDecrease = document.createElement("button");
                    btnDecrease.textContent = "−";
                    btnDecrease.addEventListener("click", () => decreaseQuantity(key));

                    const btnIncrease = document.createElement("button");
                    btnIncrease.textContent = "+";
                    btnIncrease.addEventListener("click", () => increaseQuantity(key));

                    li.appendChild(btnDecrease);
                    li.appendChild(btnIncrease);
                    cartList.appendChild(li);
                });
                const totalAmount = keys.reduce(
                    (sum, k) => sum + window.cart[k].price * window.cart[k].quantity, 0
                );
                totalEl.textContent = totalAmount.toFixed(2);
            }
        }

        // Chat cart
        if (cartItemsDiv) {
            cartItemsDiv.innerHTML = "";
            if (keys.length === 0) {
                cartItemsDiv.textContent = "لا يوجد منتجات بعد";
            } else {
                keys.forEach(key => {
                    const div = document.createElement("div");
                    div.textContent = `${key} × ${window.cart[key].quantity}`;
                    cartItemsDiv.appendChild(div);
                });
            }
        }

        // Header cart count
        if (countEl) {
            const totalCount = keys.reduce((sum, k) => sum + window.cart[k].quantity, 0);
            countEl.textContent = totalCount;
        }
    }

    // --- MANUAL CART FUNCTIONS ---
    window.addToCart = function(name, price, quantity = 1) {
        if (window.cart[name]) {
            window.cart[name].quantity += quantity;
        } else {
            window.cart[name] = { price, quantity };
        }
        updateCartUI();
    };

    function increaseQuantity(name) {
        if (window.cart[name]) {
            window.cart[name].quantity += 1;
            updateCartUI();
        }
    }

    function decreaseQuantity(name) {
        if (window.cart[name]) {
            window.cart[name].quantity -= 1;
            if (window.cart[name].quantity <= 0) {
                delete window.cart[name];
            }
            updateCartUI();
        }
    }

    // --- CHAT BUTTON ---
    chatBtn.onclick = () => {
        chatBox.style.display = (chatBox.style.display === "block") ? "none" : "block";
    };

    chatSend.onclick = sendMessage;
    chatInput.addEventListener("keydown", e => {
        if (e.key === "Enter") sendMessage();
    });

    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        appendMsg("You", text);
        chatInput.value = "";

        try {
            const res = await fetch("http://127.0.0.1:5000/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text })
            });

            const data = await res.json();

            if (data.reply) {
                appendMsg("AI", data.reply);
            } else {
                appendMsg("AI", "⚠️ Error: No reply from server");
            }
        } catch (err) {
            appendMsg("AI", "⚠️ Cannot connect to Python server");
        }
    }

    function appendMsg(sender, text) {
        const p = document.createElement("p");
        p.innerHTML = `<strong>${sender}:</strong> ${text}`;
        chatMessages.appendChild(p);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // --- VOICE INPUT ---
    let recognition;
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = "ar-EG";
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            voiceBtn.textContent = "🎙️ Listening...";
        };

        recognition.onresult = (event) => {
            const voiceText = event.results[0][0].transcript;
            chatInput.value = voiceText;
            sendMessage();
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            voiceBtn.textContent = "🎤";
            alert("حدث خطأ أثناء التسجيل الصوتي: " + event.error);
        };

        recognition.onend = () => {
            voiceBtn.textContent = "🎤";
        };

        voiceBtn.onclick = () => {
            try {
                recognition.start();
            } catch (err) {
                console.error("Recognition start error:", err);
            }
        };
    } else {
        voiceBtn.onclick = () => {
            alert("متصفحك لا يدعم التسجيل الصوتي. استخدم Chrome أو Edge.");
        };
    }

    updateCartUI();
});
