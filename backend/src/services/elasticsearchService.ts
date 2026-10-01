import { esClient, ELASTICSEARCH_INDEX } from '../config/elasticsearch';
import { prisma } from '../config/db';

export interface IndexEmailPayload {
  id: string;
  campaignId?: string | null;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date;
  sentAt?: Date | null;
  etherealPreviewUrl?: string | null;
  createdAt: Date;
}

export async function indexEmailInElasticsearch(payload: IndexEmailPayload): Promise<void> {
  try {
    await esClient.index({
      index: ELASTICSEARCH_INDEX,
      id: payload.id,
      document: {
        id: payload.id,
        campaignId: payload.campaignId || '',
        senderEmail: payload.senderEmail,
        recipientEmail: payload.recipientEmail,
        subject: payload.subject,
        body: payload.body,
        status: payload.status,
        scheduledAt: payload.scheduledAt.toISOString(),
        sentAt: payload.sentAt ? payload.sentAt.toISOString() : null,
        etherealPreviewUrl: payload.etherealPreviewUrl || '',
        createdAt: payload.createdAt.toISOString(),
      },
      refresh: 'wait_for',
    });
    console.log(`[Elasticsearch] Indexed email document ID: ${payload.id} (Status: ${payload.status})`);
  } catch (error: any) {
    console.warn(`[Elasticsearch Index Warning] Could not index email ${payload.id}: ${error.message}`);
  }
}

export async function searchEmailsInElasticsearch(query: string, status?: string): Promise<any[]> {
  try {
    const mustConditions: any[] = [];

    if (query && query.trim() !== '') {
      mustConditions.push({
        multi_match: {
          query: query,
          fields: ['subject^3', 'body^2', 'recipientEmail^4', 'senderEmail^3', 'status'],
          fuzziness: 'AUTO',
        },
      });
    }

    if (status) {
      mustConditions.push({
        term: { status: status },
      });
    }

    const response = await esClient.search({
      index: ELASTICSEARCH_INDEX,
      body: {
        query: mustConditions.length > 0 ? { bool: { must: mustConditions } } : { match_all: {} },
        sort: [{ scheduledAt: { order: 'desc' } }],
        size: 100,
      },
    });

    const hits = response.hits.hits;
    return hits.map((hit: any) => hit._source);
  } catch (error: any) {
    console.warn(`[Elasticsearch Search Fallback] Search query failed via ES (${error.message}). Falling back to Postgres DB search.`);
    
    // DB Fallback search
    const dbResults = await prisma.emailJob.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(query ? {
          OR: [
            { subject: { contains: query, mode: 'insensitive' } },
            { body: { contains: query, mode: 'insensitive' } },
            { recipientEmail: { contains: query, mode: 'insensitive' } },
            { senderEmail: { contains: query, mode: 'insensitive' } },
          ],
        } : {}),
      },
      orderBy: { scheduledAt: 'desc' },
      take: 100,
    });

    return dbResults;
  }
}
