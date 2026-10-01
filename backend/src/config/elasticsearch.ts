import { Client } from '@elastic/elasticsearch';
import { env } from './env';

export const esClient = new Client({
  node: env.ELASTICSEARCH_NODE,
});

export const ELASTICSEARCH_INDEX = 'emails';

export async function initElasticsearchIndex(): Promise<void> {
  try {
    const exists = await esClient.indices.exists({ index: ELASTICSEARCH_INDEX });
    if (!exists) {
      await esClient.indices.create({
        index: ELASTICSEARCH_INDEX,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            campaignId: { type: 'keyword' },
            senderEmail: { type: 'keyword' },
            recipientEmail: { type: 'keyword' },
            subject: { type: 'text' },
            body: { type: 'text' },
            status: { type: 'keyword' },
            scheduledAt: { type: 'date' },
            sentAt: { type: 'date' },
            etherealPreviewUrl: { type: 'keyword' },
            createdAt: { type: 'date' },
          },
        },
      });
      console.log(`[Elasticsearch] Index '${ELASTICSEARCH_INDEX}' created successfully.`);
    } else {
      console.log(`[Elasticsearch] Index '${ELASTICSEARCH_INDEX}' already exists.`);
    }
  } catch (error: any) {
    console.warn(`[Elasticsearch Init Warning] ${error.message}. DB search fallback will be enabled if needed.`);
  }
}
