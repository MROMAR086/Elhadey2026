from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import difflib
import os

app = Flask(__name__)
CORS(app)

SHEETY_URL = "https://api.sheety.co/e5f42c6a1510007d10970f8672a067dd/داتا تجربة/medicinesPrices"


def normalize(text):
    """Normalize Arabic text for better matching."""
    replacements = {
        "أ": "ا",
        "إ": "ا",
        "آ": "ا",
        "ة": "ه",
        "ى": "ي",
        "ؤ": "و",
        "ئ": "ي",
    }
    for a, b in replacements.items():
        text = text.replace(a, b)
    return text.lower().strip()


def fuzzy_match(name, choices, n=3, cutoff=0.5):
    """Arabic + English fuzzy matching."""
    name = normalize(name)
    normalized_choices = [normalize(c) for c in choices]

    matches = difflib.get_close_matches(name, normalized_choices, n=n, cutoff=cutoff)

    # Convert normalized matches → original names
    real_matches = []
    for m in matches:
        for original in choices:
            if normalize(original) == m:
                real_matches.append(original)
                break
    return real_matches


@app.route("/ask", methods=["POST"])
def ask_ai():
    data = request.json
    user_message = data.get("message", "").strip()

    if not user_message:
        return jsonify({"error": "No message"}), 400

    # Greetings
    if user_message.lower() in ["اهلا", "مرحبا", "السلام عليكم", "hi", "hello"]:
        return jsonify({"reply": "أهلاً! كيف يمكنني مساعدتك؟"})

    try:
        # Fetch Sheety data
        sheet = requests.get(SHEETY_URL).json()
        rows = sheet.get("medicinesPrices", [])

        # Correct column name → medicine
        product_names = [r.get("medicine", "") for r in rows]

        # Match product
        match = fuzzy_match(user_message, product_names, n=1, cutoff=0.4)

        if match:
            name = match[0]
            row = next(r for r in rows if r.get("medicine", "") == name)

            # ✅ FIXED: use "price" key instead of "price ($)"
            price = row.get("price", 0)
            stock = int(row.get("stock", 0))

            if stock > 0:
                return jsonify({
                    "reply": f"✔ المنتج متوفر\n\n📌 الاسم: {name}\n💰 السعر: {price}$\n📦 المتوفر: {stock}"
                })
            else:
                return jsonify({
                    "reply": f"❌ المنتج **{name}** غير متوفر حالياً."
                })

        # Suggest alternatives
        alternatives = fuzzy_match(user_message, product_names, n=3, cutoff=0.2)
        if alternatives:
            alt = "\n".join(
                [
                    f"- {a} ({next(r['price'] for r in rows if r['medicine'] == a)}$)"
                    for a in alternatives
                ]
            )

            return jsonify({
                "reply": f"❌ المنتج غير موجود.\n\n🔄 بدائل قريبة:\n{alt}"
            })

        return jsonify({
            "reply": "❌ المنتج غير موجود في قاعدة البيانات."
        })

    except Exception as e:
        print("ERROR:", e)
        return jsonify({"error": str(e)})


@app.route("/")
def index():
    return send_from_directory(os.getcwd(), "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(os.getcwd(), filename)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
