#!/usr/bin/env node

/**
 * Plaid MCP Debug Tool
 * Use this to debug Plaid items, monitor Link analytics, and track usage
 */

const fetch = require('node-fetch');
require('dotenv').config();

// Get Plaid credentials from environment
const PLAID_CLIENT_ID = process.env.REACT_APP_PLAID_CLIENT_ID || process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.REACT_APP_PLAID_SECRET_PRODUCTION || process.env.PLAID_SECRET;

async function getOAuthToken() {
  console.log('🔐 Getting OAuth token for MCP access...');

  const response = await fetch('https://production.plaid.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: PLAID_CLIENT_ID,
      client_secret: PLAID_SECRET,
      grant_type: 'client_credentials',
      scope: 'mcp:dashboard'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get OAuth token: ${error}`);
  }

  const data = await response.json();
  console.log('✅ OAuth token obtained successfully');
  console.log('Token expires in:', data.expires_in, 'seconds');

  return data.access_token;
}

async function debugItem(itemId, accessToken) {
  console.log(`\n🔍 Debugging item: ${itemId}`);

  // This would connect to the MCP server at https://api.dashboard.plaid.com/mcp/sse
  // For now, we'll use the regular Plaid API to get item info

  const response = await fetch('https://production.plaid.com/item/get', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: PLAID_CLIENT_ID,
      secret: PLAID_SECRET,
      access_token: itemId // This should be the access token for the item
    })
  });

  if (response.ok) {
    const data = await response.json();
    console.log('\n📊 Item Status:');
    console.log('- Institution ID:', data.item.institution_id);
    console.log('- Products:', data.item.products.join(', '));
    console.log('- Webhook:', data.item.webhook || 'Not configured');
    console.log('- Last successful update:', data.item.status?.transactions?.last_successful_update);
    console.log('- Last failed update:', data.item.status?.transactions?.last_failed_update);

    if (data.item.error) {
      console.log('\n⚠️ Item Error:');
      console.log('- Type:', data.item.error.error_type);
      console.log('- Code:', data.item.error.error_code);
      console.log('- Message:', data.item.error.error_message);
    }
  } else {
    const error = await response.text();
    console.error('Failed to get item info:', error);
  }
}

async function getLinkAnalytics(fromDate, toDate) {
  console.log(`\n📈 Getting Link Analytics from ${fromDate} to ${toDate}`);

  // This would typically use the MCP server
  // For demonstration, we'll show what data would be available

  console.log('\nAvailable metrics via MCP:');
  console.log('- Link Opens');
  console.log('- Institution Selected');
  console.log('- Successful Handoffs');
  console.log('- Error Rates by Type');
  console.log('- Conversion Funnel');
  console.log('- Drop-off Points');

  console.log('\n💡 To access full analytics:');
  console.log('1. Configure Plaid MCP in your IDE or AI tool');
  console.log('2. Use the plaid_get_link_analytics tool');
  console.log('3. Analyze patterns in failed sessions');
}

async function checkWebhookStatus(accessToken) {
  console.log('\n🔔 Checking Webhook Configuration...');

  // Get webhook verification key
  const response = await fetch('https://production.plaid.com/webhook_verification_key/get', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: PLAID_CLIENT_ID,
      secret: PLAID_SECRET,
      key_id: 'your_key_id' // You'll need to get this from your dashboard
    })
  });

  if (response.ok) {
    const data = await response.json();
    console.log('✅ Webhook verification key found');
    console.log('Key algorithm:', data.key.alg);
  } else {
    console.log('⚠️ No webhook verification key configured');
    console.log('Configure webhooks at: https://dashboard.plaid.com');
  }
}

async function main() {
  try {
    console.log('🚀 Plaid MCP Debug Tool\n');

    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      console.error('❌ Missing Plaid credentials in environment variables');
      console.log('Please set:');
      console.log('- PLAID_CLIENT_ID or REACT_APP_PLAID_CLIENT_ID');
      console.log('- PLAID_SECRET or REACT_APP_PLAID_SECRET_PRODUCTION');
      process.exit(1);
    }

    // Get OAuth token for MCP access
    const accessToken = await getOAuthToken();

    // Check webhook configuration
    await checkWebhookStatus(accessToken);

    // Get Link analytics for the last week
    const toDate = new Date().toISOString().split('T')[0];
    const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await getLinkAnalytics(fromDate, toDate);

    console.log('\n📝 MCP Server Details:');
    console.log('- URL: https://api.dashboard.plaid.com/mcp/sse');
    console.log('- Protocol: SSE (Server-Sent Events)');
    console.log('- Auth: Bearer token from OAuth');
    console.log('- Token expiry: 15 minutes');

    console.log('\n🛠️ Available MCP Tools:');
    console.log('- plaid_debug_item: Debug specific items');
    console.log('- plaid_get_link_analytics: Analyze conversion funnels');
    console.log('- plaid_get_usages: Track API usage');
    console.log('- plaid_list_teams: List all teams');

    console.log('\n💡 To use MCP with Claude Desktop:');
    console.log('1. Install MCP support in Claude Desktop');
    console.log('2. Add this configuration to your MCP settings:');
    console.log(JSON.stringify({
      type: 'mcp',
      server_label: 'plaid',
      server_url: 'https://api.dashboard.plaid.com/mcp/sse',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  getOAuthToken,
  debugItem,
  getLinkAnalytics,
  checkWebhookStatus
};