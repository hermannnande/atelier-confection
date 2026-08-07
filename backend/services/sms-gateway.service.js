import smsEnvoieAdapter from './smsenvoie.adapter.js';

export const SMS_GATEWAY_SKIP_REASONS = Object.freeze({
  DISABLED: 'CUSTOMER_SMS_DISABLED',
  PROVIDER_PENDING: 'SMS_PROVIDER_PENDING',
  PROVIDER_UNSUPPORTED: 'SMS_PROVIDER_UNSUPPORTED',
  PROVIDER_NOT_CONFIGURED: 'SMS_PROVIDER_NOT_CONFIGURED',
});

/**
 * Point d'integration unique du futur fournisseur SMS NousUnique.
 *
 * Les fournisseurs restent isolés derrière un adaptateur. L'activation réelle
 * dépend toujours des variables privées du déploiement.
 */
export class SmsGatewayService {
  constructor(options = {}) {
    this.adapters = new Map(Object.entries(options.adapters || {}));
  }

  getConfiguration(env = process.env) {
    const provider = String(env.CUSTOMER_SMS_PROVIDER || '').trim().toLowerCase();
    const enabled = env.CUSTOMER_SMS_ENABLED === 'true';
    const adapter = provider ? this.adapters.get(provider) : null;
    const configured = Boolean(adapter?.isConfigured?.(env));
    const publicConfiguration = adapter?.getPublicConfiguration?.(env) || {};

    return {
      channel: 'sms',
      enabled,
      provider: provider || null,
      providerSelected: Boolean(provider),
      providerSupported: Boolean(adapter),
      configured,
      ready: enabled && configured,
      awaitingProvider: !provider || !adapter || !configured,
      ...publicConfiguration,
    };
  }

  async sendMessage(payload, options = {}) {
    const env = options.env || process.env;
    const configuration = options.configuration || this.getConfiguration(env);

    if (!configuration.enabled) {
      return { success: true, skipped: true, reason: SMS_GATEWAY_SKIP_REASONS.DISABLED };
    }
    if (!configuration.providerSelected) {
      return { success: true, skipped: true, reason: SMS_GATEWAY_SKIP_REASONS.PROVIDER_PENDING };
    }

    const adapter = this.adapters.get(configuration.provider);
    if (!adapter) {
      return { success: true, skipped: true, reason: SMS_GATEWAY_SKIP_REASONS.PROVIDER_UNSUPPORTED };
    }
    if (!configuration.configured) {
      return { success: true, skipped: true, reason: SMS_GATEWAY_SKIP_REASONS.PROVIDER_NOT_CONFIGURED };
    }

    return adapter.sendMessage(payload, { ...options, env });
  }
}

const smsGatewayService = new SmsGatewayService({
  adapters: {
    smsenvoie: smsEnvoieAdapter,
  },
});
export default smsGatewayService;
