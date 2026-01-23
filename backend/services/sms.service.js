// Service d'envoi de SMS via SMS8.io
import { getSupabaseAdmin } from '../supabase/client.js';

class SMSService {
  constructor() {
    this.apiKey = process.env.SMS8_API_KEY;
    this.deviceId = process.env.SMS8_DEVICE_ID || 0; // 0 = use primary device
    this.senderPhone = process.env.SMS8_SENDER_PHONE;
    this.enabled = process.env.SMS_ENABLED === 'true';
    this.apiUrl = 'https://app.sms8.io/services/send.php';
  }

  /**
   * Formater le numéro de téléphone au format international
   */
  formatPhoneNumber(phone) {
    if (!phone) return null;
    
    // Nettoyer le numéro
    let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
    
    // Si commence par +, c'est bon
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    
    // Si commence par 00, remplacer par +
    if (cleaned.startsWith('00')) {
      return '+' + cleaned.substring(2);
    }
    
    // Si commence par 0 (numéro local Côte d'Ivoire), ajouter +225
    if (cleaned.startsWith('0')) {
      return '+225' + cleaned.substring(1);
    }
    
    // Si ne commence pas par +, ajouter +225 (par défaut Côte d'Ivoire)
    if (!cleaned.startsWith('+')) {
      return '+225' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Valider un numéro de téléphone
   */
  isValidPhoneNumber(phone) {
    const formatted = this.formatPhoneNumber(phone);
    if (!formatted) return false;
    
    // Vérifier format international (+ suivi de 10-15 chiffres)
    const phoneRegex = /^\+[1-9]\d{9,14}$/;
    return phoneRegex.test(formatted);
  }

  /**
   * Remplacer les variables dans un template
   */
  replaceVariables(template, data) {
    let message = template;
    
    const variables = {
      client: data.client?.nom || data.clientNom || 'Client',
      numero: data.numero_commande || data.numeroCommande || '',
      modele: data.modele?.nom || data.modeleName || '',
      taille: data.taille || '',
      couleur: data.couleur || '',
      telephone: data.client?.contact || data.clientPhone || '',
      ville: data.client?.ville || data.clientVille || '',
      prix: data.prix || ''
    };

    // Remplacer toutes les variables {variable}
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`\\{${key}\\}`, 'gi');
      message = message.replace(regex, variables[key]);
    });

    return message;
  }

  /**
   * Envoyer un SMS via SMS8.io
   */
  async sendSMS(phone, message) {
    try {
      // Vérifier la configuration
      if (!this.apiKey) {
        throw new Error('Configuration SMS8.io manquante (API_KEY)');
      }

      const formattedPhone = this.formatPhoneNumber(phone);
      
      if (!this.isValidPhoneNumber(formattedPhone)) {
        throw new Error(`Numéro de téléphone invalide: ${phone}`);
      }

      // Si mode test (SMS désactivé)
      if (!this.enabled) {
        console.log('📱 [SMS TEST MODE]');
        console.log(`   To: ${formattedPhone}`);
        console.log(`   Message: ${message}`);
        return {
          success: true,
          test_mode: true,
          phone: formattedPhone,
          message: message,
          message_id: `test_${Date.now()}`
        };
      }

      // Envoi réel via SMS8.io
      console.log(`📱 Envoi SMS à ${formattedPhone}...`);

      // Utiliser URLSearchParams pour format application/x-www-form-urlencoded
      const params = new URLSearchParams();
      params.append('key', this.apiKey);
      params.append('number', formattedPhone);
      params.append('message', message);
      params.append('devices', this.deviceId || 0); // 0 = appareil principal

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMsg = result.error?.message || result.error || `Erreur HTTP ${response.status}`;
        throw new Error(errorMsg);
      }

      console.log(`✅ SMS envoyé avec succès à ${formattedPhone}`);
      
      // SMS8.io retourne: {success: true, data: {messages: [...]}}
      const messageData = result.data?.messages?.[0] || {};
      
      return {
        success: true,
        test_mode: false,
        phone: formattedPhone,
        message: message,
        message_id: messageData.ID || messageData.id || `msg_${Date.now()}`,
        response: result.data
      };

    } catch (error) {
      console.error('❌ Erreur envoi SMS:', error.message);
      throw error;
    }
  }

  /**
   * Récupérer un template SMS depuis la base de données
   */
  async getTemplate(code) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('sms_templates')
        .select('*')
        .eq('code', code)
        .eq('actif', true)
        .single();

      if (error) throw error;
      if (!data) throw new Error(`Template SMS introuvable: ${code}`);

      return data;
    } catch (error) {
      console.error(`Erreur récupération template ${code}:`, error.message);
      throw error;
    }
  }

  /**
   * Enregistrer un SMS dans l'historique
   */
  async logSMS(data) {
    try {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase
        .from('sms_historique')
        .insert({
          commande_id: data.commandeId,
          numero_commande: data.numeroCommande,
          destinataire_nom: data.destinataireNom,
          destinataire_telephone: data.destinataireTelephone,
          message: data.message,
          template_code: data.templateCode,
          statut: data.statut || 'envoye',
          response_api: data.responseApi || null,
          message_id: data.messageId || null,
          erreur: data.erreur || null,
          envoye_par: data.envoyePar || null,
          est_test: data.estTest || false,
          sent_at: data.statut === 'envoye' ? new Date().toISOString() : null
        });

      if (error) {
        console.error('Erreur log SMS:', error);
      }
    } catch (error) {
      console.error('Erreur log SMS:', error);
      // Ne pas bloquer l'envoi si le log échoue
    }
  }

  /**
   * Envoyer un SMS de notification de commande
   * @param {string} templateCode - Code du template ('commande_validee', 'en_couture', etc.)
   * @param {object} commande - Données de la commande
   * @param {string} userId - ID de l'utilisateur qui déclenche l'envoi
   */
  async sendCommandeNotification(templateCode, commande, userId = null) {
    try {
      // Récupérer le template
      const template = await this.getTemplate(templateCode);

      // Générer le message avec les variables
      const message = this.replaceVariables(template.message, commande);

      // Récupérer le numéro de téléphone
      const phone = commande.client?.contact || commande.clientPhone;
      
      if (!phone) {
        throw new Error('Numéro de téléphone client manquant');
      }

      // Envoyer le SMS
      const result = await this.sendSMS(phone, message);

      // Logger dans l'historique
      await this.logSMS({
        commandeId: commande.id,
        numeroCommande: commande.numero_commande || commande.numeroCommande,
        destinataireNom: commande.client?.nom || commande.clientNom || 'Client',
        destinataireTelephone: this.formatPhoneNumber(phone),
        message: message,
        templateCode: templateCode,
        statut: result.success ? 'envoye' : 'echoue',
        responseApi: result.response || null,
        messageId: result.message_id,
        envoyePar: userId,
        estTest: result.test_mode || false
      });

      return result;

    } catch (error) {
      // Logger l'échec
      await this.logSMS({
        commandeId: commande.id,
        numeroCommande: commande.numero_commande || commande.numeroCommande,
        destinataireNom: commande.client?.nom || 'Client',
        destinataireTelephone: commande.client?.contact || commande.clientPhone || '',
        message: '',
        templateCode: templateCode,
        statut: 'echoue',
        erreur: error.message,
        envoyePar: userId,
        estTest: !this.enabled
      });

      throw error;
    }
  }

  /**
   * Vérifier si l'envoi automatique est activé pour un type de notification
   */
  async isAutoSendEnabled(templateCode) {
    try {
      const supabase = getSupabaseAdmin();
      const configKey = `auto_send_${templateCode}`;
      const { data } = await supabase
        .from('sms_config')
        .select('valeur')
        .eq('cle', configKey)
        .single();

      return data?.valeur === 'true';
    } catch (error) {
      // Par défaut, activé
      return true;
    }
  }

  /**
   * Obtenir le statut global du système SMS
   */
  async getSystemStatus() {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('sms_config')
      .select('*');

    const config = {};
    if (data) {
      data.forEach(item => {
        config[item.cle] = item.valeur;
      });
    }

    return {
      enabled: this.enabled,
      configured: !!this.apiKey,
      apiKey: this.apiKey ? `${this.apiKey.substring(0, 10)}...` : null,
      deviceId: this.deviceId || '0 (Primary device)',
      senderPhone: this.senderPhone,
      config: config
    };
  }
}

// Export singleton
const smsService = new SMSService();
export default smsService;



