// --- CART LOGIC ---
window.cart = []; // global cart

function addToCart(name, price, quantity = 1) {
    const existing = window.cart.find(item => item.name === name);
    if (existing) {
        existing.quantity += quantity;
    } else {
        window.cart.push({ name, price, quantity });
    }
    updateCartUI();
}

function increaseQuantity(name) {
    const item = window.cart.find(i => i.name === name);
    if (item) {
        item.quantity += 1;
        updateCartUI();
    }
}

function decreaseQuantity(name) {
    const item = window.cart.find(i => i.name === name);
    if (item) {
        item.quantity -= 1;
        if (item.quantity <= 0) {
            window.cart = window.cart.filter(i => i.name !== name);
        }
        updateCartUI();
    }
}

// --- UPDATE CART UI ---
function updateCartUI() {
    const cartList = document.getElementById("cart-items");
    const totalEl = document.getElementById("total");
    const countEl = document.getElementById("cart-count");

    if (!cartList || !totalEl || !countEl) return;

    cartList.innerHTML = "";

    if (window.cart.length === 0) {
        const li = document.createElement("li");
        li.textContent = "لا يوجد منتجات بعد";
        cartList.appendChild(li);
        totalEl.textContent = "0";
        countEl.textContent = "0";
        return;
    }

    window.cart.forEach(item => {
        const li = document.createElement("li");
        li.textContent = `${item.name} × ${item.quantity} = $${(item.price * item.quantity).toFixed(2)}`;

        const btnDecrease = document.createElement("button");
        btnDecrease.textContent = "−";
        btnDecrease.addEventListener("click", () => decreaseQuantity(item.name));

        const btnIncrease = document.createElement("button");
        btnIncrease.textContent = "+";
        btnIncrease.addEventListener("click", () => increaseQuantity(item.name));

        li.appendChild(btnDecrease);
        li.appendChild(btnIncrease);
        cartList.appendChild(li);
    });

    const totalAmount = window.cart.reduce((t, item) => t + item.price * item.quantity, 0);
    totalEl.textContent = totalAmount.toFixed(2);
    countEl.textContent = window.cart.reduce((c, item) => c + item.quantity, 0);
}

// --- LOAD PRODUCTS FROM SHEETY ---
async function loadProducts() {
    try {
        const response = await fetch(
            "https://api.sheety.co/e5f42c6a1510007d10970f8672a067dd/داتا تجربة/medicinesPrices"
        );
        const data = await response.json();

        const products = data.medicinesPrices; // exact array name

        const container = document.querySelector(".product-grid");
        container.innerHTML = "";

        products.forEach(product => {
            const name = product.medicine;
            const price = parseFloat(product.price);

            const div = document.createElement("div");
            div.classList.add("product-card");

            const h3 = document.createElement("h3");
            h3.textContent = name;

            const p = document.createElement("p");
            p.textContent = `Price: $${price.toFixed(2)}`;

            const btnAdd = document.createElement("button");
            btnAdd.textContent = "Add to Cart";
            btnAdd.addEventListener("click", () => addToCart(name, price, 1));

            div.appendChild(h3);
            div.appendChild(p);
            div.appendChild(btnAdd);

            container.appendChild(div);
        });
    } catch (error) {
        console.error("Error loading products:", error);
    }
}

// --- CHECKOUT ---
document.getElementById("checkout").addEventListener("click", async () => {
    if (window.cart.length === 0) {
        alert("Cart is empty!");
        return;
    }

    const usernameInput = document.getElementById("username").value.trim();
    if (!usernameInput) {
        alert("Please enter your name before checkout.");
        return;
    }

    const totalAmount = window.cart.reduce((t, item) => t + item.price * item.quantity, 0);

    const data = {
        purchase: {
            username: usernameInput,
            price: totalAmount,
            items: window.cart.map(i => `${i.name} × ${i.quantity}`).join(", "),
            timestamp: new Date().toLocaleString()
        }
    };

    try {
        const response = await fetch(
            "https://api.sheety.co/e5f42c6a1510007d10970f8672a067dd/داتا تجربة/purchase",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            }
        );

        if (response.ok) {
            alert("Invoice saved successfully!");
            window.cart = [];
            document.getElementById("username").value = "";
            updateCartUI();
        } else {
            alert("Error saving invoice.");
            console.log(await response.text());
        }
    } catch (error) {
        console.error(error);
        alert("Network error.");
    }
});

// --- NAVIGATION BETWEEN SECTIONS ---
function showSection(sectionId) {
    document.querySelectorAll("section").forEach(sec => sec.classList.remove("active"));
    const section = document.getElementById(sectionId);
    if (section) section.classList.add("active");
}

// --- INITIALIZE PAGE ---
window.addEventListener("DOMContentLoaded", loadProducts);
