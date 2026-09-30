const ABI = [
  "function createGoal(string title,uint64 deadline)",
  "function completeGoal(uint256 goalId)",
  "function cancelGoal(uint256 goalId)",
  "function getGoals() view returns (tuple(address owner,string title,uint64 deadline,uint64 createdAt,uint8 status)[])",
  "event GoalCreated(uint256 indexed goalId,address indexed owner,string title,uint64 deadline)",
  "event GoalStatusChanged(uint256 indexed goalId,address indexed owner,uint8 status)"
];

const previewGoals = [
  { owner: "0x7a9d…41c2", title: "Finish the Week 4 Solidity practice", deadline: Date.now() / 1000 + 86400, createdAt: Date.now() / 1000 - 7200, status: 0 },
  { owner: "0x31e8…9b07", title: "Review smart contract events", deadline: Date.now() / 1000 + 172800, createdAt: Date.now() / 1000 - 19000, status: 1 }
];

let provider;
let signer;
let contract;
let account = "";
let goals = [];
const config = window.STUDYPULSE_CONFIG || {};
const hasContract = /^0x[a-fA-F0-9]{40}$/.test(config.contractAddress || "");

const $ = (id) => document.getElementById(id);
const shortAddress = (value) => value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "";
const statusNames = ["Active", "Completed", "Cancelled"];

function notify(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function normaliseGoal(goal, index) {
  return {
    id: index,
    owner: goal.owner,
    title: goal.title,
    deadline: Number(goal.deadline),
    createdAt: Number(goal.createdAt),
    status: Number(goal.status)
  };
}

function renderGoals() {
  $("totalCount").textContent = goals.length;
  $("completeCount").textContent = goals.filter((goal) => goal.status === 1).length;
  $("activeCount").textContent = goals.filter((goal) => goal.status === 0).length;

  const list = $("goalList");
  if (!goals.length) {
    list.innerHTML = '<div class="empty">No goals yet.<br>Create the first on-chain commitment.</div>';
    return;
  }

  list.innerHTML = goals.slice().reverse().map((goal) => {
    const ownGoal = account && goal.owner.toLowerCase() === account.toLowerCase();
    const actions = ownGoal && goal.status === 0 ? `
      <div class="goal-actions">
        <button type="button" data-action="complete" data-id="${goal.id}">Mark complete</button>
        <button type="button" data-action="cancel" data-id="${goal.id}">Cancel</button>
      </div>` : "";
    return `<article class="goal">
      <div>
        <h3>${escapeHtml(goal.title)}</h3>
        <div class="goal-meta"><span>${shortAddress(goal.owner)}</span><span>Due ${formatDate(goal.deadline)}</span></div>
      </div>
      <span class="status ${statusNames[goal.status].toLowerCase()}">${statusNames[goal.status]}</span>
      ${actions}
    </article>`;
  }).join("");
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

function formatDate(seconds) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(seconds * 1000));
}

async function ensureSepolia() {
  const chainId = await window.ethereum.request({ method: "eth_chainId" });
  if (chainId === "0xaa36a7") return;
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xaa36a7" }] });
  } catch (error) {
    if (error.code !== 4902) throw error;
    await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{
      chainId: "0xaa36a7",
      chainName: "Sepolia",
      nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
      rpcUrls: [config.rpcUrl],
      blockExplorerUrls: ["https://sepolia.etherscan.io"]
    }] });
  }
}

async function connectWallet() {
  if (!window.ethereum) {
    notify("Open this page in the MetaMask mobile browser or install MetaMask.");
    return;
  }
  try {
    await ensureSepolia();
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    account = await signer.getAddress();
    $("connectButton").textContent = shortAddress(account);
    $("connectButton").classList.add("connected");
    $("networkPill").textContent = hasContract ? "Sepolia live" : "Wallet connected";
    if (hasContract) contract = new ethers.Contract(config.contractAddress, ABI, signer);
    await loadGoals();
  } catch (error) {
    notify(readError(error));
  }
}

async function loadGoals() {
  if (!hasContract) {
    goals = previewGoals.map(normaliseGoal);
    renderGoals();
    return;
  }
  try {
    const readProvider = provider || new ethers.providers.JsonRpcProvider(config.rpcUrl);
    const readContract = new ethers.Contract(config.contractAddress, ABI, readProvider);
    const result = await readContract.getGoals();
    goals = result.map(normaliseGoal);
    renderGoals();
  } catch (error) {
    notify("Could not load Sepolia goals. Try again shortly.");
  }
}

async function submitGoal(event) {
  event.preventDefault();
  const title = $("goalTitle").value.trim();
  const deadline = Math.floor(new Date($("goalDeadline").value).getTime() / 1000);
  if (!title || !deadline || deadline <= Date.now() / 1000) {
    notify("Choose a future deadline.");
    return;
  }
  if (!account) {
    await connectWallet();
    if (!account) return;
  }
  if (!hasContract) {
    goals.push({ id: goals.length, owner: account, title, deadline, createdAt: Date.now() / 1000, status: 0 });
    renderGoals();
    event.target.reset();
    notify("Preview goal created. Add the contract address for on-chain mode.");
    return;
  }
  await runTransaction(() => contract.createGoal(title, deadline), "Goal published on Sepolia");
  event.target.reset();
}

async function updateGoal(action, id) {
  if (!contract) return notify("Connect your wallet first.");
  const method = action === "complete" ? "completeGoal" : "cancelGoal";
  await runTransaction(() => contract[method](id), action === "complete" ? "Goal completed" : "Goal cancelled");
}

async function runTransaction(createTransaction, successMessage) {
  const button = $("createButton");
  button.disabled = true;
  try {
    notify("Confirm the transaction in MetaMask…");
    const transaction = await createTransaction();
    await transaction.wait();
    notify(successMessage);
    await loadGoals();
  } catch (error) {
    notify(readError(error));
  } finally {
    button.disabled = false;
  }
}

function readError(error) {
  if (error?.code === 4001) return "Transaction cancelled.";
  const message = error?.data?.message || error?.message || "Something went wrong.";
  return message.replace("execution reverted: ", "").slice(0, 150);
}

document.addEventListener("DOMContentLoaded", () => {
  const nextHour = new Date(Date.now() + 3600000);
  nextHour.setMinutes(0, 0, 0);
  const localDate = new Date(nextHour.getTime() - nextHour.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  $("goalDeadline").min = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  $("goalDeadline").value = localDate;
  $("connectButton").addEventListener("click", connectWallet);
  $("goalForm").addEventListener("submit", submitGoal);
  $("refreshButton").addEventListener("click", loadGoals);
  $("goalList").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (button) updateGoal(button.dataset.action, Number(button.dataset.id));
  });
  if (hasContract) {
    $("networkPill").textContent = "Sepolia read-only";
    $("formNote").textContent = "MetaMask will ask you to confirm each blockchain transaction.";
  }
  loadGoals();
  window.ethereum?.on?.("accountsChanged", () => window.location.reload());
  window.ethereum?.on?.("chainChanged", () => window.location.reload());
});
