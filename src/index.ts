import cloneDeep from 'lodash/cloneDeep.js'

export type SendSmsThroughProvider = (props: { to: string; text: string }) => Promise<{
  originalResponse?: any
  loggableResponse: { status: number; statusText: string; data: any }
}>
type SendSmsProps = {
  to: string | { phone: string }
  text: string
  sensetiveStrings?: string[]
}
type SentSmsLog = Omit<SendSmsProps, 'to'> & {
  to: string
}
type SendSms = (props: SendSmsProps) => Promise<{ ok: boolean }>

export const createSmsThings = ({
  sendSmsThroughProvider,
  logger = console,
  mock,
}: {
  sendSmsThroughProvider: SendSmsThroughProvider
  logger?: { error: (...props: any[]) => any; info: (...props: any[]) => any }
  mock?: boolean
}) => {
  const sentSmses: SentSmsLog[] = []

  const getLastSentSms = () => {
    if (!sentSmses.length) {
      return undefined
    }
    return sentSmses[sentSmses.length - 1]
  }

  const getLastSentSmsCode = () => {
    const lastSentSms = getLastSentSms()
    if (!lastSentSms) {
      return null
    }
    const digits = lastSentSms.text.match(/\d/g)?.join('')
    return digits
  }

  const clearSentSmses = () => {
    sentSmses.splice(0, sentSmses.length)
  }

  const getSentSmses = () => {
    return cloneDeep(sentSmses)
  }

  const sendSms: SendSms = async ({ to, text, sensetiveStrings }) => {
    const loggableText =
      sensetiveStrings && !mock ? text.replace(new RegExp(sensetiveStrings.join('|'), 'g'), 'X') : text
    try {
      to = typeof to === 'string' ? to : to.phone
      const result = await (async () => {
        if (!mock) {
          return await sendSmsThroughProvider({ to, text })
        } else {
          sentSmses.push({ to, text })
          return { loggableResponse: { status: 200, statusText: 'OK', data: 'Mocked sms sent' } }
        }
      })()
      logger.info({
        tag: 'sms',
        message: 'Sending sms',
        meta: {
          name,
          to,
          text: loggableText,
          response: result.loggableResponse,
        },
      })
      return { ok: true }
    } catch (error) {
      logger.error({
        tag: 'sms',
        error,
        meta: {
          to,
          text: loggableText,
        },
      })
      return { ok: false }
    }
  }

  return {
    sendSms,
    getSentSmses,
    getLastSentSms,
    getLastSentSmsCode,
    clearSentSmses,
  }
}
