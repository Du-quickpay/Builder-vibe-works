# Cloudflare Worker - Telegram API Proxy

This Cloudflare Worker acts as a proxy for Telegram Bot API to bypass filtering/blocking in Iran and other restricted regions.

## Deployment Steps

### 1. Login to Cloudflare Dashboard

Visit [dash.cloudflare.com](https://dash.cloudflare.com) and login to your account.

### 2. Go to Workers & Pages

- Click on "Workers & Pages" from the sidebar
- Click "Create application"
- Choose "Create Worker"

### 3. Deploy the Worker

1. Replace the default code with the content from `telegram-proxy.js`
2. Click "Save and Deploy"
3. Your worker will be available at the URL shown (should match the URL in your project)

### 4. Test the Worker

Test your worker by making a request:

```bash
curl "https://your-worker-url.workers.dev/bot{YOUR_BOT_TOKEN}/getMe"
```

This should return your bot information if everything is working correctly.

## How It Works

### Request Flow

1. **Frontend** → Makes request to Worker URL
2. **Worker** → Forwards request to official Telegram API
3. **Telegram API** → Returns response
4. **Worker** → Adds CORS headers and forwards response back
5. **Frontend** → Receives response as if it came directly from Telegram

### URL Format

The worker expects URLs in this format:

- `/bot{token}/sendMessage`
- `/bot{token}/getUpdates`
- `/bot{token}/editMessageText`
- etc.

### CORS Support

The worker automatically adds necessary CORS headers to allow frontend access from any domain.

## Security Notes

1. **Bot Token**: Your bot token is still passed through the URL, so make sure your frontend keeps it secure
2. **Rate Limiting**: The worker doesn't add additional rate limiting - Telegram's native limits still apply
3. **Logging**: The worker logs requests for debugging (remove console.log statements in production)

## Configuration in Project

The following files have been updated to use the Worker:

- `src/lib/telegram-service-enhanced.ts` - Main Telegram service
- `src/lib/telegram-callback-service.ts` - Callback polling service

Worker URL configured as: `https://telegram-proxy-fragrant-fog-f09d.anthonynoelmills.workers.dev`

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure the worker is deployed and responding to OPTIONS requests
2. **404 Errors**: Check that the worker URL is correct in the frontend code
3. **Bot Token Issues**: Verify your bot token is correctly set in environment variables

### Testing

You can test individual components:

1. **Worker Status**: Visit your worker URL directly
2. **Bot API**: Test with `/bot{token}/getMe`
3. **Frontend**: Check browser developer console for any errors

## Performance

The worker adds minimal latency (typically <50ms) and provides:

- Global CDN distribution through Cloudflare
- Automatic HTTPS
- Built-in DDoS protection
- High availability

This solution should resolve Telegram API access issues from Iranian IP addresses.
