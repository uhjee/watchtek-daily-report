import { Client } from '@notionhq/client';
import { config } from './config';

if (!config.notion.apiKey) {
  throw new Error('NOTION_API_KEY is not defined in environment variables');
}

export const notionClient = new Client({
  auth: config.notion.apiKey
}); 