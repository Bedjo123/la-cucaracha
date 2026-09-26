import { ethers } from "ethers";
import { ABI, BYTECODE } from "./contractData.js";

export async function deployProject({
  projectName,
  projectDescription,
  contractMetadataURI,
  onStatus
}) {
  const status = (msg) => {
    console.log("[DEPLOY]", msg);
    if (onStatus) onStatus(msg);
  };

  status("Mencari wallet...");

  if (!window.ethereum) {
    throw new Error(
      "Wallet EVM tidak ditemukan. Buka melalui OKX Wallet/MetaMask."
    );
  }

  if (!projectName?.trim()) {
    throw new Error("Nama project wajib diisi");
  }

  status("Meminta akses akun wallet...");

  await window.ethereum.request({
    method: "eth_requestAccounts"
  });

  status("Membuat koneksi wallet...");

  const provider = new ethers.BrowserProvider(window.ethereum);

  status("Mengecek jaringan...");

  const network = await provider.getNetwork();

  console.log("[DEPLOY] Chain ID:", network.chainId.toString());

  status(`Wallet terhubung — Chain ID ${network.chainId}`);

  status("Mengambil signer...");

  const signer = await provider.getSigner();

  const creator = await signer.getAddress();

  console.log("[DEPLOY] Creator:", creator);

  status("Menyiapkan contract...");

  if (!BYTECODE || BYTECODE === "0x") {
    throw new Error("Bytecode contract kosong.");
  }

  const factory = new ethers.ContractFactory(
    ABI,
    BYTECODE,
    signer
  );

  status("Meminta konfirmasi deployment di wallet...");

  const contract = await factory.deploy(
    projectName.trim(),
    projectDescription || "",
    contractMetadataURI || "",
    creator
  );

  console.log("[DEPLOY] TX:", contract.deploymentTransaction()?.hash);

  status("Transaksi dikirim — menunggu konfirmasi...");

  await contract.waitForDeployment();

  status("Deployment terkonfirmasi...");

  const address = await contract.getAddress();

  console.log("[DEPLOY] Contract:", address);

  localStorage.setItem("nft1155_contract", address);

  status("Deployment selesai!");

  return address;
}
