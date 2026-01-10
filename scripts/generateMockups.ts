/**
 * Generate Navigation Mockup Images
 * Run with: npx tsx scripts/generateMockups.ts
 */

import { generateImage } from '@fastshot/ai';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
  console.log('✅ Environment variables loaded from .env\n');
}

async function generateMockups() {
  console.log('🎨 Generating navigation mockups...\n');

  // Mockup 1: Explorer Dock (Bottom Navigation)
  console.log('📱 Generating Mockup 1: Explorer Dock...');
  const mockup1 = await generateImage({
    prompt: `High-end mobile app UI mockup, professional product design. Full-screen adventure map showing streets and parks in a modern cartographic style. At the BOTTOM is a sleek 80px tall frosted glass navigation bar with blur effect. In the DEAD CENTER of this bar is a large, floating, vibrant orange (#FF6F00) circular "SCAN" button with soft shadow and subtle glow. To the LEFT is a clean compass icon labeled "Explorer" in light gray. To the RIGHT is an old book icon labeled "Journal" in light gray. Premium fitness app aesthetic like Strava or Nike Run Club. Modern, clean, professional UI design. iPhone screen proportions.`,
    width: 1024,
    height: 1792, // Mobile aspect ratio
  });

  if (mockup1.images && mockup1.images[0]) {
    console.log('✅ Mockup 1 generated successfully!');
    console.log(`   URL: ${mockup1.images[0]}\n`);
  }

  // Mockup 2: Explorer Passport (Profile Icon)
  console.log('📱 Generating Mockup 2: Explorer Passport...');
  const mockup2 = await generateImage({
    prompt: `Two-panel mobile app UI mockup showing before and after states. LEFT PANEL: 100% immersive adventure map showing streets and landmarks, clean and minimal. In TOP-RIGHT corner next to battery icon is a small 40px circular avatar icon with thin glowing gold border. RIGHT PANEL: Beautiful "Field Journal" dashboard that looks like a high-end travel passport, featuring clean sections for "Explorer Rank" with stars, "Discoveries" count with badges, and a prominent "View History" button in orange. Deeply immersive aesthetic similar to Zelda or Pokémon GO. Professional UI design, modern and premium.`,
    width: 1024,
    height: 1792,
  });

  if (mockup2.images && mockup2.images[0]) {
    console.log('✅ Mockup 2 generated successfully!');
    console.log(`   URL: ${mockup2.images[0]}\n`);
  }

  // Mockup 3: Interactive HUD
  console.log('📱 Generating Mockup 3: Interactive HUD...');
  const mockup3 = await generateImage({
    prompt: `Two-state mobile app UI mockup showing interaction. TOP STATE: Clean adventure map with dark sleek HUD bar at the TOP displaying "1,186 STEPS", "0.90 KM", and battery "10%" with icons. Tiny subtle chevron down icon in corner of HUD. BOTTOM STATE: Same HUD has smoothly expanded downward to fill 60% of screen, revealing "Daily Summary" heading and clean list of journal entries below with dates and mission names. Minimalist Apple system app style, sophisticated and clean. Premium iOS design language. Professional product mockup.`,
    width: 1024,
    height: 1792,
  });

  if (mockup3.images && mockup3.images[0]) {
    console.log('✅ Mockup 3 generated successfully!');
    console.log(`   URL: ${mockup3.images[0]}\n`);
  }

  // Save URLs to a file
  const outputPath = path.join(__dirname, 'mockup-urls.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        mockup1_explorerDock: mockup1.images?.[0] || null,
        mockup2_explorerPassport: mockup2.images?.[0] || null,
        mockup3_interactiveHUD: mockup3.images?.[0] || null,
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  console.log(`\n✅ All mockups generated!`);
  console.log(`📄 URLs saved to: ${outputPath}`);
  console.log('\n🔗 Mockup URLs:');
  console.log(`   1. Explorer Dock: ${mockup1.images?.[0]}`);
  console.log(`   2. Explorer Passport: ${mockup2.images?.[0]}`);
  console.log(`   3. Interactive HUD: ${mockup3.images?.[0]}`);
}

generateMockups().catch((error) => {
  console.error('❌ Error generating mockups:', error);
  process.exit(1);
});
