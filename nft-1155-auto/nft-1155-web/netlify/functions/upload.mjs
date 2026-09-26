export default async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { fileName } = await req.json();

    if (!fileName) {
      return Response.json({ error: "fileName wajib" }, { status: 400 });
    }

    const jwt = process.env.PINATA_JWT;

    if (!jwt) {
      return Response.json({ error: "PINATA_JWT belum diset" }, { status: 500 });
    }

    const response = await fetch(
      "https://uploads.pinata.cloud/v3/files/sign",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          network: "public",
          expires: 30,
          filename: fileName
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        { error: data?.error || "Gagal membuat signed URL", details: data },
        { status: response.status }
      );
    }

    return Response.json({
      success: true,
      url: data.data
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
};

export const config = {
  path: "/api/upload"
};
