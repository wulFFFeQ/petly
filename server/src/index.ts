import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import { loadEnv } from './env.js'
import { corsOrigin } from './http.js'
import { registerAuthRoutes } from './routes/auth.js'
import { registerPetsRoutes } from './routes/pets.js'
import { registerAccessRoutes } from './routes/access.js'
import { registerClinicalRoutes } from './routes/clinical.js'
import { registerDocumentsRoutes } from './routes/documents.js'
import { registerMessagingRoutes } from './routes/messaging.js'
import { registerBookingsRoutes } from './routes/bookings.js'
import { registerNotificationsRoutes } from './routes/notifications.js'
import { registerPublicRoutes } from './routes/public.js'

async function main() {
  const env = loadEnv()
  const app = Fastify({ logger: true, trustProxy: true })

  if (env.cookieSecureForcedOff) {
    app.log.warn(
      'COOKIE_SECURE=false while NODE_ENV=production — session cookies will not be Secure. Prefer HTTPS + COOKIE_SECURE=true.',
    )
  }

  await app.register(cookie)
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (env.allowedOrigins.includes(origin)) return cb(null, true)
      return cb(null, false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: [
      'content-type',
      'x-correlation-id',
      'x-idempotency-key',
    ],
  })

  app.addHook('onRequest', async (request, reply) => {
    reply.header('Vary', 'Origin')
    reply.header('Access-Control-Allow-Credentials', 'true')
    reply.header('Access-Control-Allow-Origin', corsOrigin(env, request))
  })

  app.get('/health', async () => ({
    ok: true,
    databaseConfigured: env.databaseConfigured,
    sessionConfigured: env.sessionConfigured,
    storageConfigured: env.storageConfigured,
    malwareScanConfigured: env.malwareScanConfigured,
  }))

  registerAuthRoutes(app, env)
  registerPetsRoutes(app, env)
  registerAccessRoutes(app, env)
  registerClinicalRoutes(app, env)
  registerDocumentsRoutes(app, env)
  registerMessagingRoutes(app, env)
  registerBookingsRoutes(app, env)
  registerNotificationsRoutes(app, env)
  registerPublicRoutes(app, env)

  const port = env.PORT
  await app.listen({ port, host: '0.0.0.0' })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
