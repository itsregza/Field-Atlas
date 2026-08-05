/**
 * Start the Field Atlas API without requiring `uv` on PATH.
 * Prefers apps/api/.venv, otherwise falls back to ~/.local/bin/uv.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const apiDir = path.join(root, 'apps', 'api')
const isWin = process.platform === 'win32'

const venvPython = path.join(
  apiDir,
  '.venv',
  isWin ? 'Scripts/python.exe' : 'bin/python',
)

const uvPath = path.join(
  os.homedir(),
  '.local',
  'bin',
  isWin ? 'uv.exe' : 'uv',
)

function run(command, args, extraPath) {
  const env = { ...process.env }
  if (extraPath) {
    env.Path = `${extraPath}${path.delimiter}${env.Path || ''}`
    env.PATH = `${extraPath}${path.delimiter}${env.PATH || ''}`
  }
  const child = spawn(command, args, {
    cwd: apiDir,
    env,
    stdio: 'inherit',
    shell: false,
  })
  child.on('exit', (code) => process.exit(code ?? 1))
  child.on('error', (err) => {
    console.error(err.message)
    process.exit(1)
  })
}

const uvicornArgs = [
  'uvicorn',
  'app.main:app',
  '--reload',
  '--host',
  '127.0.0.1',
  '--port',
  '8787',
]

if (fs.existsSync(venvPython)) {
  run(venvPython, ['-m', ...uvicornArgs])
} else if (fs.existsSync(uvPath)) {
  run(uvPath, ['run', ...uvicornArgs], path.dirname(uvPath))
} else {
  console.error(
    'API runtime not found. On this PC run once:\n' +
      '  irm https://astral.sh/uv/install.ps1 | iex\n' +
      '  $env:Path = "$env:USERPROFILE\\.local\\bin;$env:Path"\n' +
      '  cd apps/api; uv sync\n' +
      'Then: npm run dev:api',
  )
  process.exit(1)
}
