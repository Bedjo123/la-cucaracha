export async function uploadToIPFS(file) {
  if (!file) {
    throw new Error("File belum dipilih.");
  }

  // Minta signed upload URL dari server
  const signResponse = await fetch("/api/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      fileName: file.name
    })
  });

  const signData = await signResponse.json();

  if (!signResponse.ok || !signData.url) {
    throw new Error(
      signData.error || "Gagal mendapatkan upload URL Pinata."
    );
  }

  // Upload file langsung dari browser ke Pinata
  const form = new FormData();
  form.append("file", file);

  const uploadResponse = await fetch(signData.url, {
    method: "POST",
    body: form
  });

  const uploadData = await uploadResponse.json();

  if (!uploadResponse.ok) {
    throw new Error(
      uploadData?.error || "Upload file ke Pinata gagal."
    );
  }

  const cid =
    uploadData?.data?.cid ||
    uploadData?.cid;

  if (!cid) {
    throw new Error("CID Pinata tidak ditemukan.");
  }

  return `ipfs://${cid}`;
}

export async function uploadMetadataToIPFS(metadata) {
  const response = await fetch("/api/metadata", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(metadata)
  });

  const data = await response.json();

  if (!response.ok || !data.ipfs) {
    throw new Error(
      data.error || "Upload metadata ke Pinata gagal."
    );
  }

  return data.ipfs;
}
