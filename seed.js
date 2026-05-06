// seed.js - Carga los 1203 autos a Supabase
// Ejecutar: node seed.js

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Falta VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const data = JSON.parse(readFileSync('./seed_data.json', 'utf-8'));

async function seed() {
  console.log(`Cargando ${data.length} autos...`);
  
  // Insertar en chunks de 100
  const chunkSize = 100;
  let inserted = 0;
  
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    const { error } = await supabase.from('autos').upsert(chunk, { onConflict: 'id' });
    if (error) {
      console.error(`Error en chunk ${i}:`, error.message);
    } else {
      inserted += chunk.length;
      console.log(`✓ ${inserted}/${data.length} autos cargados`);
    }
  }
  
  console.log('\n✅ Seed completado!');
}

seed();
