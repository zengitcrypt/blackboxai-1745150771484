// Use global variables exposed by scripts loaded in index.html
const { Web3Modal } = window.Web3Modal;
const { EthereumClient } = window.Web3ModalEthereum;
const { ethers } = window.ethers;

// Configuration for Binance Smart Chain
const chains = [
  {
    id: 56,
    name: "Binance Smart Chain",
    network: "bsc",
    nativeCurrency: { name: "Binance Coin", symbol: "BNB", decimals: 18 },
    rpcUrls: ["https://bsc-dataseed.binance.org/"],
    blockExplorers: { default: { name: "BscScan", url: "https://bscscan.com" } },
    testnet: false,
  },
];

// Initialize Web3Modal and EthereumClient
const web3Modal = new Web3Modal({
  projectId: "YOUR_PROJECT_ID", // Replace with your Web3Modal project ID
  themeMode: "dark",
  themeColor: "#FFCC00",
  themeBackground: "gradient",
  themeAccent: "#FFCC00",
  themeRadius: "large",
  themeFontFamily: "Fredoka One, Poppins, sans-serif",
  ethereum: {
    appName: "LOTINU Staking DApp",
    chains: chains,
  },
});

const ethereumClient = new EthereumClient(web3Modal, chains);

let provider;
let signer;
let userAddress;
let stakingContract;
let tokenContract;

const STAKING_CONTRACT_ADDRESS = "0xYourStakingContractAddress"; // Replace with actual
const TOKEN_CONTRACT_ADDRESS = "0xYourTokenContractAddress"; // Replace with actual

const STAKING_CONTRACT_ABI = [
  // Replace with actual ABI
];

const TOKEN_CONTRACT_ABI = [
  // Replace with actual ABI
];

// DOM Elements
const connectWalletBtn = document.getElementById("connectWalletBtn");
const walletInfoSection = document.getElementById("walletInfo");
const stakingControlsSection = document.getElementById("stakingControls");
const walletAddressSpan = document.getElementById("walletAddress");
const tokenBalanceSpan = document.getElementById("tokenBalance");
const totalStakedSpan = document.getElementById("totalStaked");
const apySpan = document.getElementById("apy");
const pendingRewardsSpan = document.getElementById("pendingRewards");
const lockTimeSpan = document.getElementById("lockTime");
const rewardsRemainingSpan = document.getElementById("rewardsRemaining");
const alertsDiv = document.getElementById("alerts");

const stakeAmountInput = document.getElementById("stakeAmount");
const approveBtn = document.getElementById("approveBtn");
const stakeBtn = document.getElementById("stakeBtn");
const harvestBtn = document.getElementById("harvestBtn");
const withdrawBtn = document.getElementById("withdrawBtn");
const emergencyWithdrawBtn = document.getElementById("emergencyWithdrawBtn");

// Utility function to show alerts
function showAlert(message, type = "info") {
  const alert = document.createElement("div");
  alert.className = `p-4 mb-4 rounded-lg ${
    type === "error"
      ? "bg-red-100 text-red-700"
      : type === "success"
      ? "bg-green-100 text-green-700"
      : "bg-blue-100 text-blue-700"
  }`;
  alert.textContent = message;
  alertsDiv.appendChild(alert);
  setTimeout(() => {
    alertsDiv.removeChild(alert);
  }, 5000);
}

// Initialize app
async function init() {
  connectWalletBtn.addEventListener("click", connectWallet);
  approveBtn.addEventListener("click", approveTokens);
  stakeBtn.addEventListener("click", stakeTokens);
  harvestBtn.addEventListener("click", harvestRewards);
  withdrawBtn.addEventListener("click", withdrawTokens);
  emergencyWithdrawBtn.addEventListener("click", emergencyWithdraw);
}

// Connect wallet using Web3Modal
async function connectWallet() {
  try {
    const instance = await web3Modal.connect();
    provider = new ethers.providers.Web3Provider(instance);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();

    // Initialize contracts
    stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, signer);
    tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, signer);

    updateUIOnConnect();

    // Listen for accounts and chain changes
    instance.on("accountsChanged", (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        userAddress = accounts[0];
        updateUIOnConnect();
        fetchUserData();
      }
    });

    instance.on("chainChanged", (chainId) => {
      fetchUserData();
    });

    fetchUserData();
    showAlert("Wallet connected successfully!", "success");
  } catch (error) {
    showAlert("Failed to connect wallet: " + error.message, "error");
  }
}

function disconnectWallet() {
  provider = null;
  signer = null;
  userAddress = null;
  stakingContract = null;
  tokenContract = null;
  walletInfoSection.classList.add("hidden");
  stakingControlsSection.classList.add("hidden");
  connectWalletBtn.style.display = "inline-block";
  walletAddressSpan.textContent = "";
  showAlert("Wallet disconnected", "info");
}

function updateUIOnConnect() {
  connectWalletBtn.style.display = "none";
  walletInfoSection.classList.remove("hidden");
  stakingControlsSection.classList.remove("hidden");
  walletAddressSpan.textContent = userAddress;
}

// Fetch user staking data from contract
async function fetchUserData() {
  try {
    const balance = await tokenContract.balanceOf(userAddress);
    const totalStaked = await stakingContract.totalStaked(userAddress);
    const apy = await stakingContract.apy();
    const pendingRewards = await stakingContract.pendingRewards(userAddress);
    const lockTime = await stakingContract.lockTime(userAddress);
    const rewardsRemaining = await stakingContract.rewardsRemaining();

    tokenBalanceSpan.textContent = ethers.utils.formatUnits(balance, 18);
    totalStakedSpan.textContent = ethers.utils.formatUnits(totalStaked, 18);
    apySpan.textContent = apy.toString() + "%";
    pendingRewardsSpan.textContent = ethers.utils.formatUnits(pendingRewards, 18);
    lockTimeSpan.textContent = new Date(lockTime.toNumber() * 1000).toLocaleString();
    rewardsRemainingSpan.textContent = ethers.utils.formatUnits(rewardsRemaining, 18);
  } catch (error) {
    showAlert("Error fetching user data: " + error.message, "error");
  }
}

// Approve tokens for staking
async function approveTokens() {
  try {
    const amount = stakeAmountInput.value;
    if (!amount || amount <= 0) {
      showAlert("Enter a valid amount to approve.", "error");
      return;
    }
    const amountWei = ethers.utils.parseUnits(amount, 18);
    const tx = await tokenContract.approve(STAKING_CONTRACT_ADDRESS, amountWei);
    showAlert("Approval transaction sent. Waiting for confirmation...");
    await tx.wait();
    showAlert("Tokens approved successfully!", "success");
  } catch (error) {
    showAlert("Approval failed: " + error.message, "error");
  }
}

// Stake tokens
async function stakeTokens() {
  try {
    const amount = stakeAmountInput.value;
    if (!amount || amount <= 0) {
      showAlert("Enter a valid amount to stake.", "error");
      return;
    }
    const amountWei = ethers.utils.parseUnits(amount, 18);
    const tx = await stakingContract.deposit(amountWei);
    showAlert("Staking transaction sent. Waiting for confirmation...");
    await tx.wait();
    showAlert("Tokens staked successfully!", "success");
    fetchUserData();
  } catch (error) {
    showAlert("Staking failed: " + error.message, "error");
  }
}

// Harvest rewards (deposit 0)
async function harvestRewards() {
  try {
    const tx = await stakingContract.deposit(0);
    showAlert("Harvest transaction sent. Waiting for confirmation...");
    await tx.wait();
    showAlert("Rewards harvested successfully!", "success");
    fetchUserData();
  } catch (error) {
    showAlert("Harvest failed: " + error.message, "error");
  }
}

// Withdraw tokens
async function withdrawTokens() {
  try {
    const amount = stakeAmountInput.value;
    if (!amount || amount <= 0) {
      showAlert("Enter a valid amount to withdraw.", "error");
      return;
    }
    const amountWei = ethers.utils.parseUnits(amount, 18);
    const tx = await stakingContract.withdraw(amountWei);
    showAlert("Withdraw transaction sent. Waiting for confirmation...");
    await tx.wait();
    showAlert("Tokens withdrawn successfully!", "success");
    fetchUserData();
  } catch (error) {
    showAlert("Withdraw failed: " + error.message, "error");
  }
}

// Emergency withdraw
async function emergencyWithdraw() {
  try {
    const tx = await stakingContract.emergencyWithdraw();
    showAlert("Emergency withdraw transaction sent. Waiting for confirmation...");
    await tx.wait();
    showAlert("Emergency withdraw successful!", "success");
    fetchUserData();
  } catch (error) {
    showAlert("Emergency withdraw failed: " + error.message, "error");
  }
}

init();
</create_file>
