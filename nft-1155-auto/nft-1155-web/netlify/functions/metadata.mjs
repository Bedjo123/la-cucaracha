export default async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const metadata = await req.json();

    if (!metadata.name) {
      return Response.json({ error: "Metadata name wajib" }, { status: 400 });
    }

    const jwt = process.env.PINATA_JWT;

    if (!jwt) {
      return Response.json({ error: "PINATA_JWT belum diset" }, { status: 500 });
    }

    const json = JSON.stringify(metadata, null, 2);

    const file = new File(
      [json],
      `metadata-${metadata.tokenId ?? Date.now()}.json`,
      { type: "application/json" }
    );

    const form = new FormData();
    form.append("file", file);
    form.append("network", "public");

    const response = await fetch(
      "https://uploads.pinata.cloud/v3/files",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`
        },
        body: form
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        { error: data?.error || "Upload metadata gagal", details: data },
        { status: response.status }
      );
    }

    const cid = data?.data?.cid;

    return Response.json({
      success: true,
      cid,
      ipfs: `ipfs://${cid}`
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
};

export const config = {
  path: "/api/metadata"
};
