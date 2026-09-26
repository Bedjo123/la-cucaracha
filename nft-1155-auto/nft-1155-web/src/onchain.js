import { ethers } from "ethers";
import { ABI } from "./contractData.js";

function address() {
  const a = localStorage.getItem("nft1155_contract");
  if (!a) throw new Error("Contract belum di-deploy.");
  return a;
}

async function contract() {
  if (!window.ethereum)
    throw new Error("Wallet tidak ditemukan.");

  const provider =
    new ethers.BrowserProvider(window.ethereum);

  const signer = await provider.getSigner();

  return new ethers.Contract(
    address(),
    ABI,
    signer
  );
}

export async function createItemOnChain(
  tokenId,
  supply,
  price,
  metadataURI
) {
  const c = await contract();

  const tx = await c.createItem(
    tokenId,
    supply,
    ethers.parseEther(String(price)),
    metadataURI
  );

  await tx.wait();
  return tx.hash;
}

export async function publicMintOnChain(
  tokenId,
  amount,
  price
) {
  const c = await contract();

  const value =
    ethers.parseEther(String(price)) *
    BigInt(amount);

  const tx = await c.publicMint(
    tokenId,
    amount,
    { value }
  );

  await tx.wait();
  return tx.hash;
}

export async function mintToOnChain(
  recipient,
  tokenId,
  amount
) {
  const c = await contract();

  const tx = await c.creatorMintTo(
    recipient,
    tokenId,
    amount
  );

  await tx.wait();
  return tx.hash;
}

export async function mintManyOnChain(
  recipients,
  tokenIds,
  amounts
) {
  const c = await contract();

  const tx = await c.creatorMintBatch(
    recipients,
    tokenIds,
    amounts
  );

  await tx.wait();
  return tx.hash;
}
