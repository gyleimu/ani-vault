const https = require('https')
const fs = require('fs')
const path = require('path')

const MODELS = [
  {
    key: 'shizuku',
    baseUrl: 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/',
    jsonFile: 'shizuku.model.json'
  },
  {
    key: 'haru',
    baseUrl: 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/',
    jsonFile: 'haru_greeter_t03.model3.json'
  },
  {
    key: 'yiselin',
    baseUrl: 'https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B4%A9%E5%9D%8F%E5%AD%A6%E5%9B%AD2/yiselin/',
    jsonFile: 'model.json'
  },
  {
    key: 'kp31',
    baseUrl: 'https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B0%91%E5%A5%B3%E5%89%8D%E7%BA%BF%20girls%20Frontline/live2dold/old/kp31/normal/',
    jsonFile: 'model.json'
  },
  {
    key: 'himeko',
    baseUrl: 'https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B4%A9%E5%9D%8F%E5%AD%A6%E5%9B%AD2/himeko/',
    jsonFile: 'model.json'
  },
  {
    key: 'bronya',
    baseUrl: 'https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B4%A9%E5%9D%8F%E5%AD%A6%E5%9B%AD2/bronya/',
    jsonFile: 'model.json'
  }
]

const OUT_DIR = path.join(__dirname, '..', 'public', 'live2d-models')

function download(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location).then(resolve, reject)
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(Buffer.concat(chunks))
        } else {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`))
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${url}`)) })
  })
}

function extractRefs(json, baseUrl) {
  const refs = new Set()

  if (json.model) refs.add(new URL(json.model, baseUrl).href)

  if (Array.isArray(json.textures)) {
    json.textures.forEach(t => refs.add(new URL(t, baseUrl).href))
  }

  const fr = json.FileReferences || {}
  if (fr.Moc) refs.add(new URL(fr.Moc, baseUrl).href)
  if (fr.DisplayInfo) refs.add(new URL(fr.DisplayInfo, baseUrl).href)
  if (fr.Textures) fr.Textures.forEach(t => refs.add(new URL(t, baseUrl).href))
  if (fr.Motions) {
    Object.values(fr.Motions).forEach(arr => {
      (Array.isArray(arr) ? arr : []).forEach(m => {
        const f = m.File || m.file
        if (f) refs.add(new URL(f, baseUrl).href)
      })
    })
  }
  if (fr.Physics) refs.add(new URL(fr.Physics, baseUrl).href)
  if (fr.Pose) refs.add(new URL(fr.Pose, baseUrl).href)
  if (fr.Expressions) {
    (Array.isArray(fr.Expressions) ? fr.Expressions : []).forEach(e => {
      const f = e.File || e.file
      if (f) refs.add(new URL(f, baseUrl).href)
    })
  }

  if (json.motions) {
    Object.values(json.motions).forEach(arr => {
      (Array.isArray(arr) ? arr : []).forEach(m => {
        const f = m.file || m.File
        if (f) refs.add(new URL(f, baseUrl).href)
      })
    })
  }
  if (json.physics) refs.add(new URL(json.physics, baseUrl).href)
  if (json.pose) refs.add(new URL(json.pose, baseUrl).href)
  if (json.expressions) {
    (Array.isArray(json.expressions) ? json.expressions : []).forEach(e => {
      const f = e.file || e.File
      if (f) refs.add(new URL(f, baseUrl).href)
    })
  }

  return [...refs]
}

function urlToLocal(url, baseUrl, modelDir) {
  const rel = decodeURIComponent(url.replace(baseUrl, ''))
  return path.join(modelDir, ...rel.split('/'))
}

async function downloadFile(url, localPath) {
  if (fs.existsSync(localPath)) return true
  const dir = path.dirname(localPath)
  fs.mkdirSync(dir, { recursive: true })
  try {
    const buf = await download(url)
    fs.writeFileSync(localPath, buf)
    return true
  } catch (e) {
    console.error(`  FAIL: ${path.basename(localPath)} - ${e.message}`)
    return false
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  let totalOk = 0
  let totalFail = 0

  for (const model of MODELS) {
    console.log(`\n=== ${model.key} ===`)
    const modelDir = path.join(OUT_DIR, model.key)
    const jsonUrl = model.baseUrl + model.jsonFile
    const jsonLocal = path.join(modelDir, model.jsonFile)

    console.log(`  Downloading ${model.jsonFile}...`)
    const ok = await downloadFile(jsonUrl, jsonLocal)
    if (!ok) { console.error(`  SKIP ${model.key} - JSON download failed`); totalFail++; continue }

    const json = JSON.parse(fs.readFileSync(jsonLocal, 'utf-8'))

    fs.writeFileSync(jsonLocal, JSON.stringify(json, null, 2))

    const refs = extractRefs(json, model.baseUrl)
    console.log(`  Found ${refs.length} resource files`)

    let okCount = 0
    let failCount = 0

    for (let i = 0; i < refs.length; i += 6) {
      const batch = refs.slice(i, i + 6)
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const local = urlToLocal(url, model.baseUrl, modelDir)
          const success = await downloadFile(url, local)
          return { url, success }
        })
      )
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value.success) okCount++
        else failCount++
      })
      process.stdout.write(`  Progress: ${okCount + failCount}/${refs.length}\r`)
    }

    console.log(`  Done: ${okCount} ok, ${failCount} failed`)
    totalOk += okCount + 1
    totalFail += failCount
  }

  console.log(`\n=== COMPLETE ===`)
  console.log(`Total: ${totalOk} downloaded, ${totalFail} failed`)
  console.log(`Output: ${OUT_DIR}`)
}

main().catch(console.error)
