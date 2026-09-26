import { ethers } from "ethers";
import { ABI } from "./contractData.js";

function getContractAddress() {
  const address = localStorage.getItem("nft1155_contract");

  if (!address) {
    throw new Error(
      "Contract belum dibuat. Deploy project terlebih dahulu."
    );
  }

  return address;
}

async function getContract() {
  if (!window.ethereum) {
    throw new Error("Wallet EVM tidak ditemukan.");
  }

  const provider =
    new ethers.BrowserProvider(window.ethereum);

  const signer =
    await provider.getSigner();

  return new ethers.Contract(
    getContractAddress(),
    ABI,
    signer
  );
}

export async function createItem({
  tokenId,
  supply,
  price,
  metadataURI
}) {
  const contract = await getContract();

  const tx = await contract.createItem(
    tokenId,
    supply,
    ethers.parseEther(String(price)),
    metadataURI
  );

  await tx.wait();

  return tx.hash;
}
