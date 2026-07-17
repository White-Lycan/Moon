// GET /api/posts            -> list all published posts (newest first)
// GET /api/posts?slug=xyz   -> fetch a single published post by slug
//
// This endpoint is intentionally public and read-only.
// No Access check here — anyone visiting the blog can read published posts.

export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug");

    try {
        if (slug) {
            const post = await env.DB.prepare(
                "SELECT id, slug, title, body, created_at, updated_at FROM posts WHERE slug = ? AND published = 1"
            ).bind(slug).first();

            if (!post) {
                return jsonResponse({ error: "Not found" }, 404);
            }
            return jsonResponse(post);
        }

        const { results } = await env.DB.prepare(
            "SELECT id, slug, title, body, created_at, updated_at FROM posts WHERE published = 1 ORDER BY created_at DESC"
        ).all();

        return jsonResponse(results);
    } catch (err) {
        return jsonResponse({ error: "Something went wrong reading posts" }, 500);
    }
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" }
    });
}
