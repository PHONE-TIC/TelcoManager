import axios from 'axios';
import { prisma } from '../db';

// UNYC Atlas API Configuration
const UNYC_BASE_URL = process.env.UNYC_BASE_URL || 'https://atlas-public-api.web.production.unyc.io';
const UNYC_IAM_URL = process.env.UNYC_IAM_URL || 'https://accounts.unyc.io/realms/production';
const UNYC_CLIENT_ID = process.env.UNYC_CLIENT_ID || 'public-api';
const UNYC_USERNAME = process.env.UNYC_USERNAME || '';
const UNYC_PASSWORD = process.env.UNYC_PASSWORD || '';

interface UnycToken {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    token_type: string;
}

interface UnycCustomer {
    id: string;
    name: string;
    siret?: string;
    addresses?: UnycAddress[];
    contacts?: UnycContact[];
}

interface UnycAddress {
    id: string;
    street?: string;
    postalCode?: string;
    city?: string;
    type?: string; // billing, installation, etc.
}

interface UnycContact {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get OAuth2 access token from UNYC IAM
 */
export async function getAccessToken(): Promise<string> {
    // Check for cached token
    if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
        return cachedToken.token;
    }

    if (!UNYC_USERNAME || !UNYC_PASSWORD) {
        throw new Error('UNYC credentials not configured. Please set UNYC_USERNAME and UNYC_PASSWORD in .env');
    }

    try {
        const response = await axios.post<UnycToken>(
            `${UNYC_IAM_URL}/protocol/openid-connect/token`,
            new URLSearchParams({
                client_id: UNYC_CLIENT_ID,
                username: UNYC_USERNAME,
                password: UNYC_PASSWORD,
                grant_type: 'password',
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        const token = response.data;
        cachedToken = {
            token: token.access_token,
            expiresAt: Date.now() + (token.expires_in * 1000),
        };

        return token.access_token;
    } catch (error: any) {
        console.error('UNYC authentication failed:', error.response?.data || error.message);
        throw new Error('Échec de l\'authentification UNYC. Vérifiez vos identifiants.');
    }
}

/**
 * Fetch customers from UNYC Atlas API
 */
export async function fetchCustomers(): Promise<UnycCustomer[]> {
    const accessToken = await getAccessToken();

    try {
        const response = await axios.get(`${UNYC_BASE_URL}/customers`, {
            headers: {
                'Accept': 'application/ld+json',
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        // Handle JSON-LD response format
        const data = response.data;
        if (Array.isArray(data)) {
            return data;
        } else if (data['hydra:member']) {
            return data['hydra:member'];
        } else if (data.member) {
            return data.member;
        }

        return [];
    } catch (error: any) {
        console.error('Failed to fetch UNYC customers:', error.response?.data || error.message);
        throw new Error('Impossible de récupérer les clients UNYC.');
    }
}

/**
 * Sync UNYC customers to local database
 */
export async function syncCustomers(): Promise<{ created: number; updated: number; total: number }> {
    const customers = await fetchCustomers();
    let created = 0;
    let updated = 0;

    for (const customer of customers as any[]) {
        // Find installation address (preferred) or first address
        // UNYC uses type.name = "INSTALLATION_ADDRESS" 
        const installAddress = customer.addresses?.find((a: any) =>
            a.type?.name === 'INSTALLATION_ADDRESS' || a.type === 'installation'
        ) || customer.addresses?.[0];

        // Find first contact
        const contact = customer.contacts?.[0];

        // Extract address fields - handle UNYC's nested object formats
        const extractCity = (addr: any): string => {
            if (!addr?.city) return '';
            if (typeof addr.city === 'string') return addr.city;
            if (typeof addr.city === 'object' && addr.city.name) return addr.city.name;
            return '';
        };

        // UNYC uses streetName + streetNumber
        const extractStreet = (addr: any): string => {
            if (!addr) return '';
            const streetNumber = addr.streetNumber || '';
            const streetName = addr.streetName || addr.street || '';
            return `${streetNumber} ${streetName}`.trim();
        };

        const extractPostalCode = (addr: any): string => {
            if (!addr) return '';
            // Try postalCode first, then zip in city object
            if (addr.postalCode) return String(addr.postalCode);
            if (addr.zip) return String(addr.zip);
            if (typeof addr.city === 'object' && addr.city.zip) return String(addr.city.zip);
            return '';
        };

        // UNYC uses legalName instead of name
        const clientData = {
            nom: customer.legalName || customer.name || 'Sans nom',
            rue: extractStreet(installAddress),
            codePostal: extractPostalCode(installAddress),
            ville: extractCity(installAddress),
            contact: contact ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim() : (customer.reference || 'Contact inconnu'),
            telephone: contact?.phone || '',
            email: contact?.email || customer.invoicingEmail || undefined,
            notes: `Importé depuis UNYC Atlas (ID: ${customer.id})${customer.siret ? ` - SIRET: ${customer.siret}` : ''}`,
        };

        // Check if client already exists by UNYC ID in notes
        const existingClient = await prisma.client.findFirst({
            where: {
                notes: {
                    contains: `UNYC Atlas (ID: ${customer.id})`,
                },
            },
        });

        if (existingClient) {
            // Update existing client
            await prisma.client.update({
                where: { id: existingClient.id },
                data: clientData,
            });
            updated++;
        } else {
            // Create new client
            await prisma.client.create({
                data: clientData,
            });
            created++;
        }
    }

    return { created, updated, total: customers.length };
}

/**
 * Test UNYC connection
 */
export async function testConnection(): Promise<boolean> {
    try {
        await getAccessToken();
        return true;
    } catch {
        return false;
    }
}
