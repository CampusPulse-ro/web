/**
 * Downloads the API's committed contract (api repo, main) into src/api/openapi.json, byte for
 * byte. `bun run api:types` runs this and then generates src/api/schema.d.ts from the local
 * copy, so builds never depend on the network and a contract change shows up as a diff here.
 */
const url = 'https://raw.githubusercontent.com/CampusPulse-ro/api/main/openapi/v1.json'
const response = await fetch(url)
if (!response.ok) throw new Error(`GET ${url}: HTTP ${response.status}`)
const text = await response.text()
JSON.parse(text) // refuse anything that isn't JSON before overwriting the copy
await Bun.write('src/api/openapi.json', text)
console.log(`src/api/openapi.json <- ${url}`)
