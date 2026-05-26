import axios from "axios";
import { prisma } from "../db";

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0; // Timestamp in milliseconds

/**
 * Récupère un Token d'accès OAuth2 auprès de Microsoft Identity Platform (flux Client Credentials).
 * Utilise un cache en mémoire pour éviter d'interroger Microsoft à chaque requête.
 */
async function getAccessToken(): Promise<string | null> {
  const tenantId = process.env.OUTLOOK_TENANT_ID;
  const clientId = process.env.OUTLOOK_CLIENT_ID;
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    // Si les clés de configuration ne sont pas définies, le service est désactivé silencieusement.
    return null;
  }

  // Vérifie si le token en cache est toujours valide (marge de sécurité de 60 secondes)
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  try {
    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("scope", "https://graph.microsoft.com/.default");
    params.append("client_secret", clientSecret);
    params.append("grant_type", "client_credentials");

    const response = await axios.post(url, params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const { access_token, expires_in } = response.data;
    cachedToken = access_token;
    tokenExpiresAt = Date.now() + expires_in * 1000;

    console.log("🔑 Nouveau Token Microsoft Graph généré avec succès.");
    return access_token;
  } catch (error: any) {
    console.error(
      "❌ Erreur lors de la récupération du token Microsoft Graph :",
      error.response?.data || error.message
    );
    return null;
  }
}

/**
 * Formate le corps HTML de l'événement Outlook avec toutes les informations utiles.
 */
function buildEventBody(intervention: any): string {
  const client = intervention.client;
  const techName = intervention.technicienNom || "Non assigné";
  const desc = intervention.description || "Aucune description fournie.";
  const type = intervention.type || "SAV";
  
  return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333;">
      <h2 style="color: #0078d4; margin-bottom: 5px;">🔧 Détails de l'intervention</h2>
      <hr style="border: 0; border-top: 1px solid #ddd; margin-top: 0; margin-bottom: 15px;" />
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 150px; font-weight: bold; padding: 5px 0;">Numéro :</td>
          <td style="padding: 5px 0;">${intervention.numero}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; padding: 5px 0;">Type :</td>
          <td style="padding: 5px 0;"><span style="background-color: #f3f2f1; padding: 2px 8px; border-radius: 4px; font-weight: 600;">${type}</span></td>
        </tr>
        <tr>
          <td style="font-weight: bold; padding: 5px 0;">Technicien :</td>
          <td style="padding: 5px 0; color: #0078d4; font-weight: bold;">👤 ${techName}</td>
        </tr>
      </table>

      <h3 style="color: #0078d4; margin-top: 20px; margin-bottom: 5px;">🏢 Informations Client</h3>
      <hr style="border: 0; border-top: 1px solid #ddd; margin-top: 0; margin-bottom: 15px;" />
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 150px; font-weight: bold; padding: 5px 0;">Client :</td>
          <td style="padding: 5px 0; font-weight: bold;">${client?.nom || intervention.clientNom || "Inconnu"}</td>
        </tr>
        ${client?.sousLieu ? `
        <tr>
          <td style="font-weight: bold; padding: 5px 0;">Sous-lieu :</td>
          <td style="padding: 5px 0;">${client.sousLieu}</td>
        </tr>` : ""}
        <tr>
          <td style="font-weight: bold; padding: 5px 0;">Adresse :</td>
          <td style="padding: 5px 0;">📍 ${client?.rue || ""}, ${client?.codePostal || ""} ${client?.ville || ""}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; padding: 5px 0;">Contact sur place :</td>
          <td style="padding: 5px 0;">${client?.contact || "Non spécifié"}</td>
        </tr>
        ${client?.telephone ? `
        <tr>
          <td style="font-weight: bold; padding: 5px 0;">Téléphone :</td>
          <td style="padding: 5px 0;"><a href="tel:${client.telephone}">${client.telephone}</a></td>
        </tr>` : ""}
        ${client?.email ? `
        <tr>
          <td style="font-weight: bold; padding: 5px 0;">E-mail :</td>
          <td style="padding: 5px 0;"><a href="mailto:${client.email}">${client.email}</a></td>
        </tr>` : ""}
      </table>

      <h3 style="color: #0078d4; margin-top: 20px; margin-bottom: 5px;">📝 Description de la tâche</h3>
      <hr style="border: 0; border-top: 1px solid #ddd; margin-top: 0; margin-bottom: 15px;" />
      <div style="background-color: #faf9f8; padding: 12px; border-radius: 4px; border-left: 4px solid #0078d4; white-space: pre-wrap;">
        ${desc}
      </div>

      <p style="font-size: 11px; color: #888; margin-top: 30px;">
        Généré automatiquement par TelcoManager V2. Ne pas modifier cet identifiant technique.
      </p>
    </div>
  `;
}

/**
 * Crée un événement dans le calendrier partagé Outlook.
 */
export async function createOutlookEvent(interventionId: string): Promise<string | null> {
  try {
    const token = await getAccessToken();
    const calendarEmail = process.env.OUTLOOK_SHARED_CALENDAR_EMAIL;

    if (!token || !calendarEmail) {
      return null;
    }

    // Récupérer les détails complets de l'intervention (avec client et technicien)
    const intervention = await prisma.intervention.findUnique({
      where: { id: interventionId },
      include: {
        client: true,
        technicien: true,
      },
    });

    if (!intervention) {
      console.warn(`[Outlook Sync] Intervention ${interventionId} non trouvée.`);
      return null;
    }

    const startDate = new Date(intervention.datePlanifiee);
    // Durée par défaut de 2 heures
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    const clientNom = intervention.client?.nom || intervention.clientNom || "Client Inconnu";
    const subject = `[Intervention ${intervention.numero}] ${clientNom} - ${intervention.titre}`;
    const location = intervention.client 
      ? `${intervention.client.rue}, ${intervention.client.codePostal} ${intervention.client.ville}`
      : "Non spécifiée";

    const payload = {
      subject,
      body: {
        contentType: "HTML",
        content: buildEventBody(intervention),
      },
      start: {
        dateTime: startDate.toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: "UTC",
      },
      location: {
        displayName: location,
      },
      // Permet de classer visuellement les rendez-vous selon le type
      categories: [intervention.type || "SAV"],
    };

    const url = `https://graph.microsoft.com/v1.0/users/${calendarEmail}/calendar/events`;

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const eventId = response.data.id;
    console.log(`📅 Rendez-vous Outlook créé avec succès pour l'intervention ${intervention.numero} (Event ID: ${eventId})`);

    // Enregistrer l'ID de l'événement Outlook dans notre base de données
    await prisma.intervention.update({
      where: { id: interventionId },
      data: { outlookEventId: eventId },
    });

    return eventId;
  } catch (error: any) {
    console.error(
      "❌ Erreur lors de la création du rendez-vous Outlook :",
      error.response?.data || error.message
    );
    return null;
  }
}

/**
 * Met à jour un événement existant dans le calendrier partagé Outlook.
 */
export async function updateOutlookEvent(interventionId: string): Promise<boolean> {
  try {
    const token = await getAccessToken();
    const calendarEmail = process.env.OUTLOOK_SHARED_CALENDAR_EMAIL;

    if (!token || !calendarEmail) {
      return false;
    }

    const intervention = await prisma.intervention.findUnique({
      where: { id: interventionId },
      include: {
        client: true,
        technicien: true,
      },
    });

    if (!intervention) {
      return false;
    }

    // S'il n'y a pas d'événement Outlook associé à cette intervention, on tente de le créer
    if (!intervention.outlookEventId) {
      console.log(`[Outlook Sync] Aucun rendez-vous existant pour l'intervention ${intervention.numero}. Création en cours...`);
      const eventId = await createOutlookEvent(interventionId);
      return !!eventId;
    }

    const startDate = new Date(intervention.datePlanifiee);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    const clientNom = intervention.client?.nom || intervention.clientNom || "Client Inconnu";
    const subject = `[Intervention ${intervention.numero}] ${clientNom} - ${intervention.titre}`;
    const location = intervention.client 
      ? `${intervention.client.rue}, ${intervention.client.codePostal} ${intervention.client.ville}`
      : "Non spécifiée";

    const payload = {
      subject,
      body: {
        contentType: "HTML",
        content: buildEventBody(intervention),
      },
      start: {
        dateTime: startDate.toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: "UTC",
      },
      location: {
        displayName: location,
      },
      categories: [intervention.type || "SAV"],
    };

    const url = `https://graph.microsoft.com/v1.0/users/${calendarEmail}/calendar/events/${intervention.outlookEventId}`;

    await axios.patch(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`🔄 Rendez-vous Outlook mis à jour pour l'intervention ${intervention.numero}`);
    return true;
  } catch (error: any) {
    // Si Microsoft renvoie une 404 (par exemple si le rendez-vous a été supprimé manuellement dans Outlook),
    // on efface l'ID d'événement obsolète de notre base de données et on recrée un nouveau rendez-vous.
    if (error.response?.status === 404) {
      console.warn(
        `[Outlook Sync] L'événement Outlook lié à l'intervention ${interventionId} n'a pas été trouvé chez Microsoft (supprimé). Recréation...`
      );
      
      await prisma.intervention.update({
        where: { id: interventionId },
        data: { outlookEventId: null },
      });
      
      const eventId = await createOutlookEvent(interventionId);
      return !!eventId;
    }

    console.error(
      "❌ Erreur lors de la mise à jour du rendez-vous Outlook :",
      error.response?.data || error.message
    );
    return false;
  }
}

/**
 * Supprime un événement du calendrier partagé Outlook.
 */
export async function deleteOutlookEvent(outlookEventId: string | null): Promise<boolean> {
  if (!outlookEventId) {
    return false;
  }

  try {
    const token = await getAccessToken();
    const calendarEmail = process.env.OUTLOOK_SHARED_CALENDAR_EMAIL;

    if (!token || !calendarEmail) {
      return false;
    }

    const url = `https://graph.microsoft.com/v1.0/users/${calendarEmail}/calendar/events/${outlookEventId}`;

    await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log(`🗑️ Rendez-vous Outlook ${outlookEventId} supprimé du calendrier.`);
    return true;
  } catch (error: any) {
    // Si l'événement n'existe pas ou est déjà supprimé, on gère l'erreur gracieusement
    if (error.response?.status === 404) {
      console.log(`[Outlook Sync] L'événement Outlook ${outlookEventId} est déjà inexistant chez Microsoft.`);
      return true;
    }

    console.error(
      "❌ Erreur lors de la suppression du rendez-vous Outlook :",
      error.response?.data || error.message
    );
    return false;
  }
}
