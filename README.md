---

# Advanced URL Shortener with Admin Panel & Telegram Bot

This project is an enhanced version of the simple and effective [worker-links](https://github.com/Erisa/worker-links) URL shortener, supercharged with a modern management interface and remote-control capabilities via a Telegram bot.

The entire application—redirector, admin panel, and Telegram bot—is designed to run within a single Cloudflare Worker, using a single KV namespace for data storage.


## Core Features

This worker combines three powerful functionalities into one script:

### 1. High-Performance URL Shortening
*   Leverages Cloudflare's global network for extremely fast redirects.
*   Uses Cloudflare KV for scalable, low-latency storage of links.
*   The core redirection logic is based on the robust `worker-links` project.

### 2. Secure Web Admin Panel
*   **Modern Dark UI:** A clean, responsive interface for managing your links.
*   **CRUD Operations:** Easily add, update, and view all your key-value pairs.
*   **Bulk Management:** Select multiple entries with checkboxes and delete them in a single action.
*   **Secure Access:** The panel is protected by Basic Authentication using credentials you set as environment variables.

### 3. Telegram Bot Integration
*   **Add Links on the Go:** Simply send a link to your bot, then reply with the desired key to create a short URL instantly.
*   **User Whitelist:** Only authorized Telegram User IDs (which you define) can interact with the bot.
*   **Automatic Formatting:** Keys are automatically prefixed with a `/` to ensure compatibility with the redirector.
*   **Conversational UI:** The bot guides you through the two-step process of adding a new link.

---

## Setup and Deployment

Deploying this entire system takes about 10 minutes. Follow these steps carefully.

### Prerequisites
*   A [Cloudflare account](https://dash.cloudflare.com/sign-up).
*   A [Telegram account](https://telegram.org/).

### Step 1: Create the Worker and KV Namespace

1.  In your Cloudflare dashboard, go to **Workers & Pages**.
2.  Click **Create application** > **Create Worker**. Give it a name (e.g., `my-link-shortener`).
3.  Go to the new worker's settings, then click on the **Variables** section.
4.  Under **KV Namespace Bindings**, click **Add binding**:
    *   **Variable name**: `LINKS`
    *   **KV namespace**: Click "Create a namespace" and give it a name like `my-links-kv`.
5.  Click **Save**.

### Step 2: Create Your Telegram Bot

1.  Open Telegram and start a chat with [@BotFather](https://t.me/BotFather).
2.  Send the `/newbot` command and follow the prompts to create your bot.
3.  **BotFather will give you a secret API token. Copy this immediately.**
4.  Next, start a chat with [@userinfobot](https://t.me/userinfobot) to get your **Telegram User ID**. Copy this down.

### Step 3: Configure Worker Environment Variables

In the same **Variables** section of your worker's settings, scroll down to **Environment Variables** and add the following secrets. These are essential for security and functionality.

*   `ADMIN_USER`: The username for the web admin panel.
*   `ADMIN_PASS`: The password for the web admin panel.
*   `BOT_TOKEN`: The secret API token you got from BotFather.
*   `WHITELIST`: Your Telegram User ID. To authorize multiple users, separate IDs with a comma (e.g., `12345678,87654321`).
*   `BASE_URL`: The domain you will use for the short links (e.g., `https://test.com`).
*   `BOT_SECRET_PATH`: A long, random, secret string for your webhook URL (e.g., `jhgfde4rfgg`).

Click **Save** after adding the variables.

### Step 4: Deploy the Worker Code

1.  Go back to your worker's code editor (`Quick edit`).
2.  Delete the default code and paste the entire content of the `worker.js` file from this repository.
3.  Click **Save and deploy**.

### Step 5: Set the Telegram Webhook

This is a **one-time command** that tells Telegram where to send messages. Run this from your computer's terminal (Command Prompt, PowerShell, etc.).

Replace the placeholders with your actual values:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://<YOUR_WORKER_URL>/<YOUR_BOT_SECRET_PATH>"
```

*   `<YOUR_BOT_TOKEN>`: The token from BotFather.
*   `<YOUR_WORKER_URL>`: Your worker's address (e.g., `my-link-shortener.user.workers.dev`).
*   `<YOUR_BOT_SECRET_PATH>`: The secret path you defined in the environment variables.

A successful response will look like this: `{"ok":true,"result":true,"description":"Webhook was set"}`.

**Your setup is now complete!**

---

## Usage

### Admin Panel
*   **URL**: Navigate to your worker's main URL (e.g., `https://my-link-shortener.user.workers.dev`).
*   **Login**: You will be prompted for a username and password. Use the `ADMIN_USER` and `ADMIN_PASS` you configured.
*   **Functionality**: Add new links, or select existing links using the checkboxes and click "Delete Selected" to perform bulk actions.

### Telegram Bot
1.  Open a chat with the bot you created.
2.  Send it a full URL you want to shorten (e.g., `https://www.google.com/`).
3.  The bot will ask for a key.
4.  Reply with the key you want (e.g., `google`).
5.  The bot will confirm and send you the final short URL (e.g., `https://test.com/google`). The key is automatically saved in KV as `/google`.

## Acknowledgments

*   The core redirection logic is based on the fantastic [worker-links](https://github.com/Erisa/worker-links) project by Erisa.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
