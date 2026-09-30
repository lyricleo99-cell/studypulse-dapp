import json
import os

from flask import Flask, Response, render_template


app = Flask(__name__)


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/config.js")
def config():
    payload = {
        "contractAddress": os.getenv("CONTRACT_ADDRESS", ""),
        "chainId": 11155111,
        "chainName": "Sepolia",
        "rpcUrl": os.getenv("SEPOLIA_RPC_URL", "https://ethereum-sepolia-rpc.publicnode.com"),
    }
    return Response(
        "window.STUDYPULSE_CONFIG = " + json.dumps(payload) + ";",
        mimetype="application/javascript",
    )


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")))
