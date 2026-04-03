"""Run Flask dev server: python run.py

Default port is 5001 because macOS often uses 5000 for AirPlay Receiver
(System Settings → General → AirDrop & Handoff → AirPlay Receiver).
Override with: PORT=5000 python run.py
"""
import os

from app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5001"))
    app.run(host="127.0.0.1", port=port, debug=True)
