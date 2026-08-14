import app from '../app.js';
import { db } from './db.js';
import { processEmbeddedSignup, verifyWhatsAppCredentials } from './whatsapp.js';
import http from 'http';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, suite: string, details?: any) {
  if (condition) {
    results.push({ suite, name, passed: true, details });
    console.log(`  ✅ [PASS] ${suite} > ${name}`);
  } else {
    results.push({ suite, name, passed: false, error: 'Assertion failed', details });
    console.error(`  ❌ [FAIL] ${suite} > ${name}`);
  }
}

async function startTestServer(): Promise<{ server: http.Server; baseUrl: string }> {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr: any = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${addr.port}` });
    });
  });
}

async function request(baseUrl: string, path: string, options: {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
} = {}): Promise<{ status: number; headers: Headers; body: any; raw: string }> {
  const url = `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  let bodyStr: string | undefined = undefined;
  if (options.body) {
    if (typeof options.body === 'string') {
      bodyStr = options.body;
    } else {
      bodyStr = JSON.stringify(options.body);
      headers['Content-Type'] = 'application/json';
    }
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: bodyStr
  });

  const raw = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(raw);
  } catch {
    json = raw;
  }

  return {
    status: res.status,
    headers: res.headers,
    body: json,
    raw
  };
}

async function runAllTests() {
  console.log('\n==================================================');
  console.log('🚀 RUNNING COMPREHENSIVE PRODUCTION QA TEST SUITE');
  console.log('==================================================\n');

  const { server, baseUrl } = await startTestServer();

  try {
    // ----------------------------------------------------
    // 1. AUTHENTICATION & MULTI-TENANCY TEST SETUP
    // ----------------------------------------------------
    console.log('--- Suite 1: Authentication ---');
    const emailA = `test_tenant_a_${Date.now()}@example.com`;
    const emailB = `test_tenant_b_${Date.now()}@example.com`;
    const password = 'SecurePassword123!';

    // Signup Tenant A
    const signupResA = await request(baseUrl, '/api/auth/signup', {
      method: 'POST',
      body: { email: emailA, password, name: 'Alice Tenant A', businessName: 'Alice Company' }
    });
    assert(signupResA.status === 200 && Boolean(signupResA.body.token), 'Signup Tenant A returns 200 + token', 'Auth');
    const tokenA = signupResA.body.token;
    const userA = signupResA.body.user;
    const businessIdA = userA?.business_id;

    // Signup Tenant B
    const signupResB = await request(baseUrl, '/api/auth/signup', {
      method: 'POST',
      body: { email: emailB, password, name: 'Bob Tenant B', businessName: 'Bob Store' }
    });
    assert(signupResB.status === 200 && Boolean(signupResB.body.token), 'Signup Tenant B returns 200 + token', 'Auth');
    const tokenB = signupResB.body.token;
    const userB = signupResB.body.user;
    const businessIdB = userB?.business_id;

    assert(businessIdA !== businessIdB, 'Tenants A and B have distinct business IDs', 'Multi-Tenant Security');

    // Test Login Tenant A
    const loginResA = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { email: emailA, password }
    });
    assert(loginResA.status === 200 && Boolean(loginResA.body.token), 'Login Tenant A returns valid token', 'Auth');

    // Test Invalid Password
    const badLoginRes = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { email: emailA, password: 'WrongPassword' }
    });
    assert(badLoginRes.status === 401, 'Login with wrong password rejected (401)', 'Auth');

    // Test Protected Route /api/auth/me
    const meResA = await request(baseUrl, '/api/auth/me', {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(meResA.status === 200 && meResA.body.user.email === emailA, 'GET /api/auth/me resolves Tenant A correctly', 'Auth');

    // Test Unauthorized Access (Missing Token)
    const unauthRes = await request(baseUrl, '/api/auth/me');
    assert(unauthRes.status === 401, 'Unauthorized request without token returns 401', 'Auth');

    // ----------------------------------------------------
    // 2. MULTI-TENANT ISOLATION AUDIT
    // ----------------------------------------------------
    console.log('\n--- Suite 2: Multi-Tenant Security Isolation ---');

    // Tenant A configures WhatsApp
    const configResA = await request(baseUrl, '/api/whatsapp/config', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        phone_number_id: '100000000000001',
        waba_id: '200000000000001',
        access_token: 'secret_token_tenant_a',
        meta_app_id: '3356483501181888'
      }
    });
    assert(configResA.status === 200, 'Tenant A can save WhatsApp config', 'Multi-Tenant Security');

    // Tenant B configures WhatsApp
    const configResB = await request(baseUrl, '/api/whatsapp/config', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: {
        phone_number_id: '100000000000002',
        waba_id: '200000000000002',
        access_token: 'secret_token_tenant_b',
        meta_app_id: '3356483501181888'
      }
    });
    assert(configResB.status === 200, 'Tenant B can save WhatsApp config', 'Multi-Tenant Security');

    // Tenant B reads WhatsApp connection
    const getWaB = await request(baseUrl, '/api/whatsapp', {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert(getWaB.body.connection.phone_number_id === '100000000000002', 'Tenant B only sees Tenant B phone number ID', 'Multi-Tenant Security');
    assert(getWaB.body.connection.access_token === '••••••••••••••••', 'Tenant B access token is masked in response', 'Multi-Tenant Security');

    // Tenant A creates a Template
    const createTmplA = await request(baseUrl, '/api/whatsapp/templates', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        name: 'promo_discount_tenant_a',
        category: 'MARKETING',
        body_text: 'Exclusive offer for Tenant A customers!'
      }
    });
    assert(createTmplA.status === 200 && Boolean(createTmplA.body.template), 'Tenant A creates template', 'Multi-Tenant Security');
    const tmplIdA = createTmplA.body.template?.id;

    // Tenant B gets templates -> Should NOT see Tenant A's template
    const getTmplsB = await request(baseUrl, '/api/whatsapp/templates', {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const containsA = getTmplsB.body.templates?.some((t: any) => t.id === tmplIdA);
    assert(!containsA, 'Tenant B cannot see Tenant A templates', 'Multi-Tenant Security');

    // Tenant B tries to delete Tenant A's template
    const delTmplB = await request(baseUrl, `/api/whatsapp/templates/${tmplIdA}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    // Verify template still exists for Tenant A
    const getTmplsA = await request(baseUrl, '/api/whatsapp/templates', {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const stillExistsA = getTmplsA.body.templates?.some((t: any) => t.id === tmplIdA);
    assert(stillExistsA, 'Tenant B cannot delete Tenant A template', 'Multi-Tenant Security');

    // ----------------------------------------------------
    // 3. WHATSAPP CONNECTION PERSISTENCE & UPSERT IDEMPOTENCY
    // ----------------------------------------------------
    console.log('\n--- Suite 3: Connection Persistence & Idempotency ---');

    // Check that repeated config updates do NOT create duplicate connections in DB
    await request(baseUrl, '/api/whatsapp/config', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { phone_number_id: '100000000000001', access_token: '••••••••••••••••' }
    });
    await request(baseUrl, '/api/whatsapp/config', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { phone_number_id: '100000000000001', access_token: '••••••••••••••••' }
    });

    const allConnA = await db.getWhatsAppConnectionsByBusinessId(businessIdA);
    assert(allConnA.length === 1, 'Repeated updates maintain exactly 1 connection per tenant (UPSERT idempotency)', 'Persistence');

    // Verify masked token does not overwrite stored token
    const dbConnA = await db.getWhatsAppConnectionByBusinessId(businessIdA);
    assert(dbConnA?.access_token === 'secret_token_tenant_a', 'Masked token •••• does NOT overwrite real stored token', 'Persistence');

    // ----------------------------------------------------
    // 4. CREDENTIAL VERIFICATION & ERROR HANDLING
    // ----------------------------------------------------
    console.log('\n--- Suite 4: Credential Verification Route ---');

    // Test with missing phone_number_id
    const testMissingRes = await request(baseUrl, '/api/whatsapp/test', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { phone_number_id: '', access_token: '' }
    });
    assert(testMissingRes.status === 400, 'Test route with missing credentials returns 400 JSON', 'Credential Verification');
    assert(typeof testMissingRes.body === 'object', 'Test route returns structured JSON, never HTML', 'Credential Verification');

    // Test with invalid phone ID and dummy token
    const testInvalidRes = await request(baseUrl, '/api/whatsapp/test', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { phone_number_id: '9999999999999999999', access_token: 'invalid_token_xyz' }
    });
    assert(testInvalidRes.status === 400 && testInvalidRes.body.status === 'Connection Error', 'Invalid Meta credentials safely fail with status "Connection Error"', 'Credential Verification');
    assert(Boolean(testInvalidRes.body.error), 'Safe Meta error message returned to client', 'Credential Verification');

    // ----------------------------------------------------
    // 5. SEND MESSAGE VALIDATION
    // ----------------------------------------------------
    console.log('\n--- Suite 5: Send Message API ---');

    // Send without recipient or body
    const sendMissing = await request(baseUrl, '/api/whatsapp/send-test', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { recipientPhone: '', messageBody: '' }
    });
    assert(sendMissing.status === 400, 'Send test with missing fields returns 400 JSON', 'Send Message');

    // Send when disconnected
    const sendDisconnected = await request(baseUrl, '/api/whatsapp/send-test', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { recipientPhone: '+15551234567', messageBody: 'Hello world' }
    });
    assert(sendDisconnected.status === 400, 'Send message when WhatsApp status is Not Connected / Connection Error is rejected safely', 'Send Message');

    // ----------------------------------------------------
    // 6. META WEBHOOK INTEGRATION
    // ----------------------------------------------------
    console.log('\n--- Suite 6: Webhook Processing ---');

    // Ensure Tenant A has phone_number_id '100000000000001' active for webhook routing
    await request(baseUrl, '/api/whatsapp/config', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        phone_number_id: '100000000000001',
        waba_id: '200000000000001',
        access_token: 'secret_token_tenant_a',
        meta_app_id: '3356483501181888'
      }
    });

    // GET Webhook Hub Challenge Verification
    const challengeStr = 'challenge_test_12345';
    const verifyGet = await request(baseUrl, `/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=fishcatch_verify_token_123&hub.challenge=${challengeStr}`);
    assert(verifyGet.status === 200 && verifyGet.raw === challengeStr, 'GET webhook challenge verification returns plain text challenge string', 'Webhook');

    // GET Webhook Invalid Token
    const verifyBad = await request(baseUrl, `/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=${challengeStr}`);
    assert(verifyBad.status === 403, 'GET webhook with wrong token returns 403', 'Webhook');

    // POST Webhook Message Event (Simulate inbound customer message for Tenant A)
    const testMsgId = `wamid.HBgL${Date.now()}`;
    const customerPhone = '15559876543';

    const webhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '200000000000001',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '15550001111',
                  phone_number_id: '100000000000001' // Matches Tenant A
                },
                contacts: [
                  {
                    profile: { name: 'Sarah Customer' },
                    wa_id: customerPhone
                  }
                ],
                messages: [
                  {
                    from: customerPhone,
                    id: testMsgId,
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    text: { body: 'Hi, I am interested in your services!' },
                    type: 'text'
                  }
                ]
              }
            }
          ]
        }
      ]
    };

    const webhookPost = await request(baseUrl, '/api/whatsapp/webhook', {
      method: 'POST',
      body: webhookPayload
    });
    assert(webhookPost.status === 200 && webhookPost.raw === 'EVENT_RECEIVED', 'POST webhook immediately acknowledges Meta with 200 EVENT_RECEIVED', 'Webhook');

    // Wait 200ms for async processing
    await new Promise((r) => setTimeout(r, 200));

    // Verify Tenant A received conversation & message
    const convsA = await request(baseUrl, '/api/conversations', {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(convsA.body.conversations?.length > 0, 'Inbound webhook created conversation for Tenant A', 'Webhook');

    // Verify Tenant B has NO conversations
    const convsB = await request(baseUrl, '/api/conversations', {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert(convsB.body.conversations?.length === 0, 'Tenant B did NOT receive Tenant A webhook message (strict routing)', 'Webhook & Multi-Tenancy');

    // Verify Lead was automatically created for Tenant A
    const leadsA = await request(baseUrl, '/api/leads', {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(leadsA.body.leads?.length > 0 && leadsA.body.leads[0].customer_name === 'Sarah Customer', 'Lead created automatically with status NEW from incoming message', 'Leads');

    // Test Opt-Out Keyword ("STOP")
    const stopMsgId = `wamid.HBgL_STOP_${Date.now()}`;
    const stopPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '200000000000001',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { phone_number_id: '100000000000001' },
                contacts: [{ profile: { name: 'Sarah Customer' }, wa_id: customerPhone }],
                messages: [
                  {
                    from: customerPhone,
                    id: stopMsgId,
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    text: { body: 'STOP' },
                    type: 'text'
                  }
                ]
              }
            }
          ]
        }
      ]
    };

    await request(baseUrl, '/api/whatsapp/webhook', {
      method: 'POST',
      body: stopPayload
    });
    await new Promise((r) => setTimeout(r, 200));

    const customerA = await db.findCustomerByWaId(businessIdA, customerPhone);
    assert(customerA?.opt_in_status === 'opted_out', 'Customer opt-in status switched to opted_out upon receiving "STOP"', 'Safety & Opt-Out');

    // ----------------------------------------------------
    // 7. CONVERSATIONS & LEADS LIFECYCLE
    // ----------------------------------------------------
    console.log('\n--- Suite 7: Conversation & Lead Lifecycle ---');
    const convId = convsA.body.conversations[0]?.id;
    assert(Boolean(convId), 'Conversation ID exists', 'Conversations');

    // Fetch conversation details (resets unread count)
    const convDetail = await request(baseUrl, `/api/conversations/${convId}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(convDetail.status === 200 && convDetail.body.conversation.unread_count === 0, 'Opening conversation resets unread count to 0', 'Conversations');

    // Switch mode to HUMAN
    const modeRes = await request(baseUrl, `/api/conversations/${convId}/mode`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { mode: 'HUMAN' }
    });
    assert(modeRes.status === 200 && modeRes.body.conversation.mode === 'HUMAN', 'Mode successfully toggled to HUMAN', 'Conversations');

    // Update Lead status to QUALIFIED
    const leadId = leadsA.body.leads[0]?.id;
    const updateLead = await request(baseUrl, `/api/leads/${leadId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { status: 'QUALIFIED' }
    });
    assert(updateLead.status === 200 && updateLead.body.lead.status === 'QUALIFIED', 'Lead status successfully updated to QUALIFIED', 'Leads');

    // ----------------------------------------------------
    // 8. DISCONNECT & RECONNECT FLOW
    // ----------------------------------------------------
    console.log('\n--- Suite 8: Disconnect & Reconnect Flow ---');
    const disconnectRes = await request(baseUrl, '/api/whatsapp/disconnect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(disconnectRes.status === 200 && disconnectRes.body.connection.status === 'Not Connected', 'Disconnect sets status to Not Connected and clears credentials', 'WhatsApp Lifecycle');

    // Reconnect
    const reconnectRes = await request(baseUrl, '/api/whatsapp/config', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        phone_number_id: '100000000000001',
        access_token: 'new_fresh_token_123',
        meta_app_id: '3356483501181888'
      }
    });
    assert(reconnectRes.status === 200, 'Reconnect successfully saves new credentials without error', 'WhatsApp Lifecycle');

    // ----------------------------------------------------
    // 9. PUBLIC DATA DELETION ENDPOINT (META COMPLIANCE)
    // ----------------------------------------------------
    console.log('\n--- Suite 9: Data Deletion Endpoint ---');
    const getDeletion = await request(baseUrl, '/api/whatsapp/data-deletion');
    assert(getDeletion.status === 200 && getDeletion.body.status === 'ACTIVE', 'GET /api/whatsapp/data-deletion returns active compliance status', 'Data Deletion');

    const postDeletion = await request(baseUrl, '/api/whatsapp/data-deletion', {
      method: 'POST',
      body: { user_id: 'meta_test_user_123' }
    });
    assert(postDeletion.status === 200 && Boolean(postDeletion.body.confirmation_code) && Boolean(postDeletion.body.url), 'POST /api/whatsapp/data-deletion returns valid confirmation_code and tracking url required by Meta', 'Data Deletion');

    // ----------------------------------------------------
    // 10. API 404 & ERROR HANDLING (NEVER HTML)
    // ----------------------------------------------------
    console.log('\n--- Suite 10: API Consistency & JSON Guarantees ---');
    const api404 = await request(baseUrl, '/api/non-existent-endpoint');
    assert(api404.status === 404 && typeof api404.body === 'object' && Boolean(api404.body.error), 'Non-existent API route returns 404 JSON, never HTML', 'API Response Consistency');

    console.log('\n==================================================');
    console.log(`QA TEST SUITE COMPLETED: ${results.filter(r => r.passed).length}/${results.length} PASSED`);
    console.log('==================================================\n');

  } finally {
    server.close();
  }

  const failedCount = results.filter((r) => !r.passed).length;
  if (failedCount > 0) {
    console.error(`❌ ${failedCount} tests failed.`);
    process.exit(1);
  } else {
    console.log('🎉 All automated tests passed!');
    process.exit(0);
  }
}

runAllTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
