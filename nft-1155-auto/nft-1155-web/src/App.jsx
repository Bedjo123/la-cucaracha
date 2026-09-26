import { uploadToIPFS, uploadMetadataToIPFS } from "./ipfs.js";
import { useState } from "react";
import { deployProject } from "./deploy.js";
import {
  createItemOnChain,
  publicMintOnChain,
  mintToOnChain,
  mintManyOnChain
} from "./onchain.js";

const CHAINS = [
  {
    name: "Base",
    chainId: 8453,
    hex: "0x2105",
    rpc: "https://mainnet.base.org",
    symbol: "ETH",
    explorer: "https://basescan.org"
  },
  {
    name: "Ethereum",
    chainId: 1,
    hex: "0x1",
    rpc: "https://ethereum-rpc.publicnode.com",
    symbol: "ETH",
    explorer: "https://etherscan.io"
  },
  {
    name: "Polygon",
    chainId: 137,
    hex: "0x89",
    rpc: "https://polygon-rpc.com",
    symbol: "POL",
    explorer: "https://polygonscan.com"
  },
  {
    name: "Arbitrum One",
    chainId: 42161,
    hex: "0xa4b1",
    rpc: "https://arb1.arbitrum.io/rpc",
    symbol: "ETH",
    explorer: "https://arbiscan.io"
  },
  {
    name: "Optimism",
    chainId: 10,
    hex: "0xa",
    rpc: "https://mainnet.optimism.io",
    symbol: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  {
    name: "Robinhood Chain",
    chainId: 4663,
    hex: "0x1237",
    rpc: "https://rpc.mainnet.chain.robinhood.com",
    symbol: "ETH",
    explorer: "https://robinhoodchain.blockscout.com"
  },
  {
    name: "Ink",
    chainId: 57073,
    hex: "0xdef1",
    rpc: "https://rpc-gel.inkonchain.com",
    symbol: "ETH",
    explorer: "https://explorer.inkonchain.com"
  },
  {
    name: "Arc",
    chainId: 5042,
    hex: "0x13b2",
    rpc: "https://rpc.arc-scan.org",
    symbol: "USDC",
    explorer: "https://arc-scan.org"
  }
];

const IMAGE_EXT = [
  "png",
  "jpg",
  "jpeg",
  "webp",
  "svg",
  "gif"
];

const VIDEO_EXT = [
  "mp4",
  "webm",
  "mov",
  "m4v"
];

function getExtension(file) {
  return file?.name?.split(".").pop()?.toLowerCase() || "";
}

function isVideo(file) {
  return VIDEO_EXT.includes(getExtension(file));
}

function App() {
  const [account, setAccount] = useState("");
  const [chain, setChain] = useState(CHAINS[0]);

  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState("");

  const [items, setItems] = useState([]);
  const [message, setMessage] = useState("");
  const [uploadingItem, setUploadingItem] = useState(null);
  const [creatingItem, setCreatingItem] = useState(null);

  async function uploadItemMetadata(index) {
    try {
      const item = items[index];

      if (!item.file) {
        throw new Error("Pilih gambar/video terlebih dahulu.");
      }

      setUploadingItem(index);
      setMessage(`Upload media item ${item.tokenId} ke IPFS...`);

      const mediaURI = await uploadToIPFS(item.file);

      const isVideo =
        item.file.type?.startsWith("video/") ||
        /\.(mp4|webm|mov|m4v)$/i.test(item.file.name);

      const metadata = {
        name: item.name || `Item #${item.tokenId}`,
        tokenId: item.tokenId,
        description: item.description || "",
        ...(isVideo
          ? { animation_url: mediaURI }
          : { image: mediaURI }),
        attributes: (item.traits || []).map((t) => ({
          trait_type: t.trait_type || t.type || "Trait",
          value: t.value ?? ""
        }))
      };

      setMessage(`Membuat metadata item ${item.tokenId}...`);

      console.log("MEDIA URI:", mediaURI);
      console.log("METADATA:", metadata);

      const metadataURI = await uploadMetadataToIPFS(metadata);

      console.log("METADATA URI:", metadataURI);

      setItems((prev) =>
        prev.map((x, i) =>
          i === index
            ? {
                ...x,
                metadataURI,
                mediaURI
              }
            : x
        )
      );

      setMessage(
        `Item ${item.tokenId} berhasil di-upload ke IPFS.`
      );

    } catch (e) {
      setMessage(`IPFS ERROR: ${e.message}`);
    } finally {
      setUploadingItem(null);
    }
  }

  const [contractAddress, setContractAddress] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [projectMetadataURI, setProjectMetadataURI] = useState("");
  const [projectProfileURI, setProjectProfileURI] = useState("");

  async function connectWallet() {
    if (!window.ethereum) {
      alert("Wallet EVM tidak ditemukan. Buka dengan MetaMask, OKX Wallet, atau wallet EVM lain.");
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts"
      });

      setAccount(accounts[0]);

      const currentChain = await window.ethereum.request({
        method: "eth_chainId"
      });

      const selected = CHAINS.find(
        c => c.hex.toLowerCase() === currentChain.toLowerCase()
      );

      if (selected) {
        setChain(selected);
      }
    } catch (error) {
      setMessage(error.message || "Gagal connect wallet");
    }
  }

  async function switchChain(selected) {
    setChain(selected);

    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: selected.hex }]
      });
    } catch (error) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: selected.hex,
                chainName: selected.name,
                nativeCurrency: {
                  name: selected.symbol,
                  symbol: selected.symbol,
                  decimals: 18
                },
                rpcUrls: [selected.rpc],
                blockExplorerUrls: [selected.explorer]
              }
            ]
          });
        } catch (addError) {
          setMessage(addError.message || "Gagal menambahkan chain");
        }
      } else {
        setMessage(error.message || "Gagal mengganti chain");
      }
    }
  }

  function addItem() {
    setItems(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        tokenId: "",
        name: "",
        description: "",
        supply: "1",
        price: "0",
        mediaURI: "",
        metadataURI: "",
        file: null,
        preview: "",
        traits: [
          { trait_type: "Rarity", value: "Common" }
        ]
      }
    ]);
  }

  function removeItem(id) {
    setItems(prev => prev.filter(item => item.id !== id));
  }

  function updateItem(id, field, value) {
    setItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, [field]: value }
          : item
      )
    );
  }

  function uploadItemFile(id, file) {
    if (!file) return;

    const preview = URL.createObjectURL(file);

    setItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, file, preview }
          : item
      )
    );
  }

  function addTrait(itemId) {
    setItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? {
              ...item,
              traits: [
                ...item.traits,
                { trait_type: "", value: "" }
              ]
            }
          : item
      )
    );
  }

  function updateTrait(itemId, index, field, value) {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== itemId) return item;

        const traits = [...item.traits];

        traits[index] = {
          ...traits[index],
          [field]: value
        };

        return {
          ...item,
          traits
        };
      })
    );
  }

  function removeTrait(itemId, index) {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== itemId) return item;

        return {
          ...item,
          traits: item.traits.filter(
            (_, i) => i !== index
          )
        };
      })
    );
  }

  function uploadProfile(file) {
    if (!file) return;

    setProfileFile(file);
    setProfilePreview(URL.createObjectURL(file));
  }

  function makeMetadata(item, index) {
    const ext = getExtension(item.file);

    const metadata = {
      name: item.name || `Item #${item.tokenId || index + 1}`,
      description: item.description || projectDescription,
      tokenId: Number(item.tokenId || index + 1),
      supply: item.supply || "1"
    };

    if (item.mediaURI) {
      if (IMAGE_EXT.includes(ext)) {
        metadata.image = item.mediaURI;
      } else {
        metadata.animation_url = item.mediaURI;
      }
    }

    metadata.attributes = [
      {
        trait_type: "Project",
        value: projectName || "Untitled Project"
      },
      ...item.traits.filter(
        t => t.trait_type && t.value
      )
    ];

    return metadata;
  }

  function downloadJSON(item, index) {
    const metadata = makeMetadata(item, index);

    const blob = new Blob(
      [JSON.stringify(metadata, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `${item.tokenId || index + 1}.json`;

    a.click();

    URL.revokeObjectURL(url);
  }

  function generateProjectJSON() {
    const metadata = {
      name: projectName || "Untitled Project",
      description: projectDescription || "",
      image: projectProfileURI || profilePreview || ""
    };

    const blob = new Blob(
      [JSON.stringify(metadata, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "project.json";
    a.click();
    URL.revokeObjectURL(url);

    setProjectMetadataURI("");
    setMessage("JSON Project berhasil dibuat. Upload project.json ke Google Drive lalu masukkan Link JSON Project.");
  }

  function downloadProjectJSON() {
    const metadata = {
      name: projectName || "Untitled Project",
      description: projectDescription || "",
      image: projectProfileURI || ""
    };

    const blob = new Blob(
      [JSON.stringify(metadata, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "project.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setMessage(
      "JSON Project berhasil dibuat. Upload project.json lalu masukkan URL JSON Project."
    );
  }

  async function handleDeploy() {
    try {
      setDeploying(true);
      setMessage("Mempersiapkan deployment...");

      const address = await deployProject({
        projectName,
        projectDescription,
        contractMetadataURI: "",
        onStatus: (status) => setMessage(status)
      });

      setContractAddress(address);
      setMessage("Project berhasil dibuat!");
    } catch (error) {
      console.error(error);
      setMessage(
        error?.shortMessage ||
        error?.reason ||
        error?.message ||
        "Deployment gagal"
      );
    } finally {
      setDeploying(false);
    }
  }

  function generateAll() {
    if (!items.length) {
      setMessage("Tambahkan item terlebih dahulu.");
      return;
    }

    items.forEach((item, index) => {
      downloadJSON(item, index);
    });

    setMessage(`${items.length} JSON berhasil dibuat.`);
  }

  return (
    <div className="app">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: Arial, sans-serif;
          background: #0b0d12;
          color: #fff;
        }

        button,
        input,
        textarea,
        select {
          font: inherit;
        }

        .app {
          min-height: 100vh;
          background:
            radial-gradient(circle at top, #24203b 0, #0b0d12 42%);
          padding: 20px;
        }

        .container {
          max-width: 900px;
          margin: auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .logo {
          font-size: 25px;
          font-weight: 800;
        }

        .wallet {
          background: #fff;
          color: #111;
          border: 0;
          border-radius: 12px;
          padding: 12px 18px;
          font-weight: 700;
        }

        .card {
          background: rgba(25, 27, 35, .95);
          border: 1px solid #30333e;
          border-radius: 18px;
          padding: 20px;
          margin-bottom: 18px;
        }

        h1, h2, h3 {
          margin-top: 0;
        }

        label {
          display: block;
          font-size: 13px;
          color: #aeb3c0;
          margin-bottom: 7px;
        }

        input,
        textarea,
        select {
          width: 100%;
          background: #101219;
          color: white;
          border: 1px solid #383c48;
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 14px;
          outline: none;
        }

        textarea {
          min-height: 90px;
          resize: vertical;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .profile {
          display: flex;
          gap: 18px;
          align-items: center;
          flex-wrap: wrap;
        }

        .profile img {
          width: 110px;
          height: 110px;
          object-fit: cover;
          border-radius: 18px;
          border: 1px solid #444;
        }

        .upload {
          border: 1px dashed #555b69;
          padding: 18px;
          border-radius: 12px;
          text-align: center;
          margin-bottom: 15px;
        }

        .item {
          border: 1px solid #383c48;
          border-radius: 15px;
          padding: 15px;
          margin-top: 15px;
          background: #11141b;
        }

        .item-preview {
          width: 100%;
          max-height: 300px;
          object-fit: contain;
          border-radius: 12px;
          background: #08090d;
          margin-bottom: 15px;
        }

        .trait {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 8px;
          align-items: center;
        }

        .trait input {
          margin-bottom: 8px;
        }

        .btn {
          border: 0;
          border-radius: 10px;
          padding: 11px 16px;
          cursor: pointer;
          font-weight: 700;
          margin: 4px;
        }

        .primary {
          background: #7c5cff;
          color: white;
        }

        .secondary {
          background: #292d38;
          color: white;
        }

        .danger {
          background: #48232b;
          color: #ff9cae;
        }

        .status {
          padding: 12px;
          border-radius: 10px;
          background: #171a22;
          color: #b9c0ce;
          margin-top: 12px;
        }

        .address {
          font-size: 12px;
          color: #9da4b4;
          word-break: break-all;
        }

        .chain-info {
          margin-top: 10px;
          color: #8f96a7;
          font-size: 13px;
        }

        @media (max-width: 650px) {
          .grid {
            grid-template-columns: 1fr;
          }

          .trait {
            grid-template-columns: 1fr;
          }

          .app {
            padding: 12px;
          }
        }
      `}</style>

      <div className="container">

        <div className="header">
          <div className="logo">
            ERC-1155 Creator
          </div>

          <button
            className="wallet"
            onClick={connectWallet}
          >
            {account
              ? `${account.slice(0, 6)}...${account.slice(-4)}`
              : "Connect Wallet"}
          </button>
        </div>

        <div className="card">
          <h2>⛓️ Select Chain</h2>

          <select
            value={chain.chainId}
            onChange={e => {
              const selected = CHAINS.find(
                c => c.chainId === Number(e.target.value)
              );

              if (selected) switchChain(selected);
            }}
          >
            {CHAINS.map(c => (
              <option
                key={c.chainId}
                value={c.chainId}
              >
                {c.name} — {c.chainId}
              </option>
            ))}
          </select>

          <div className="chain-info">
            Selected: <b>{chain.name}</b> · Chain ID: {chain.chainId}
          </div>

          {account && (
            <div className="address">
              Wallet: {account}
            </div>
          )}
        </div>

        <div className="card">
          <h2>🎨 Create Project</h2>

          <label>Nama Project</label>
          <input
            placeholder="Contoh: Golden Legends"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
          />

          <label>Deskripsi Project</label>
          <textarea
            placeholder="Deskripsi collection..."
            value={projectDescription}
            onChange={e => setProjectDescription(e.target.value)}
          />

          <label>URL Gambar Profil Project</label>
          <input
            type="url"
            placeholder="https://..."
            value={projectProfileURI || ""}
            onChange={e => setProjectProfileURI(e.target.value)}
          />

          <button
            type="button"
            className="btn secondary"
            onClick={downloadProjectJSON}
          >
            📄 Buat JSON Project
          </button>

          <label>URL JSON Project</label>
          <input
            type="url"
            placeholder="Paste URL JSON setelah upload..."
            value={projectMetadataURI || ""}
            onChange={e => setProjectMetadataURI(e.target.value)}
          />
        </div>

        <div className="card">
          <div className="header">
            <h2>🖼️ Items</h2>

            <button
              type="button"
              className="btn primary"
              onClick={addItem}
            >
              + Add Item
            </button>
          </div>

          {!items.length && (
            <div className="chain-info">
              Belum ada item. Tekan + Add Item.
            </div>
          )}

          {items.map((item, index) => (
            <div className="item" key={item.id}>

              <h3>
                {item.name || `Item #${index + 1}`}
              </h3>

              <label>Nama Item</label>
              <input
                placeholder="Contoh: Golden #1"
                value={item.name}
                onChange={e =>
                  updateItem(item.id, "name", e.target.value)
                }
              />

              <label>Deskripsi Item</label>
              <textarea
                placeholder="Deskripsi item..."
                value={item.description}
                onChange={e =>
                  updateItem(item.id, "description", e.target.value)
                }
              />

              <label>URL Gambar / Video</label>
              <input
                type="url"
                placeholder="https://..."
                value={item.mediaURI || ""}
                onChange={e =>
                  updateItem(item.id, "mediaURI", e.target.value)
                }
              />

              <label>Token ID</label>
              <input
                type="number"
                min="0"
                placeholder="1"
                value={item.tokenId}
                onChange={e =>
                  updateItem(item.id, "tokenId", e.target.value)
                }
              />

              <label>Supply</label>
              <input
                type="number"
                min="1"
                placeholder="100"
                value={item.supply}
                onChange={e =>
                  updateItem(item.id, "supply", e.target.value)
                }
              />

              <label>Harga Mint</label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0.001"
                value={item.price}
                onChange={e =>
                  updateItem(item.id, "price", e.target.value)
                }
              />

              <h3>🏷️ Traits</h3>

              {item.traits.map((trait, traitIndex) => (
                <div className="trait" key={traitIndex}>
                  <input
                    placeholder="Trait Type"
                    value={trait.trait_type}
                    onChange={e =>
                      updateTrait(
                        item.id,
                        traitIndex,
                        "trait_type",
                        e.target.value
                      )
                    }
                  />

                  <input
                    placeholder="Value"
                    value={trait.value}
                    onChange={e =>
                      updateTrait(
                        item.id,
                        traitIndex,
                        "value",
                        e.target.value
                      )
                    }
                  />

                  <button
                    type="button"
                    className="btn danger"
                    onClick={() =>
                      removeTrait(item.id, traitIndex)
                    }
                  >
                    ×
                  </button>
                </div>
              ))}

              <button
                type="button"
                className="btn secondary"
                onClick={() => addTrait(item.id)}
              >
                + Add Trait
              </button>

              <br />

              <button
                type="button"
                className="btn secondary"
                onClick={() => downloadJSON(item, index)}
              >
                📄 Buat JSON
              </button>

              <label>URL JSON</label>
              <input
                type="url"
                placeholder="Paste URL JSON setelah upload..."
                value={item.metadataURI || ""}
                onChange={e =>
                  updateItem(
                    item.id,
                    "metadataURI",
                    e.target.value
                  )
                }
              />

              <button
                type="button"
                className="btn danger"
                onClick={() => removeItem(item.id)}
              >
                Delete Item
              </button>

            </div>
          ))}
        </div>

        <div className="card">
          <h2>⛓️ On-chain</h2>

          <div className="status">
            Contract:
            <br />
            <span className="address">
              {contractAddress ||
                localStorage.getItem("nft1155_contract") ||
                "Belum di-deploy"}
            </span>
          </div>

          <h3>Create Item</h3>

          <p className="chain-info">
            Pilih item di atas, lalu buat item tersebut
            di kontrak ERC-1155.
          </p>

          {items.map((item, index) => (
            <div className="item" key={"chain-" + item.id}>
              <b>
                {item.name ||
                  `Item #${index + 1}`}
              </b>

              <div className="chain-info">
                Token ID: {item.tokenId || "-"} ·
                Supply: {item.supply || "-"} ·
                Price: {item.price || "0"}
              </div>

              <label>URL JSON</label>

              <input
                type="url"
                placeholder="Paste URL JSON setelah upload..."
                value={item.metadataURI || ""}
                onChange={(e) =>
                  updateItem(
                    item.id,
                    "metadataURI",
                    e.target.value
                  )
                }
              />

              
              <button
                type="button"
                onClick={() => uploadItemMetadata(index)}
                disabled={uploadingItem === index}
              >
                {uploadingItem === index
                  ? "Uploading..."
                  : "UPLOAD IPFS"}
              </button>

<button
                className="btn primary"
                disabled={
                  !account ||
                  !item.tokenId ||
                  !item.supply
                }
                onClick={async () => {
  if (creatingItem === index) return;

  try {
    setCreatingItem(index);
    setMessage(`⏳ Memproses Item ${item.tokenId}...`);

    setMessage(`🔐 Menunggu konfirmasi wallet untuk Item ${item.tokenId}...`);

    const tx = await createItemOnChain(
      item.tokenId,
      item.supply,
      item.price || "0",
      item.metadataURI || ""
    );

    setMessage(`⛓️ Menunggu blockchain...`);

    setMessage(`✅ Item ${item.tokenId} berhasil dibuat. TX: ${tx}`);
  } catch (error) {
    console.error(error);
    setMessage(
      error?.shortMessage ||
      error?.reason ||
      error?.message ||
      "❌ Create Item gagal"
    );
  } finally {
    setCreatingItem(null);
  }
}}
>
  {creatingItem === index
    ? "⏳ Creating Item..."
    : "Create Item On-chain"}
</button>
            </div>
          ))}

          <hr />

          <h3>Public Mint</h3>

          <label>Token ID</label>
          <input
            id="public-token-id"
            placeholder="1001"
          />

          <label>Quantity</label>
          <input
            id="public-quantity"
            type="number"
            min="1"
            defaultValue="1"
          />

          <label>Price per NFT</label>
          <input
            id="public-price"
            type="number"
            min="0"
            step="any"
            placeholder="0.001"
          />

          <button
            className="btn primary"
            disabled={!account}
            onClick={async () => {
              try {
                const tokenId =
                  document.getElementById(
                    "public-token-id"
                  ).value;

                const amount =
                  document.getElementById(
                    "public-quantity"
                  ).value;

                const price =
                  document.getElementById(
                    "public-price"
                  ).value;

                if (!tokenId || !amount || price === "") {
                  throw new Error(
                    "Token ID, quantity, dan price wajib diisi."
                  );
                }

                setMessage("Public mint diproses...");

                const tx =
                  await publicMintOnChain(
                    tokenId,
                    amount,
                    price
                  );

                setMessage(
                  `Public mint berhasil. TX: ${tx}`
                );
              } catch (error) {
                console.error(error);

                setMessage(
                  error?.shortMessage ||
                  error?.reason ||
                  error?.message ||
                  "Public mint gagal"
                );
              }
            }}
          >
            Mint
          </button>

          <hr />

          <h3>Creator Mint To</h3>

          <label>Recipient Wallet</label>
          <input
            id="mint-recipient"
            placeholder="0x..."
          />

          <label>Token ID</label>
          <input
            id="mint-token-id"
            placeholder="1001"
          />

          <label>Quantity</label>
          <input
            id="mint-quantity"
            type="number"
            min="1"
            defaultValue="1"
          />

          <button
            className="btn secondary"
            disabled={!account}
            onClick={async () => {
              try {
                const recipient =
                  document.getElementById(
                    "mint-recipient"
                  ).value.trim();

                const tokenId =
                  document.getElementById(
                    "mint-token-id"
                  ).value;

                const amount =
                  document.getElementById(
                    "mint-quantity"
                  ).value;

                if (
                  !recipient ||
                  !tokenId ||
                  !amount
                ) {
                  throw new Error(
                    "Recipient, Token ID, dan quantity wajib diisi."
                  );
                }

                setMessage("Creator mint diproses...");

                const tx =
                  await mintToOnChain(
                    recipient,
                    tokenId,
                    amount
                  );

                setMessage(
                  `Mint To berhasil. TX: ${tx}`
                );
              } catch (error) {
                console.error(error);

                setMessage(
                  error?.shortMessage ||
                  error?.reason ||
                  error?.message ||
                  "Mint To gagal"
                );
              }
            }}
          >
            Mint To Wallet
          </button>

          <hr />

          <h3>Creator Mint To Many</h3>

          <label>
            Satu wallet per baris:
            <br />
            address,tokenId,quantity
          </label>

          <textarea
            id="batch-input"
            placeholder={
              "0xAAA...,1001,5\n" +
              "0xBBB...,1001,2\n" +
              "0xCCC...,5000,1"
            }
          />

          <button
            className="btn primary"
            disabled={!account}
            onClick={async () => {
              try {
                const text =
                  document.getElementById(
                    "batch-input"
                  ).value.trim();

                if (!text) {
                  throw new Error(
                    "Masukkan daftar wallet."
                  );
                }

                const rows =
                  text.split(/\r?\n/)
                    .map(x => x.trim())
                    .filter(Boolean);

                const recipients = [];
                const tokenIds = [];
                const amounts = [];

                for (const row of rows) {
                  const parts =
                    row.split(",").map(x => x.trim());

                  if (parts.length !== 3) {
                    throw new Error(
                      `Format salah: ${row}`
                    );
                  }

                  recipients.push(parts[0]);
                  tokenIds.push(parts[1]);
                  amounts.push(parts[2]);
                }

                setMessage(
                  `Memproses ${rows.length} recipient...`
                );

                const tx =
                  await mintManyOnChain(
                    recipients,
                    tokenIds,
                    amounts
                  );

                setMessage(
                  `Batch mint berhasil. TX: ${tx}`
                );
              } catch (error) {
                console.error(error);

                setMessage(
                  error?.shortMessage ||
                  error?.reason ||
                  error?.message ||
                  "Batch mint gagal"
                );
              }
            }}
          >
            Mint To Many Wallet
          </button>
        </div>


        <div className="card">
          <h2>📄 Metadata</h2>

          <button
            className="btn secondary"
            onClick={generateAll}
          >
            Generate Semua JSON
          </button>

          <button
            className="btn primary"
            onClick={handleDeploy}
            disabled={deploying || !account || !projectName}
          >
            {deploying ? "Deploying..." : "🚀 Deploy Project"}
          </button>

          {!account && (
            <div className="status">
              Connect wallet terlebih dahulu.
            </div>
          )}

          {contractAddress && (
            <div className="status">
              <b>Contract:</b>
              <br />
              <span className="address">
                {contractAddress}
              </span>
            </div>
          )}

          {message && (
            <div className="status">
              {message}
            </div>
          )}

          <div className="chain-info">
            JSON saat ini dibuat otomatis di browser.
            Tahap berikutnya kita sambungkan ke IPFS sehingga
            URL media dan metadata menjadi permanen.
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
