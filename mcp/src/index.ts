#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createServer } from './server.js'

async function main(): Promise<void> {
  const server = createServer()
  const transport = new StdioServerTransport()

  await server.connect(transport)

  // Keep process alive — MCP servers run until the client disconnects
  process.on('SIGINT', async () => {
    await server.close()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    await server.close()
    process.exit(0)
  })
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  process.stderr.write(`specrails-hub-mcp: fatal error: ${message}\n`)
  process.exit(1)
})
