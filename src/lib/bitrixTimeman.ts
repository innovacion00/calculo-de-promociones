const BASE_URL = process.env.BITRIX_BASE_URL || 'https://gehsuites.bitrix24.com/rest';
const WEBHOOK_USER_ID = process.env.BITRIX_WEBHOOK_USER_ID || '14';
const apiKey = process.env.APIKEY_BITRIX;
const departmentFilter = process.env.BITRIX_DEPARTMENT_ID || '18';

export type BitrixUser = {
  id: number;
  name: string;
};

export type TimemanStatus = {
  userId: number;
  status: string;
  timeStart?: string | null;
  timeFinish?: string | null;
  duration?: number | null;
};

export async function fetchBitrixUsers(): Promise<BitrixUser[]> {
  if (!apiKey) {
    console.warn('[bitrix] APIKEY_BITRIX no está definida');
    return [];
  }

  const response = await fetch(
    `${BASE_URL}/${WEBHOOK_USER_ID}/${apiKey}/user.get.json?FILTER[ACTIVE]=true&FILTER[UF_DEPARTMENT]=${departmentFilter}`,
    { cache: 'no-store' }
  );

  if (!response.ok) {
    throw new Error(`Bitrix user.get falló con status ${response.status}`);
  }

  const data = (await response.json()) as { result?: Array<Record<string, unknown>> };

  return (data.result || []).map((user) => ({
    id: Number(user.ID ?? 0),
    name: [String(user.NAME || ''), String(user.LAST_NAME || '')].filter(Boolean).join(' ').trim() || `Usuario ${user.ID}`,
  })).filter((user) => Number.isFinite(user.id) && user.id > 0);
}

export async function fetchTimemanStatus(userIds: number[]): Promise<TimemanStatus[]> {
  if (!apiKey) {
    return [];
  }

  const statusPromises = userIds.map(async (userId) => {
    const timestamp = Date.now();
    const response = await fetch(
      `${BASE_URL}/${WEBHOOK_USER_ID}/${apiKey}/timeman.status?USER_ID=${userId}&timestamp=${timestamp}`,
      { cache: 'no-store' }
    );

    const data = (await response.json()) as {
      result?: {
        STATUS?: string;
        TIME_START?: string;
        TIME_FINISH?: string;
        DURATION?: number;
      };
    };

    return {
      userId,
      status: data.result?.STATUS || 'UNKNOWN',
      timeStart: data.result?.TIME_START || null,
      timeFinish: data.result?.TIME_FINISH || null,
      duration: data.result?.DURATION ?? null,
    };
  });

  return Promise.all(statusPromises);
}
