export async function invoke(cmd, args = {}) {
  if (cmd === 'decrypt_text') return args.text
  if (cmd === 'fetch_url') return '{}'
  return null
}
