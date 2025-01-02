import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.NOTION_API_KEY) {
  throw new Error('NOTION_API_KEY is not defined in environment variables');
}

export const notionClient = new Client({
  auth: process.env.NOTION_API_KEY
}); 