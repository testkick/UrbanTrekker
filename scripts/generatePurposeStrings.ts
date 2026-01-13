/**
 * Generate Apple-compliant permission purpose strings using Newell AI
 */
import { generateText } from '@fastshot/ai';

async function generatePurposeStrings() {
  const prompt = `You are an iOS developer writing permission purpose strings for Apple's Info.plist file.

Generate three permission purpose strings for an urban exploration walking app called "Stepquest". Each string must:
- Be specific and non-generic (Apple rejects vague strings)
- Clearly explain the technical functionality
- Be 1-2 sentences maximum
- Sound professional and user-friendly

Generate these three strings:

1. NSLocationWhenInUseUsageDescription (location):
Explain how the app uses location to calculate routes to nearby landmarks and provide real-time navigation along street paths.

2. NSMotionUsageDescription (motion):
Explain how the app uses motion sensors to accurately count steps and track achievement progress.

3. NSLocationAlwaysAndWhenInUseUsageDescription (locationAlways):
Explain how the app continues tracking your adventure even when your phone is in your pocket or the app is in the background.

Format your response as valid JSON with keys: location, motion, locationAlways
Do not include any markdown formatting or code blocks, only the raw JSON object.`;

  try {
    console.log('🤖 Generating Apple-compliant purpose strings with Newell AI...\n');

    const result = await generateText({
      prompt,
      temperature: 0.7,
    });

    console.log('Generated Purpose Strings:\n');
    console.log(result);
    console.log('\n✅ Successfully generated purpose strings!');

    return result;
  } catch (error) {
    console.error('❌ Error generating purpose strings:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  generatePurposeStrings().catch(console.error);
}

export { generatePurposeStrings };
