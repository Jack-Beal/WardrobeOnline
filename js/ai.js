// AI outfit rating via Anthropic API. (Feature 6)

async function rateOutfit(outfit, items) {
  const itemList = items.map(i => `- ${i.name} (${i.category}, ${i.colour})`).join('\n');
  const prompt = `Rate this outfit out of 10 and give 2 sentences of honest style feedback like a fashion editor.\n\nOutfit name: "${outfit.name}"\nItems:\n${itemList}\n\nRespond as JSON: {"rating": <number>, "feedback": "<two sentences>"}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI request failed: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content[0].text;

  // Parse JSON from response
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not parse AI response');
  return JSON.parse(match[0]);
}
