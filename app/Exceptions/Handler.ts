/*
|--------------------------------------------------------------------------
| Http Exception Handler
|--------------------------------------------------------------------------
|
| AdonisJs will forward all exceptions occurred during an HTTP request to
| the following class. You can learn more about exception handling by
| reading docs.
|
| The exception handler extends a base `HttpExceptionHandler` which is not
| mandatory, however it can do lot of heavy lifting to handle the errors
| properly.
|
*/

import Logger from '@ioc:Adonis/Core/Logger'
import HttpExceptionHandler from '@ioc:Adonis/Core/HttpExceptionHandler'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import DiscordLogger from '@ioc:Logger/Discord'

export default class ExceptionHandler extends HttpExceptionHandler {
  protected disableStatusPagesInDevelopment = true

  protected statusPages = {
    '403': 'errors/unauthorized',
    '404': 'errors/not-found',
    '500..599': 'errors/server-error',
  }

  constructor () {
    super(Logger)
  }

  public async handle(error: any, ctx: HttpContextContract) {
    if (error.code === 'E_VALIDATION_FAILURE') {
      await super.handle(error, ctx)
      
      ctx.up.setTarget(ctx.up.getFailTarget())
      ctx.up.setStatus(400)
      
      return ctx.response.redirect().back()
    }

    if (!error.status || this.expandedStatusPages[error.status]) {
      ctx.up.fullReload()
    }

    return super.handle(error, ctx)
  }

  public async report(error: any, ctx: HttpContextContract) {
    if (!this.shouldReport(error)) {
      return
    }

    ctx.logger.error(error.message)

    if (error.code === 'E_HONEYPOT_FAILURE' && ctx.request.url() === '/contact') return
    if (error.code === 'E_CANNOT_READ_FILE' && ctx.request.url() === '/img/178/VSCode_1614756076826.png') return
    if (error.code === 'E_BAD_CSRF_TOKEN') return
    
    await DiscordLogger.error(error.message, {
      method: ctx.request.method,
      url: ctx.request.url(true)
    })
  }
}
