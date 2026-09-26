import { ethers } from "ethers";
import { ABI } from "./contractData.js";

function getAddress() {
  const address = localStorage.getItem(
    "nft1155_contract"
  );

  if (!address) {
    throw new Error(
      "Contract belum dibuat. Deploy project terlebih dahulu."
    );
  }

  return address;
}

async function getContract() {
  if (!window.ethereum) {
    throw new Error(
      "Wallet EVM tidak ditemukan."
    );
  }

  const provider =
    new ethers.BrowserProvider(
      window.ethereum
    );

  const signer =
    await provider.getSigner();

  return new ethers.Contract(
    getAddress(),
    ABI,
    signer
  );
}

export async function publicMint(
  tokenId,
  amount,
  price
) {
  const contract =
    await getContract();

  const total =
    ethers.parseEther(
      String(price)
    ) * BigInt(amount);

  const tx =
    await contract.publicMint(
      tokenId,
      amount,
      { value: total }
    );

  await tx.wait();

  return tx.hash;
}

export async function creatorMintTo(
  recipient,
  tokenId,
  amount
) {
  const contract =
    await getContract();

  const tx =
    await contract.creatorMintTo(
      recipient,
      tokenId,
      amount
    );

  await tx.wait();

  return tx.hash;
}

export async function creatorMintBatch(
  recipients,
  tokenIds,
  amounts
) {
  const contract =
    await getContract();

  const tx =
    await contract.creatorMintBatch(
      recipients,
      tokenIds,
      amounts
    );

  await tx.wait();

  return tx.hash;
}
