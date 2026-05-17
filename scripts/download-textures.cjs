const https = require('https')
const fs = require('fs')
const path = require('path')

const MODELS = [
  { key: 'shizuku', baseUrl: 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/', jsonFile: 'shizuku.model.json' },
  { key: 'haru', baseUrl: 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/', jsonFile: 'haru_greeter_t03.model3.json' },
  { key: 'yiselin', baseUrl: 'https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B4%A9%E5%9D%8F%E5%AD%A6%E5%9B%AD2/yiselin/', jsonFile: 'model.json' },
  { key: 'kp31', baseUrl: 'https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B0%91%E5%A5%B3%E5%89%8D%E7%BA%BF%20girls%20Frontline/live2dold/old/kp31/normal/', jsonFile: 'model.json' },
  { key: 'himeko', baseUrl: 'https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B4%A9%E5%9D%8F%E5%AD%A6%E5%9B%AD2/himeko/', jsonFile: 'model.json' },
  { key: 'bronya', baseUrl: 'https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B4%A9%E5%9D%8F%E5%AD%A6%E5%9B%AD2/bronya/', jsonFile: 'model.json' }
]

const OUT_DIR = path.join(__dirname, '..', 'public', 'live2d-models')

function download(url, retries = 3) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 20000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, retries).then(resolve, reject)
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        if (res.statusCode === 200) resolve(Buffer.concat(chunks))
        else reject(new Error(`HTTP ${res.statusCode}`))
      })
    })
    req.on('error', e => {
      if (retries > 1) {
        setTimeout(() => download(url, retries - 1).then(resolve, reject), 2000)
      } else reject(e)
    })
    req.on('timeout', () => {
      req.destroy()
      if (retries > 1) {
        setTimeout(() => download(url, retries - 1).then(resolve, reject), 2000)
      } else reject(new Error('Timeout'))
    })
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
  if (fr.Motions) Object.values(fr.Motions).forEach(arr => (Array.isArray(arr)?arr:[]).forEach(m => { const f = m.File||m.file; if(f) refs.add(new URL(f,baseUrl).href) }))
  if (fr.Physics) refs.add(new URL(fr.Physics, baseUrl).href)
  if (fr.Pose) refs.add(new URL(fr.Pose, baseUrl).href)
  if (fr.Expressions) (Array.isArray(fr.Expressions)?fr.Expressions:[]).forEach(e => { const f=e.File||e.file; if(f) refs.add(new URL(f,baseUrl).href) })
  if (json.motions) Object.values(json.motions).forEach(arr => (Array.isArray(arr)?arr:[]).forEach(m => { const f=m.file||m.File; if(f) refs.add(new URL(f,baseUrl).href) }))
  if (json.physics) refs.add(new URL(json.physics, baseUrl).href)
  if (json.pose) refs.add(new URL(json.pose, baseUrl).href)
  if (json.expressions) (Array.isArray(json.expressions)?json.expressions:[]).forEach(e => { const f=e.file||e.File; if(f) refs.add(new URL(f,baseUrl).href) })
  return [...refs]
}

async function main() {
  let totalOk = 0, totalFail = 0

  for (const model of MODELS) {
    const modelDir = path.join(OUT_DIR, model.key)
    const jsonLocal = path.join(modelDir, model.jsonFile)
    if (!fs.existsSync(jsonLocal)) { console.log(`SKIP ${model.key} - no JSON`); continue }

    const json = JSON.parse(fs.readFileSync(jsonLocal, 'utf-8'))
    const refs = extractRefs(json, model.baseUrl)

    const missing = []
    for (const url of refs) {
      const rel = decodeURIComponent(url.replace(model.baseUrl, ''))
      const local = path.join(modelDir, ...rel.split('/'))
      if (!fs.existsSync(local)) missing.push({ url, local })
    }

    if (missing.length === 0) { console.log(`${model.key}: all files present`); continue }
    console.log(`${model.key}: downloading ${missing.length} missing files...`)

    for (const { url, local } of missing) {
      try {
        const dir = path.dirname(local)
        fs.mkdirSync(dir, { recursive: true })
        const buf = await download(url)
        fs.writeFileSync(local, buf)
        totalOk++
        process.stdout.write(`  ${path.basename(local)} OK (${(buf.length/1024).toFixed(0)}KB)\n`)
      } catch (e) {
        totalFail++
        console.log(`  ${path.basename(local)} FAIL: ${e.message}`)
      }
    }
  }

  console.log(`\nDone: ${totalOk} ok, ${totalFail} failed`)
}

main().catch(console.error)
