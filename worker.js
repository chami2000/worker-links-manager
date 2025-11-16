// --- HTML, CSS, and Client-Side JS for the Web UI (No Changes Here) ---

const HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KV Manager</title>
    <style>
        body { background-color: #121212; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { color: #ffffff; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .form-container, .kv-item, .bulk-actions-container { background-color: #1e1e1e; border: 1px solid #333; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        input[type="text"], input[type="url"] { width: 100%; padding: 10px; margin: 5px 0 15px 0; background-color: #333; border: 1px solid #555; border-radius: 4px; color: #e0e0e0; box-sizing: border-box; }
        .btn { padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
        .btn-primary { background-color: #007bff; color: white; }
        .btn-danger { background-color: #dc3545; color: white; }
        .kv-item { display: flex; align-items: center; }
        .kv-content { flex-grow: 1; margin-left: 15px; }
        .kv-key { font-weight: bold; font-size: 1.1em; color: #bb86fc; }
        .kv-value { word-break: break-all; color: #a0a0a0; }
        .kv-checkbox { transform: scale(1.5); }
        .bulk-actions-container { display: flex; align-items: center; }
    </style>
</head>
<body>
    <div class="container">
        <h1>KV Namespace Manager</h1>
        <div class="form-container">
            <form method="POST">
                <input type="text" name="key" placeholder="Key" required>
                <input type="url" name="value" placeholder="Value (URL)" required>
                <button type="submit" class="btn btn-primary">Add/Update Entry</button>
            </form>
        </div>
        __KV_LIST_FORM__
    </div>
    <script>
        const selectAllCheckbox = document.getElementById('select-all');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', function() {
                const checkboxes = document.querySelectorAll('.kv-checkbox');
                checkboxes.forEach(checkbox => { checkbox.checked = this.checked; });
            });
        }
    </script>
</body>
</html>
`;

// --- Main Worker Logic ---

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // Route 1: Handle Telegram Bot Webhook
        if (request.method === 'POST' && url.pathname === `/${env.BOT_SECRET_PATH}`) {
            return handleWebhook(request, env);
        }

        // Route 2: Serve the Web UI
        return handleWebRequest(request, env);
    },
};


// --- Telegram Bot Logic ---

async function handleWebhook(request, env) {
    const payload = await request.json();
    if (!payload.message || !payload.message.text || !payload.message.from) {
        return new Response('OK');
    }

    const { message } = payload;
    const userId = message.from.id.toString();
    const chatId = message.chat.id;
    const messageText = message.text;

    const whitelist = (env.WHITELIST || "").split(',').map(id => id.trim());
    if (!whitelist.includes(userId)) {
        await sendMessage(chatId, "Sorry, you are not authorized to use this bot.", env);
        return new Response('Unauthorized');
    }

    const stateKey = `TSTATE_${userId}`;
    const userStateJSON = await env.LINKS.get(stateKey);
    const userState = userStateJSON ? JSON.parse(userStateJSON) : null;

    if (userState && userState.status === 'AWAITING_KEY') {
        const originalKey = messageText.trim();
        // **MODIFICATION HERE: Prepend the '/' to the key before storing.**
        const keyToStore = `/${originalKey}`;
        const url = userState.url;
        
        await env.LINKS.put(keyToStore, url);
        await env.LINKS.delete(stateKey);

        // Generate the final URL using the ORIGINAL key for a clean link.
        const finalUrl = `${env.BASE_URL}/${originalKey}`;
        await sendMessage(chatId, `✅ Link created!\n\n${finalUrl}`, env);
    } 
    else {
        if (isValidUrl(messageText)) {
            const newState = { status: 'AWAITING_KEY', url: messageText };
            await env.LINKS.put(stateKey, JSON.stringify(newState), { expirationTtl: 300 });
            await sendMessage(chatId, "Got it. Now, what key would you like to use for this link?", env);
        } else {
            await sendMessage(chatId, "Hi! Please send me a valid URL to start.", env);
        }
    }

    return new Response('OK');
}

async function sendMessage(chatId, text, env) {
    const url = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`;
    const payload = {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
    };
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}


// --- Web UI Logic (No Changes Here) ---

async function handleWebRequest(request, env) {
    const auth = request.headers.get('Authorization');
    if (!auth || !checkAuth(auth, env)) {
        return new Response('Unauthorized', {
            status: 401,
            headers: { 'WWW-Authenticate': 'Basic realm="KV Manager"' },
        });
    }

    if (request.method === 'POST') {
        const formData = await request.formData();
        const action = formData.get('action');

        if (action === 'bulk_delete') {
            const keysToDelete = formData.getAll('keys_to_delete');
            if (keysToDelete.length > 0) {
                const deletePromises = keysToDelete.map(key => env.LINKS.delete(key));
                await Promise.all(deletePromises);
            }
        } else {
            const key = formData.get('key');
            const value = formData.get('value');
            if (key && value) {
                await env.LINKS.put(key, value);
            }
        }
        return Response.redirect(request.url, 303);
    }

    const { keys } = await env.LINKS.list();
    let kvListFormHtml = '';
    if (keys.length > 0) {
        let kvPairsHtml = '';
        for (const key of keys) {
            const value = await env.LINKS.get(key.name);
            kvPairsHtml += `<div class="kv-item"><input type="checkbox" name="keys_to_delete" value="${key.name}" class="kv-checkbox"><div class="kv-content"><div class="kv-key">${key.name}</div><div class="kv-value">${value}</div></div></div>`;
        }
        kvListFormHtml = `<form method="POST"><input type="hidden" name="action" value="bulk_delete"><div class="bulk-actions-container"><input type="checkbox" id="select-all" class="kv-checkbox" style="margin-right: 10px;"><label for="select-all" style="margin-right: 20px;">Select All</label><button type="submit" class="btn btn-danger">Delete Selected</button></div>${kvPairsHtml}</form>`;
    } else {
        kvListFormHtml = '<p>No key-value pairs found.</p>';
    }

    const finalHtml = HTML_TEMPLATE.replace('__KV_LIST_FORM__', kvListFormHtml);
    return new Response(finalHtml, { headers: { 'Content-Type': 'text/html' } });
}

function checkAuth(auth, env) {
    try {
        const [scheme, encoded] = auth.split(' ');
        if (scheme !== 'Basic') return false;
        const [user, pass] = atob(encoded).split(':');
        return user === env.ADMIN_USER && pass === env.ADMIN_PASS;
    } catch (e) {
        return false;
    }
}

function isValidUrl(string) {
    try {
        new URL(string);
        return /^(http|https)s?:\/\//.test(string);
    } catch (_) {
        return false;
    }
}
