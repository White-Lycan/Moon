// POST   /api/admin/posts        -> create a post
// PUT    /api/admin/posts?id=1   -> update a post
// DELETE /api/admin/posts?id=1   -> delete a post
// GET    /api/admin/posts        -> list ALL posts, including drafts (for the admin dashboard)
//
// IMPORTANT: This endpoint is only safe because Cloudflare Access sits in front
// of it at the network edge. You MUST create an Access policy covering the path
// "/api/admin/*" (in addition to "/admin/*" for the dashboard page itself), or
// this endpoint is wide open to the internet. See setup steps provided separately.

export async function onRequestGet(context) {
    const { env } = context;
    try {
        const { results } = await env.DB.prepare(
            "SELECT id, slug, title, body, published, created_at, updated_at FROM posts ORDER BY created_at DESC"
        ).all();
        return jsonResponse(results);
    } catch (err) {
        return jsonResponse({ error: "Failed to list posts" }, 500);
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;

    let data;
    try {
        data = await request.json();
    } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const { slug, title, body, published } = data;
    if (!slug || !title || !body) {
        return jsonResponse({ error: "slug, title, and body are required" }, 400);
    }

    try {
        await env.DB.prepare(
            `INSERT INTO posts (slug, title, body, published, created_at, updated_at)
             VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`
        ).bind(slug, title, body, published ? 1 : 0).run();

        return jsonResponse({ ok: true }, 201);
    } catch (err) {
        // Most likely cause: duplicate slug (UNIQUE constraint)
        return jsonResponse({ error: "Could not create post — slug may already exist" }, 409);
    }
}

export async function onRequestPut(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
        return jsonResponse({ error: "id query param is required" }, 400);
    }

    let data;
    try {
        data = await request.json();
    } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const { slug, title, body, published } = data;

    try {
        await env.DB.prepare(
            `UPDATE posts
             SET slug = ?, title = ?, body = ?, published = ?, updated_at = datetime('now')
             WHERE id = ?`
        ).bind(slug, title, body, published ? 1 : 0, id).run();

        return jsonResponse({ ok: true });
    } catch (err) {
        return jsonResponse({ error: "Could not update post" }, 500);
    }
}

export async function onRequestDelete(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
        return jsonResponse({ error: "id query param is required" }, 400);
    }

    try {
        await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
        return jsonResponse({ ok: true });
    } catch (err) {
        return jsonResponse({ error: "Could not delete post" }, 500);
    }
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" }
    });
}
