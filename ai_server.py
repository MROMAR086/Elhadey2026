from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import difflib
import os

app = Flask(__name__, static_folder="frontend")
CORS(app)

SHEETY_URL = "https://api.sheety.co/e5f42c6a1510007d10970f8672a067dd/داتا تجربة/medicinesPrices"

# ---------- TEXT NORMALIZATION ----------
def normalize(text):
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
    name = normalize(name)
    normalized_choices = [normalize(c) for c in choices]
    matches = difflib.get_close_matches(name, normalized_choices, n=n, cutoff=cutoff)
    real_matches = []
    for m in matches:
        for original in choices:
            if normalize(original) == m:
                real_matches.append(original)
                break
    return real_matches

# ---------- AI ENDPOINT ----------
@app.route("/ask", methods=["POST"])
def ask_ai():
    data = request.json
    user_message = data.get("message", "").strip()
    if not user_message:
        return jsonify({"error": "No message"}), 400

    if user_message.lower() in ["اهلا", "مرحبا", "السلام عليكم", "hi", "hello"]:
        return jsonify({"reply": "أهلاً! كيف يمكنني مساعدتك؟"})

    try:
        sheet = requests.get(SHEETY_URL).json()
        rows = sheet.get("medicinesPrices", [])
        product_names = [r.get("medicine", "") for r in rows]

        match = fuzzy_match(user_message, product_names, n=1, cutoff=0.4)
        if match:
            name = match[0]
            row = next(r for r in rows if r.get("medicine", "") == name)
            price = row.get("price", 0)
            stock = int(row.get("stock", 0))
            if stock > 0:
                return jsonify({
                    "reply": f"✔ المنتج متوفر\n\n📌 الاسم: {name}\n💰 السعر: {price}$\n📦 المتوفر: {stock}"
                })
            else:
                return jsonify({"reply": f"❌ المنتج **{name}** غير متوفر حالياً."})

        alternatives = fuzzy_match(user_message, product_names, n=3, cutoff=0.2)
        if alternatives:
            alt = "\n".join(
                [f"- {a} ({next(r['price'] for r in rows if r['medicine'] == a)}$)" for a in alternatives]
            )
            return jsonify({"reply": f"❌ المنتج غير موجود.\n\n🔄 بدائل قريبة:\n{alt}"})

        return jsonify({"reply": "❌ المنتج غير موجود في قاعدة البيانات."})
    except Exception as e:
        print("ERROR:", e)
        return jsonify({"error": str(e)})

# ---------- FRONTEND SERVING ----------
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    # إذا الملف موجود في مجلد frontend يرجعه
    if path != "" and os.path.exists(os.path.join("frontend", path)):
        return send_from_directory("frontend", path)
    # غير كده، رجع index.html
    else:
        return send_from_directory("frontend", "index.html")

# ---------- RUN SERVER ----------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
