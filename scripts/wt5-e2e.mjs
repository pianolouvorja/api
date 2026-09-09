#!/usr/bin/env node
/**
 * WT-5 E2E ponta a ponta local (Ciclo 4).
 *
 * Valida o fluxo completo da arquitetura cloud SEM desktop:
 *   [web operator] ──WS──> [piano-api relay] <──WS── [receiver browser]
 *
 * Uso:  node scripts/wt5-e2e.mjs   (a partir de ~/piano-api, com build feito)
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const require = createRequire(new URL('../package.json', import.meta.url))
const WebSocket = require('ws')
const API_PORT = 3198
const api = `http://127.0.0.1:${API_PORT}`

// ── helpers ──────────────────────────────────────────────────────────
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function waitApiReady() {
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(`${api}/v1/health`)).ok) return } catch {}
    await wait(100)
  }
  throw new Error('API não subiu')
}
const open = (url) =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    ws.once('open', () => resolve(ws))
    ws.once('error', reject)
  })
function collect(ws) {
  const msgs = []
  ws.on('message', (raw) => msgs.push(JSON.parse(String(raw))))
  return msgs
}
async function waitFor(msgs, pred, label, timeoutMs = 3000) {
  const end = Date.now() + timeoutMs
  while (Date.now() < end) {
    const found = msgs.find(pred)
    if (found) return found
    await wait(50)
  }
  throw new Error(`timeout esperando: ${label}`)
}

// ── validação do receiver browser (HTML) ─────────────────────────────
function validateBrowserReceiver() {
  const htmlPath = new URL('../../palco-receiver/browser/index.html', import.meta.url)
  const html = readFileSync(htmlPath, 'utf8')
  assert.match(html, /role=receiver/, 'receiver deve conectar como role=receiver')
  assert.match(html, /sessions\/'\s*\+\s*code\s*\+\s*'\/token/, 'receiver deve buscar token por código')
  assert.match(html, /case "projection"/, 'receiver deve renderizar projection')
  console.log('✓ receiver browser: contrato cloud presente')
}

// ── E2E ──────────────────────────────────────────────────────────────
async function main() {
  validateBrowserReceiver()

  const child = spawn('node', ['dist/index.js'], {
    env: {
      ...process.env, PORT: String(API_PORT),
      DB_PATH: './data/wt5-e2e.db', REMOTE_SESSION_KEY: 'e2e-key', PALCO_RELAY_KEY: 'e2e-key',
    },
    stdio: 'ignore',
  })
  try {
    await waitApiReady()

    // 1. operator cria a sessão (fluxo do web: código mostrado pro operador)
    const { code, token } = await fetch(`${api}/v1/palco/sessions`, { method: 'POST' }).then(r => r.json())
    assert.match(code, /^[A-Z0-9]{6}$/)
    console.log(`✓ sessão criada: ${code}`)

    // 2. TV 1 entra pelo FLUXO DO RECEIVER (só tem o código — como será no culto)
    const tv1Bootstrap = await fetch(`${api}/v1/palco/sessions/${code}/token`).then(r => r.json())
    assert.equal(tv1Bootstrap.token, token, 'token bootstrap = token da sessão')
    const tv1 = await open(`${api.replace('http','ws')}/v1/palco/relay/${code}?token=${tv1Bootstrap.token}&role=receiver`)
    const tv1Msgs = collect(tv1)
    console.log('✓ TV 1 conectou via código (bootstrap token)')

    // 3. TV 2 entra também (multi-receiver)
    const tv2 = await open(`${api.replace('http','ws')}/v1/palco/relay/${code}?token=${token}&role=receiver`)
    const tv2Msgs = collect(tv2)
    console.log('✓ TV 2 conectou')

    // 4. web operator conecta e projeta BÍBLIA na TV 1 (rota por slot)
    const operator = await open(`${api.replace('http','ws')}/v1/palco/relay/${code}?token=${token}&role=operator`)
    operator.send(JSON.stringify({ v: 2, type: 'youare', receivers: 2 }))
    await waitFor(tv1Msgs, m => m.type === 'youare', 'youare na TV1')

    operator.send(JSON.stringify({ v: 2, type: 'projection', footerRef: 'Jo 3:16', text: 'Porque Deus amou o mundo' }))
    const slideTv1 = await waitFor(tv1Msgs, m => m.type === 'projection', 'slide bíblia TV1')
    assert.equal(slideTv1.footerRef, 'Jo 3:16')
    const slideTv2 = await waitFor(tv2Msgs, m => m.type === 'projection', 'slide bíblia TV2')
    assert.equal(slideTv2.text, 'Porque Deus amou o mundo')
    console.log('✓ slide de bíblia chegou nas 2 TVs (late-join + broadcast)')

    // 5. TV 3 entra DEPOIS (late-join) e recebe o último estado
    const tv3 = await open(`${api.replace('http','ws')}/v1/palco/relay/${code}?token=${token}&role=receiver`)
    const tv3Msgs = collect(tv3)
    const late = await waitFor(tv3Msgs, m => m.type === 'projection', 'late-join TV3')
    assert.equal(late.text, 'Porque Deus amou o mundo')
    console.log('✓ TV 3 (late-join) recebeu o slide em exibição')

    // 6. operador volta ao idle
    operator.send(JSON.stringify({ v: 2, type: 'idle', msg: 'Aguardando…' }))
    await waitFor(tv1Msgs, m => m.type === 'idle', 'idle TV1')
    console.log('✓ idle propagado')

    for (const ws of [operator, tv1, tv2, tv3]) ws.close()
    console.log('\nWT-5 E2E: PASS (fluxo cloud completo sem desktop)')
    process.exitCode = 0
  } finally {
    child.kill()
  }
}

main().catch((e) => { console.error('WT-5 E2E: FAIL —', e.message); process.exit(1) })
