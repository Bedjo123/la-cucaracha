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

    const { fileName, fileBase64 } = req.body || {};

    if (!fileName || !fileBase64) {
      return res.status(400).json({
        error: "fileName dan fileBase64 wajib"
      });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `images/${Date.now()}-${safeName}`;

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
          message: `Upload NFT media: ${safeName}`,
          content: fileBase64,
          branch: GITHUB_BRANCH
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || "GitHub upload gagal",
        details: data
      });
    }

    const rawUrl =
      `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${filePath}`;

    return res.status(200).json({
      success: true,
      path: filePath,
      url: rawUrl,
      download_url: data.content?.download_url || rawUrl
    });

  } catch (e) {
    return res.status(500).json({
      error: e.message
    });
  }
}
