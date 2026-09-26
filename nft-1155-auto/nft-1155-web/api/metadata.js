export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      GITHUB_OWNER,
      GITHUB_REPO,
      GITHUB_BRANCH = "main",
      GITHUB_TOKEN
    } = process.env;

    if (!GITHUB_TOKEN) {
      return res.status(500).json({
        error: "GITHUB_TOKEN belum diset di server"
      });
    }

    const metadata = req.body || {};

    if (!metadata.name) {
      return res.status(400).json({
        error: "Metadata name wajib"
      });
    }

    const tokenId =
      metadata.tokenId !== undefined
        ? String(metadata.tokenId)
        : String(Date.now());

    const filePath = `metadata/${tokenId}.json`;

    const content = Buffer.from(
      JSON.stringify(metadata, null, 2)
    ).toString("base64");

    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `Create NFT metadata: ${tokenId}`,
          content,
          branch: GITHUB_BRANCH
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || "Metadata upload gagal",
        details: data
      });
    }

    const rawUrl =
      `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${filePath}`;

    return res.status(200).json({
      success: true,
      path: filePath,
      cid: null,
      url: rawUrl
    });

  } catch (e) {
    return res.status(500).json({
      error: e.message
    });
  }
}
