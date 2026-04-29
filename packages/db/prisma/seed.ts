import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

// Helper to handle __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('--- RESETTING & SEEDING PRESETS START ---');
  
  // 1. Read all JSON files from the presets directory
  const presetsDir = path.join(__dirname, 'presets');
  const presetFiles = fs.readdirSync(presetsDir).filter((file: string) => file.endsWith('.json'));
  
  const presets = presetFiles.map((file: string) => {
    const filePath = path.join(presetsDir, file);
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  });

  // 2. Clear existing presets to ensure fresh start
  console.log('Cleaning old preset data...');
  await prisma.question.deleteMany({
    where: { set: { isPreset: true } }
  });
  await prisma.questionSet.deleteMany({
    where: { isPreset: true }
  });

  // 3. Seed new data
  for (const preset of presets) {
    console.log(`Creating set: ${preset.name}`);
    
    const questionSet = await prisma.questionSet.create({
      data: {
        id: `preset-${preset.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        title: preset.name,
        description: preset.description,
        isPreset: true,
        questions: {
          create: preset.questions.map((q: any) => ({
            type: q.type,
            text: q.text,
            points: q.points,
            options: q.options || undefined,
            answerKey: q.answerKey || undefined,
          }))
        }
      }
    });

    console.log(`✅ Set "${preset.name}" created with ${preset.questions.length} questions.`);
  }

  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
