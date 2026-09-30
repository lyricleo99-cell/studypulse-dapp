# StudyPulse DApp

StudyPulse is a mobile-first DApp for publishing study goals to the Ethereum Sepolia testnet and marking them complete. It was built from the Week 3–4 course concepts: Solidity state, structs, enums, modifiers, events, ethers.js, MetaMask, Flask and Render.

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
flask --app app run
```

Without a deployed contract address the interface runs in preview mode. Wallet connection and preview goal creation still work.

## Deploy the smart contract

1. Open Remix at https://remix.ethereum.org and create `StudyPulse.sol`.
2. Paste the contract from `contracts/StudyPulse.sol`.
3. Compile with Solidity 0.8.24 or a compatible 0.8.x compiler.
4. In **Deploy & Run Transactions**, select **Injected Provider - MetaMask**.
5. Switch MetaMask to Sepolia, deploy, and copy the deployed contract address.

## Deploy to Render

1. Push this folder to a GitHub repository.
2. In Render, create a new **Blueprint** and select the repository. `render.yaml` configures the service.
3. Set `CONTRACT_ADDRESS` to the deployed Sepolia address.
4. Open the generated Render URL. On a phone, use the MetaMask in-app browser for wallet transactions.

## Main functions

- Create an on-chain study goal with a future deadline.
- View all goals without connecting a wallet.
- Complete or cancel only goals owned by the connected wallet.
- Track status changes through Solidity events.

All transactions use Sepolia test ETH. No real funds are required.
