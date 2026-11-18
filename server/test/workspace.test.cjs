const assert = require('node:assert/strict');
const { once } = require('node:events');
const { randomUUID } = require('node:crypto');
const { mkdtemp, readdir, rmdir, unlink } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const JSZip = require(require.resolve('jszip', { paths: [require.resolve('mammoth')] }));

const database = new URL(process.env.TEST_DATABASE_URL || 'postgresql://postgres@127.0.0.1/test');
if (!process.env.TEST_DATABASE_URL || !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname)) {
  throw new Error('Set TEST_DATABASE_URL to a migrated, disposable local PostgreSQL database.');
}

function pdfFixture(text) {
  const content = 'BT /F1 12 Tf 72 720 Td (' + text + ') Tj ET\n';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length ' + content.length + ' >>\nstream\n' + content + 'endstream',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = objects.map((object, index) => {
    const offset = pdf.length;
    pdf += (index + 1) + ' 0 obj\n' + object + '\nendobj\n';
    return offset;
  });
  const xref = pdf.length;
  pdf += 'xref\n0 6\n0000000000 65535 f \n';
  pdf += offsets.map(offset => String(offset).padStart(10, '0') + ' 00000 n \n').join('');
  pdf += 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(pdf);
}

async function docxFixture(text) {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>' + text + '</w:t></w:r></w:p></w:body></w:document>');
  return zip.generateAsync({ type: 'nodebuffer' });
}

test('Workspace with real PostgreSQL and isolated provider demo mode', async t => {
  const storage = await mkdtemp(path.join(os.tmpdir(), 'contract-engine-integration-'));
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DEMO_MODE: 'true',
    DEMO_STORAGE_DIR: storage,
    DATABASE_URL: database.toString(),
    JWT_SECRET: 'local-integration-fixtures-only-do-not-deploy',
    BCRYPT_SALT_ROUNDS: '4',
  });

  const app = require('../dist/app').default;
  const prisma = require('../dist/utils/prisma').default;
  const server = app.listen(0, '127.0.0.1');
  const users = [];
  t.after(async () => {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
    for (const file of await readdir(storage)) await unlink(path.join(storage, file));
    await rmdir(storage);
  });
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port + '/api';

  async function request(route, { method = 'GET', token, body, status = 200, binary = false } = {}) {
    const headers = new Headers();
    if (token) headers.set('Authorization', 'Bearer ' + token);
    if (body && !(body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
      body = JSON.stringify(body);
    }
    const response = await fetch(base + route, { method, headers, body });
    assert.equal(response.status, status, route + ' returned ' + response.status +
      (response.status === status ? '' : ' ' + await response.text()));
    return binary ? { data: Buffer.from(await response.arrayBuffer()), headers: response.headers } : response.json();
  }

  const password = 'example-password-2026';
  async function register(name) {
    const email = randomUUID() + '@example.test';
    const result = await request('/auth/register', { method: 'POST', body: { name, email, password }, status: 201 });
    users.push(result.user.id);
    return { ...result, email };
  }

  let owner, partner, contract, secondContract, milestone, invoice, draft;
  const clientEmail = 'example-client@example.test';
  const exampleText = 'Synthetic contract: invoice payment is due in 15 days.';
  const dueDate = '2025-01-15';

  async function upload(bytes, extension, mime, title = 'Example service agreement', token = owner.token, status = 201) {
    const form = new FormData();
    form.set('file', new Blob([bytes], { type: mime }), 'contract.' + extension);
    form.set('title', title);
    form.set('clientEmail', clientEmail);
    return request('/contracts/upload', { method: 'POST', token, body: form, status });
  }

  await t.test('health, registration, login, profile and authentication', async () => {
    assert.equal((await request('/health')).demo, true);
    await request('/contracts', { status: 401 });
    owner = await register('Integration Owner');
    partner = await register('Integration Partner');
    assert.equal(owner.user.role, 'user');
    await request('/auth/login', { method: 'POST', status: 401, body: { email: owner.email, password: 'incorrect' } });
    const session = await request('/auth/login', { method: 'POST', body: { email: owner.email, password } });
    assert.equal((await request('/auth/me', { token: session.token })).id, owner.user.id);
  });

  await t.test('PDF, DOCX and TXT uploads, protected downloads and unavailable input', async () => {
    const pdf = pdfFixture(exampleText);
    contract = (await upload(pdf, 'pdf', 'application/pdf')).contract;
    const word = await docxFixture(exampleText);
    const docx = (await upload(word, 'docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Word example')).contract;
    secondContract = (await upload(Buffer.from(exampleText), 'txt', 'text/plain', 'Other agreement', partner.token)).contract;
    await upload(Buffer.from('invalid'), 'pdf', 'application/pdf', 'Invalid document', owner.token, 400);
    const original = await request('/contracts/' + contract.id + '/download', { token: owner.token, binary: true });
    assert.deepEqual(original.data, pdf);
    assert.match(original.headers.get('content-disposition'), /Example service agreement\.pdf/);
    assert.deepEqual((await request('/contracts/' + docx.id + '/download', { token: owner.token, binary: true })).data, word);
    assert.equal((await request('/contracts/' + secondContract.id + '/download', { token: partner.token, binary: true })).data.toString(), exampleText);
    await request('/contracts/' + contract.id + '/download', { token: partner.token, status: 404 });
    const records = await request('/contracts', { token: owner.token });
    assert.equal(records.length, 2);
    const detail = await request('/contracts/' + contract.id, { token: owner.token });
    assert.equal(detail.isDemo, true);
    assert.ok(detail.analysis.deliverables.length);
    assert.equal(detail.rawText, undefined);
    assert.equal(detail.fileUrl, undefined);
  });

  await t.test('analysis refresh, chat, contact, work logs and scope check', async () => {
    const basePath = '/contracts/' + contract.id;
    const result = await request(basePath + '/analyze', { method: 'POST', token: owner.token });
    assert.equal(result.contract.isDemo, true);
    const chat = await request(basePath + '/chat', { method: 'POST', token: owner.token, body: { message: 'When is payment due?' } });
    assert.match(chat.reply, /demo reply/i);
    const contact = await request(basePath + '/contact', { method: 'PATCH', token: owner.token, body: { clientEmail } });
    assert.equal(contact.clientEmail, clientEmail);
    assert.equal((await request(basePath + '/creep', { token: owner.token })).workLogsCount, 0);
    await request(basePath + '/worklog', { method: 'POST', token: owner.token, body: { description: 'Marketing review', hours: 2.5 }, status: 201 });
    assert.equal((await request(basePath + '/creep', { token: owner.token })).hasScopeCreep, true);
  });

  await t.test('milestone lifecycle and invoice contract association', async () => {
    const create = (item, token, title) => request('/milestones', {
      method: 'POST', token, body: { title, contractId: item.id, dueDate }, status: 201,
    });
    milestone = (await create(contract, owner.token, 'Approval')).milestone;
    const unrelated = (await create(secondContract, partner.token, 'Other approval')).milestone;
    const disposable = (await create(contract, owner.token, 'Disposable milestone')).milestone;
    const complete = await request('/milestones/' + milestone.id, {
      method: 'PATCH', token: owner.token, body: { status: 'COMPLETED' },
    });
    assert.equal(complete.milestone.status, 'COMPLETED');
    await request('/milestones/' + milestone.id, { method: 'PATCH', token: owner.token, body: { status: 'invalid' }, status: 400 });
    await request('/milestones/' + disposable.id, { method: 'DELETE', token: owner.token });

    invoice = (await request('/invoices', {
      method: 'POST', token: owner.token, status: 201,
      body: { contractId: contract.id, milestoneId: milestone.id, amount: 100.05, dueDate },
    })).invoice;
    assert.equal(invoice.status, 'OVERDUE');
    await request('/invoices/' + invoice.id, { method: 'PATCH', token: owner.token, status: 400, body: { milestoneId: unrelated.id } });
    assert.equal((await request('/invoices', { token: owner.token }))[0].milestoneId, milestone.id);
  });

  await t.test('partial payment, retry protection, reminder preview and simulated delivery', async () => {
    const payment = { invoiceId: invoice.id, amount: 40.01, method: 'bank_transfer', reference: randomUUID() };
    const submitted = await request('/invoices/payment', { method: 'POST', token: owner.token, body: payment, status: 201 });
    assert.equal(submitted.invoice.balance, 60.04);
    assert.equal(submitted.invoice.paidAmount, 40.01);
    assert.equal(submitted.invoice.status, 'OVERDUE');
    const replay = await request('/invoices/payment', { method: 'POST', token: owner.token, body: payment });
    assert.equal(replay.payment.id, submitted.payment.id);
    assert.equal(replay.invoice.payments.length, 1);
    draft = await request('/emails/reminder', { method: 'POST', token: owner.token, body: { invoiceId: invoice.id } });
    assert.equal(draft.sent, false);
    assert.equal(draft.recipient, clientEmail);
    assert.match(draft.body, /\$60\.04/);
    assert.deepEqual(await request('/emails/notifications', { token: owner.token }), []);
    const delivery = await request('/emails/reminder', {
      method: 'POST', token: owner.token, body: { invoiceId: invoice.id, delivery: draft },
    });
    assert.equal(delivery.sent, false);
    assert.equal(delivery.demo, true);
    const [notification] = await request('/emails/notifications', { token: owner.token });
    assert.match(notification.message, /No email was sent/);
    const read = await request('/emails/notifications/' + notification.id, { method: 'PATCH', token: owner.token });
    assert.equal(read.status, 'READ');
  });

  await t.test('concurrent payments reconcile and paid invoices reject additional payment', async () => {
    const pay = amount => request('/invoices/payment', {
      method: 'POST', token: owner.token, status: 201, body: { invoiceId: invoice.id, amount, method: 'card', reference: randomUUID() },
    });
    await Promise.all([pay(20.02), pay(40.02)]);
    const [paid] = await request('/invoices', { token: owner.token });
    assert.equal(paid.balance, 0);
    assert.equal(paid.paidAmount, 100.05);
    assert.equal(paid.status, 'PAID');
    assert.equal(paid.payments.length, 3);
    await request('/invoices/payment', { method: 'POST', token: owner.token, status: 400, body: { invoiceId: invoice.id, amount: 1, method: 'cash' } });
    await request('/invoices/' + invoice.id, { method: 'DELETE', token: owner.token, status: 409 });
  });
});
