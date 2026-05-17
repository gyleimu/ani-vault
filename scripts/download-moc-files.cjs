const https = require('https')
const fs = require('fs')
const path = require('path')

const PROXY = 'https://gh-proxy.com/'
const OUT_DIR = path.join(__dirname, '..', 'public', 'live2d-models')

const MISSING_FILES = [
  {
    key: 'shizuku',
    files: [
      { name: 'shizuku.moc', jsdUrl: 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.moc', rawUrl: 'https://raw.githubusercontent.com/guansss/pixi-live2d-display/v0.4.0/test/assets/shizuku/shizuku.moc' }
    ]
  },
  {
    key: 'haru',
    files: [
      { name: 'haru_greeter_t03.moc3', jsdUrl: 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.moc3', rawUrl: 'https://raw.githubusercontent.com/guansss/pixi-live2d-display/v0.4.0/test/assets/haru/haru_greeter_t03.moc3' },
      { name: 'haru_greeter_t03.cdi3.json', jsdUrl: 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.cdi3.json', rawUrl: 'https://raw.githubusercontent.com/guansss/pixi-live2d-display/v0.4.0/test/assets/haru/haru_greeter_t03.cdi3.json' }
    ]
  },
  {
    key: 'yiselin',
    files: [
      { name: 'model.moc', jsdUrl: 'https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B4%A9%E5%9D%8F%E5%AD%A6%E5%9B%AD2/yiselin/model.moc', rawUrl: 'https://raw.githubusercontent.com/Eikanya/Live2d-model/main/\u5d29\u574f\u5b66\u56ed2/yiselin/model.moc' }
    ]
  },
  {
    key: 'kp31',
    files: [
      { name: 'model.moc', jsdUrl: 'https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B0%91%E5%A5%B3%E5%89%8D%E7%BA%BF%20girls%20Frontline/live2dold/old/kp31/normal/model.moc', rawUrl: 'https://raw.githubusercontent.com/Eikanya/Live2d-model/main/\u5c11\u5973\u524d\u7ebf girls Frontline/live2dold/old/kp31/normal/model.moc' }
    ]
  },
  {
    key: 'himeko',
    files: [
      { name: 'model.moc', jsdUrl: 'https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B4%A9%E5%9D%8F%E5%AD%A6%E5%9B%AD2/himeko/model.moc', rawUrl: 'https://raw.githubusercontent.com/Eikanya/Live2d-model/main/\u5d29\u574f\u5b66\u56ed2/himeko/model.moc' }
    ]
  },
  {
    key: 'bronya',
    files: [
      { name: 'bronya.moc', jsdUrl: 'https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B4%A9%E5%9D%8F%E5%AD%A6%E5%9B%AD2/bronya/bronya.moc', rawUrl: 'https://raw.githubusercontent.com/Eikanya/Live2d-model/main/\u5d29\u574f\u5b66\u56ed2/bronya/bronya.moc' }
    ]
  }
]

function fetchUrl(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout }, (res) => {
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

async function downloadWithFallback(jsdUrl, rawUrl, localPath) {
  const dir = path.dirname(localPath)
  fs.mkdirSync(dir, { recursive: true })

  try {
    console.log(`  Trying jsdelivr: ${path.basename(localPath)}...`)
    const buf = await fetchUrl(jsdUrl)
    if (buf.length > 100) {
      fs.writeFileSync(localPath, buf)
      console.log(`  OK (jsdelivr): ${path.basename(localPath)} (${(buf.length/1024).toFixed(0)}KB)`)
      return true
    }
  } catch (e) {
    console.log(`  jsdelivr failed: ${e.message}`)
  }

  try {
    const proxyUrl = PROXY + rawUrl
    console.log(`  Trying gh-proxy: ${path.basename(localPath)}...`)
    const buf = await fetchUrl(proxyUrl, 40000)
    if (buf.length > 100) {
      fs.writeFileSync(localPath, buf)
      console.log(`  OK (gh-proxy): ${path.basename(localPath)} (${(buf.length/1024).toFixed(0)}KB)`)
      return true
    }
  } catch (e) {
    console.log(`  gh-proxy failed: ${e.message}`)
  }

  return false
}

async function main() {
  let totalOk = 0, totalFail = 0

  for (const model of MISSING_FILES) {
    console.log(`\n=== ${model.key} ===`)
    const modelDir = path.join(OUT_DIR, model.key)

    for (const file of model.files) {
      const localPath = path.join(modelDir, file.name)
      if (fs.existsSync(localPath) && fs.statSync(localPath).size > 100) {
        console.log(`  Already exists: ${file.name}`)
        totalOk++
        continue
      }

      const ok = await downloadWithFallback(file.jsdUrl, file.rawUrl, localPath)
      if (ok) totalOk++
      else { totalFail++; console.error(`  FAIL: ${file.name}`) }
    }
  }

  console.log(`\n=== COMPLETE ===`)
  console.log(`Downloaded: ${totalOk}, Failed: ${totalFail}`)
}

main().catch(console.error)
