const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')

const MODELS = [
  { key: 'shizuku', baseUrl: 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/', rawBase: 'https://raw.githubusercontent.com/guansss/pixi-live2d-display/v0.4.0/test/assets/shizuku/', jsonFile: 'shizuku.model.json' },
  { key: 'haru', baseUrl: 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/', rawBase: 'https://raw.githubusercontent.com/guansss/pixi-live2d-display/v0.4.0/test/assets/haru/', jsonFile: 'haru_greeter_t03.model3.json' },
  { key: 'yiselin', baseUrl: 'https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B4%A9%E5%9D%8F%E5%AD%A6%E5%9B%AD2/yiselin/', rawBase: 'https://raw.githubusercontent.com/Eikanya/Live2d-model/main/崩坏学园2/yiselin/', jsonFile: 'model.json' },
  { key: 'kp31', baseUrl: 'https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B0%91%E5%A5%B3%E5%89%8D%E7%BA%BF%20girls%20Frontline/live2dold/old/kp31/normal/', rawBase: 'https://raw.githubusercontent.com/Eikanya/Live2d-model/main/少女前线 girls Frontline/live2dold/old/kp31/normal/', jsonFile: 'model.json' },
  { key: 'himeko', baseUrl: 'https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B4%A9%E5%9D%8F%E5%AD%A6%E5%9B%AD2/himeko/', rawBase: 'https://raw.githubusercontent.com/Eikanya/Live2d-model/main/崩坏学园2/himeko/', jsonFile: 'model.json' },
  { key: 'bronya', baseUrl: 'https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B4%A9%E5%9D%8F%E5%AD%A6%E5%9B%AD2/bronya/', rawBase: 'https://raw.githubusercontent.com/Eikanya/Live2d-model/main/崩坏学园2/bronya/', jsonFile: 'model.json' }
]

const OUT_DIR = path.join(__dirname, '..', 'public', 'live2d-models')
const PROXY = 'https://gh-proxy.com/'

function fetchUrl(url, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    const req = mod.get(url, { timeout }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, timeout).then(resolve, reject)
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        if (res.statusCode === 200) resolve(Buffer.concat(chunks))
        else reject(new Error(`HTTP ${res.statusCode}`))
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

function extractRefs(json, baseUrl) {
  const refs = new Set()
  if (json.model) refs.add(new URL(json.model, baseUrl).href)
  if (Array.isArray(json.textures)) json.textures.forEach(t => refs.add(new URL(t, baseUrl).href))
  const fr = json.FileReferences || {}
  if (fr.Moc) refs.add(new URL(fr.Moc, baseUrl).href)
  if (fr.DisplayInfo) refs.add(new URL(fr.DisplayInfo, baseUrl).href)
  if (fr.Textures) fr.Textures.forEach(t => refs.add(new URL(t, baseUrl).href))
  if (fr.Motions) Object.values(fr.Motions).forEach(arr => (Array.isArray(arr)?arr:[]).forEach(m => { const f=m.File||m.file; if(f) refs.add(new URL(f,baseUrl).href) }))
  if (fr.Physics) refs.add(new URL(fr.Physics, baseUrl).href)
  if (fr.Pose) refs.add(new URL(fr.Pose, baseUrl).href)
  if (fr.Expressions) (Array.isArray(fr.Expressions)?fr.Expressions:[]).forEach(e => { const f=e.File||e.file; if(f) refs.add(new URL(f,baseUrl).href) })
  if (json.motions) Object.values(json.motions).forEach(arr => (Array.isArray(arr)?arr:[]).forEach(m => { const f=m.file||m.File; if(f) refs.add(new URL(f,baseUrl).href) }))
  if (json.physics) refs.add(new URL(json.physics, baseUrl).href)
  if (json.pose) refs.add(new URL(json.pose, baseUrl).href)
  if (json.expressions) (Array.isArray(json.expressions)?json.expressions:[]).forEach(e => { const f=e.file||e.File; if(f) refs.add(new URL(f,baseUrl).href) })
  return [...refs]
}

async function downloadWithFallback(jsDelivrUrl, rawUrl, localPath) {
  if (fs.existsSync(localPath)) {
    const stat = fs.statSync(localPath)
    if (stat.size > 200) return true
  }

  const dir = path.dirname(localPath)
  fs.mkdirSync(dir, { recursive: true })

  try {
    const buf = await fetchUrl(jsDelivrUrl)
    if (buf.length > 200) {
      fs.writeFileSync(localPath, buf)
      return true
    }
  } catch {}

  try {
    const proxyUrl = PROXY + rawUrl
    const buf = await fetchUrl(proxyUrl, 30000)
    if (buf.length > 200) {
      fs.writeFileSync(localPath, buf)
      return true
    }
  } catch {}

  return false
}

async function main() {
  let totalOk = 0, totalFail = 0

  for (const model of MODELS) {
    const modelDir = path.join(OUT_DIR, model.key)
    const jsonLocal = path.join(modelDir, model.jsonFile)
    if (!fs.existsSync(jsonLocal)) { console.log(`SKIP ${model.key}`); continue }

    const json = JSON.parse(fs.readFileSync(jsonLocal, 'utf-8'))
    const refs = extractRefs(json, model.baseUrl)

    const missing = []
    for (const jsdUrl of refs) {
      const rel = decodeURIComponent(jsdUrl.replace(model.baseUrl, ''))
      const local = path.join(modelDir, ...rel.split('/'))
      const needsDownload = !fs.existsSync(local) || fs.statSync(local).size <= 200
      if (needsDownload) {
        const rawUrl = model.rawBase + rel
        missing.push({ jsdUrl, rawUrl, local })
      }
    }

    if (missing.length === 0) { console.log(`${model.key}: all OK`); continue }
    console.log(`${model.key}: ${missing.length} files to download...`)

    for (const { jsdUrl, rawUrl, local } of missing) {
      const ok = await downloadWithFallback(jsdUrl, rawUrl, local)
      if (ok) {
        totalOk++
        const size = fs.statSync(local).size
        console.log(`  OK: ${path.basename(local)} (${(size/1024).toFixed(0)}KB)`)
      } else {
        totalFail++
        console.log(`  FAIL: ${path.basename(local)}`)
      }
    }
  }

  console.log(`\nDone: ${totalOk} ok, ${totalFail} failed`)
}

main().catch(console.error)
