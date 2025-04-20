document.addEventListener('DOMContentLoaded', function() {
    // State variables
    let provider;
    let signer;
    let userAddress;
    let stakingContract;
    let tokenContract;

    // Contract addresses and ABIs (replace with actual values)
    const STAKING_CONTRACT_ADDRESS = "0xYourStakingContractAddress";
    const TOKEN_CONTRACT_ADDRESS = "0xYourTokenContractAddress";
    const STAKING_CONTRACT_ABI = [];  // Replace with actual ABI
    const TOKEN_CONTRACT_ABI = [];    // Replace with actual ABI

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
            type === "error" ? "bg-red-100 text-red-700" :
            type === "success" ? "bg-green-100 text-green-700" :
            "bg-blue-100 text-blue-700"
        }`;
        alert.textContent = message;
        alertsDiv.appendChild(alert);
        setTimeout(() => alertsDiv.removeChild(alert), 5000);
    }

    // Connect wallet using MetaMask
    async function connectWallet() {
        try {
            if (!window.ethereum) {
                showAlert("Please install MetaMask!", "error");
                return;
            }

            // Request account access
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            provider = new ethers.providers.Web3Provider(window.ethereum);
            
            const network = await provider.getNetwork();
            if (network.chainId !== 56) {
                showAlert("Please connect to Binance Smart Chain", "error");
                return;
            }

            signer = provider.getSigner();
            userAddress = accounts[0];

            stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, signer);
            tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, signer);

            updateUIOnConnect();

            // Listen for account changes
            window.ethereum.on('accountsChanged', function (accounts) {
                if (accounts.length === 0) {
                    disconnectWallet();
                } else {
                    userAddress = accounts[0];
                    updateUIOnConnect();
                    fetchUserData();
                }
            });

            // Listen for network changes
            window.ethereum.on('chainChanged', function(chainId) {
                window.location.reload();
            });

            fetchUserData();
            showAlert("Wallet connected successfully!", "success");
        } catch (error) {
            console.error("Connection error:", error);
            showAlert("Failed to connect wallet: " + (error.message || "Unknown error"), "error");
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
        walletAddressSpan.textContent = `${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;
    }

    async function fetchUserData() {
        try {
            const [balance, totalStaked, apy, pendingRewards, lockTime, rewardsRemaining] = await Promise.all([
                tokenContract.balanceOf(userAddress),
                stakingContract.totalStaked(userAddress),
                stakingContract.apy(),
                stakingContract.pendingRewards(userAddress),
                stakingContract.lockTime(userAddress),
                stakingContract.rewardsRemaining()
            ]);

            tokenBalanceSpan.textContent = ethers.utils.formatUnits(balance, 18);
            totalStakedSpan.textContent = ethers.utils.formatUnits(totalStaked, 18);
            apySpan.textContent = apy.toString() + "%";
            pendingRewardsSpan.textContent = ethers.utils.formatUnits(pendingRewards, 18);
            lockTimeSpan.textContent = new Date(lockTime.toNumber() * 1000).toLocaleString();
            rewardsRemainingSpan.textContent = ethers.utils.formatUnits(rewardsRemaining, 18);
        } catch (error) {
            console.error("Data fetch error:", error);
            showAlert("Error fetching user data: " + (error.message || "Unknown error"), "error");
        }
    }

    async function approveTokens() {
        try {
            const amount = stakeAmountInput.value;
            if (!amount || amount <= 0) {
                showAlert("Please enter a valid amount to approve", "error");
                return;
            }
            const amountWei = ethers.utils.parseUnits(amount, 18);
            const tx = await tokenContract.approve(STAKING_CONTRACT_ADDRESS, amountWei);
            showAlert("Approval transaction sent. Waiting for confirmation...");
            await tx.wait();
            showAlert("Tokens approved successfully!", "success");
        } catch (error) {
            console.error("Approval error:", error);
            showAlert("Approval failed: " + (error.message || "Unknown error"), "error");
        }
    }

    async function stakeTokens() {
        try {
            const amount = stakeAmountInput.value;
            if (!amount || amount <= 0) {
                showAlert("Please enter a valid amount to stake", "error");
                return;
            }
            const amountWei = ethers.utils.parseUnits(amount, 18);
            const tx = await stakingContract.deposit(amountWei);
            showAlert("Staking transaction sent. Waiting for confirmation...");
            await tx.wait();
            showAlert("Tokens staked successfully!", "success");
            fetchUserData();
        } catch (error) {
            console.error("Staking error:", error);
            showAlert("Staking failed: " + (error.message || "Unknown error"), "error");
        }
    }

    async function harvestRewards() {
        try {
            const tx = await stakingContract.deposit(0);
            showAlert("Harvest transaction sent. Waiting for confirmation...");
            await tx.wait();
            showAlert("Rewards harvested successfully!", "success");
            fetchUserData();
        } catch (error) {
            console.error("Harvest error:", error);
            showAlert("Harvest failed: " + (error.message || "Unknown error"), "error");
        }
    }

    async function withdrawTokens() {
        try {
            const amount = stakeAmountInput.value;
            if (!amount || amount <= 0) {
                showAlert("Please enter a valid amount to withdraw", "error");
                return;
            }
            const amountWei = ethers.utils.parseUnits(amount, 18);
            const tx = await stakingContract.withdraw(amountWei);
            showAlert("Withdraw transaction sent. Waiting for confirmation...");
            await tx.wait();
            showAlert("Tokens withdrawn successfully!", "success");
            fetchUserData();
        } catch (error) {
            console.error("Withdraw error:", error);
            showAlert("Withdraw failed: " + (error.message || "Unknown error"), "error");
        }
    }

    async function emergencyWithdraw() {
        try {
            const tx = await stakingContract.emergencyWithdraw();
            showAlert("Emergency withdraw transaction sent. Waiting for confirmation...");
            await tx.wait();
            showAlert("Emergency withdraw successful!", "success");
            fetchUserData();
        } catch (error) {
            console.error("Emergency withdraw error:", error);
            showAlert("Emergency withdraw failed: " + (error.message || "Unknown error"), "error");
        }
    }

    // Add event listeners
    connectWalletBtn.addEventListener("click", connectWallet);
    approveBtn.addEventListener("click", approveTokens);
    stakeBtn.addEventListener("click", stakeTokens);
    harvestBtn.addEventListener("click", harvestRewards);
    withdrawBtn.addEventListener("click", withdrawTokens);
    emergencyWithdrawBtn.addEventListener("click", emergencyWithdraw);
});
