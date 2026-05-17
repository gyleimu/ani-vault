const { execSync } = require('child_process')
const path = require('path')

const engineDir = __dirname
console.log('[csp-engine] 安装依赖...')
try {
  execSync('npm install', { cwd: engineDir, stdio: 'inherit' })
  console.log('[csp-engine] 依赖安装完成')
} catch (e) {
  console.error('[csp-engine] 依赖安装失败:', e.message)
  process.exit(1)
}
