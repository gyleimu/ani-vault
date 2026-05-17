const https = require('https')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const NODE_VERSION = 'v22.14.0'
const PLATFORM = process.platform === 'win32' ? 'win' : process.platform
const ARCH = process.arch === 'x64' ? 'x64' : 'arm64'
const RESOURCES_DIR = path.join(__dirname, '..', 'src-tauri', 'resources', 'node')
const NODE_EXE = path.join(RESOURCES_DIR, 'node.exe')

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const get = (u, redirects = 0) => {
      if (redirects > 5) return reject(new Error('重定向次数过多'))
      https.get(u, { timeout: 60000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location, redirects + 1)
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`))
        const chunks = []
        let received = 0
        const total = parseInt(res.headers['content-length'] || '0', 10)
        res.on('data', (chunk) => {
          chunks.push(chunk)
          received += chunk.length
          if (total > 0) {
            const pct = Math.round(received / total * 100)
            process.stdout.write(`\r  下载进度: ${pct}% (${(received / 1024 / 1024).toFixed(1)}MB)`)
          }
        })
        res.on('end', () => {
          if (total > 0) console.log('')
          resolve(Buffer.concat(chunks))
        })
        res.on('error', reject)
      }).on('error', reject)
    }
    get(url)
  })
}

async function main() {
  if (fs.existsSync(NODE_EXE) && fs.statSync(NODE_EXE).size > 1000000) {
    const sizeMB = (fs.statSync(NODE_EXE).size / 1024 / 1024).toFixed(1)
    console.log(`[download-node] 已存在 node.exe (${sizeMB}MB)，跳过下载`)
    return
  }

  if (PLATFORM !== 'win') {
    console.error('[download-node] 当前脚本仅支持 Windows，请手动安装 Node.js')
    process.exit(1)
  }

  const url = `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-${PLATFORM}-${ARCH}.zip`
  console.log(`[download-node] 下载 Node.js ${NODE_VERSION}...`)
  console.log(`[download-node] URL: ${url}`)

  const data = await downloadFile(url)
  console.log(`[download-node] 下载完成 (${(data.length / 1024 / 1024).toFixed(1)}MB)`)

  fs.mkdirSync(RESOURCES_DIR, { recursive: true })

  const tmpDir = path.join(RESOURCES_DIR, '_tmp')
  fs.mkdirSync(tmpDir, { recursive: true })

  const zipPath = path.join(tmpDir, 'node.zip')
  fs.writeFileSync(zipPath, data)
  console.log('[download-node] 解压中...')

  try {
    execSync(
      `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${tmpDir}' -Force"`,
      { stdio: 'pipe' }
    )
  } catch (e) {
    console.error('[download-node] 解压失败:', e.message)
    process.exit(1)
  }

  const extractedDir = path.join(tmpDir, `node-${NODE_VERSION}-${PLATFORM}-${ARCH}`)
  const srcNode = path.join(extractedDir, 'node.exe')
  if (!fs.existsSync(srcNode)) {
    console.error('[download-node] 解压后未找到 node.exe')
    process.exit(1)
  }

  fs.copyFileSync(srcNode, NODE_EXE)
  fs.rmSync(tmpDir, { recursive: true, force: true })

  const sizeMB = (fs.statSync(NODE_EXE).size / 1024 / 1024).toFixed(1)
  console.log(`[download-node] 完成! node.exe (${sizeMB}MB) 已放入 ${RESOURCES_DIR}`)
}

main().catch(e => {
  console.error('[download-node] 失败:', e.message)
  process.exit(1)
})
