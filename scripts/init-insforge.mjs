import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@insforge/sdk';

function parseEnvFile(filePath) {
  try {
    const raw = fs.readFile(filePath, 'utf8');
    return raw;
  } catch {
    return '';
  }
}

async function loadEnvFromFile() {
  const envFile = path.resolve(process.cwd(), '.env.local');
  const content = await parseEnvFile(envFile);

  if (!content) return {};

  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    env[key] = value.replace(/^['"]|['"]$/g, '');
  }

  return env;
}

const channelTypes = [
  { type: 'TWITTER', name: 'Twitter / X', color: '#000000', character_limit: 280 },
  { type: 'LINKEDIN', name: 'LinkedIn', color: '#2867b2', character_limit: 3000 },
  { type: 'INSTAGRAM', name: 'Instagram', color: '#E4405F', character_limit: 2200 },
  { type: 'THREADS', name: 'Threads', color: '#000000', character_limit: 500 },
  { type: 'FACEBOOK', name: 'Facebook', color: '#1877F2', character_limit: 63206 },
  { type: 'BLUESKY', name: 'Bluesky', color: '#1285fe', character_limit: 300 },
  { type: 'YOUTUBE', name: 'YouTube', color: '#FF0000', character_limit: 100 },
  { type: 'TIKTOK', name: 'Tiktok', color: '#000000', character_limit: 100 },
];

const ideaGroups = [
  { name: 'Unassigned' },
  { name: 'To Do' },
  { name: 'In Progress' },
  { name: 'Done' },
];

async function main() {
  const env = await loadEnvFromFile();
  const baseUrlRaw = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL || env.NEXT_PUBLIC_INSFORGE_BASE_URL;
  const baseUrl = (baseUrlRaw || '').replace(/\/+$/, '');
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || env.NEXT_PUBLIC_INSFORGE_ANON_KEY;

  if (!baseUrl || !anonKey) {
    console.error('Missing Insforge env vars. Expected NEXT_PUBLIC_INSFORGE_BASE_URL and NEXT_PUBLIC_INSFORGE_ANON_KEY in .env.local');
    process.exit(1);
  }

  const insforge = createClient({
    baseUrl,
    anonKey,
  });

  console.log('Checking Insforge database...');

  try {
    const { data, error } = await insforge.database.from('channel_types').select('type').limit(1);

    if (error) {
      console.error('The database schema is not ready yet.');
      console.error('Please run the SQL from lib/db/create-social-scheduling-tables.sql in the InsForge SQL editor first.');
      console.error(error.message || JSON.stringify(error));
      process.exit(1);
    }

    console.log('Seed tables already exist. Upserting default values...');

    const channelInsert = await insforge.database.from('channel_types').upsert(channelTypes, { onConflict: 'type' });
    if (channelInsert.error) {
      throw channelInsert.error;
    }

    const groupsInsert = await insforge.database.from('idea_groups').upsert(ideaGroups, { onConflict: 'name' });
    if (groupsInsert.error) {
      throw groupsInsert.error;
    }

    console.log('Insforge seed completed successfully.');
    console.log('channel_types:', channelInsert.data?.length ?? 0);
    console.log('idea_groups:', groupsInsert.data?.length ?? 0);
  } catch (error) {
    console.error('Failed to seed Insforge.');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
