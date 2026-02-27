export interface ResearchParams {
  mode: "search" | "topic" | "account" | "ask";
  query?: string;
  handle?: string;
  side1?: string;
  side2?: string;
  topics?: string;
  question?: string;
}

function buildPrompt(params: ResearchParams): {
  prompt: string;
  tools: Array<Record<string, unknown>>;
} {
  const citationRule =
    "IMPORTANT: For EVERY claim or finding, you MUST include the actual tweet URL in the format https://x.com/username/status/ID. Do not fabricate URLs. Every single point must have a real citation link.";

  const formatRule =
    "Format your response as clean HTML. Use <h2>, <h3>, <p>, <ul>, <li>, <a> tags. Make tweet links clickable with target='_blank'. Style tweet citations as blockquotes with the tweet URL linked.";

  const xSearch = { type: "x_search" };
  const webSearch = { type: "web_search" };

  switch (params.mode) {
    case "search":
      return {
        prompt: `Search X/Twitter for the most notable, viral, or insightful tweets about: "${params.query}"

Find 10-15 tweets. For each tweet include:
- The tweet text
- Author handle
- A direct link to the tweet
- Why it's notable (engagement, insight, controversy, etc.)

${citationRule}
${formatRule}

Wrap the entire response in a <div>. Start with an <h2> summarizing what was found.`,
        tools: [xSearch, webSearch],
      };

    case "topic":
      return {
        prompt: `Analyze the debate on X/Twitter about: "${params.query}"

Side A: "${params.side1}"
Side B: "${params.side2}"

Search for tweets representing both sides. Find at least 5-8 tweets per side. For each tweet:
- Classify it as Side A or Side B
- Include the full tweet text
- Link to the actual tweet

Then provide:
- A tally: how many tweets found for each side
- A sentiment summary for each side
- Notable patterns or key voices

${citationRule}
${formatRule}

Structure the HTML with:
- <h2> for the topic
- A summary section with tallies styled as a scoreboard
- <h3> for each side with its tweets as blockquotes
- A <h3> "Analysis" section at the end`,
        tools: [xSearch, webSearch],
      };

    case "account": {
      const topicList = params.topics
        ?.split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      return {
        prompt: `Analyze the X/Twitter account @${params.handle} and their positions on the following topics:
${topicList?.map((t) => `- ${t}`).join("\n")}

For each topic:
1. Determine their stance/position based on their tweets
2. Provide 2-4 evidence tweets with direct links
3. Rate their engagement level (casual mention vs. passionate advocate)

${citationRule}
${formatRule}

Structure as:
- <h2> with the account name
- <h3> for each topic with stance summary and evidence tweets as blockquotes
- <h3> "Overall Profile" summary at the end`,
        tools: [xSearch, webSearch],
      };
    }

    case "ask":
      return {
        prompt: `Answer this question about @${params.handle} on X/Twitter: "${params.question}"

Search their tweets and provide a thorough, well-cited answer. Include specific tweets as evidence.

${citationRule}
${formatRule}

Structure as a <div> with <h2> for the question, detailed answer paragraphs, and tweet citations as blockquotes.`,
        tools: [xSearch, webSearch],
      };

    default:
      throw new Error("Invalid mode");
  }
}

// Extract text from xAI Responses API output
// Response shape: { output: Array<{type, role, content: Array<{type, text}>}> }
function extractText(data: Record<string, unknown>): string {
  // Try output array (Responses API format)
  const output = data.output as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(output)) {
    for (const item of output) {
      if (item.type === "message") {
        const content = item.content as Array<Record<string, unknown>> | undefined;
        if (Array.isArray(content)) {
          for (const c of content) {
            if (c.type === "output_text" && typeof c.text === "string") {
              return c.text;
            }
          }
        }
      }
    }
  }
  // Fallback: try chat completions format
  const choices = data.choices as Array<{message: {content: string}}> | undefined;
  if (Array.isArray(choices) && choices[0]?.message?.content) {
    return choices[0].message.content;
  }
  return "No results found.";
}

export async function generateResearch(params: ResearchParams): Promise<string> {
  const { prompt, tools } = buildPrompt(params);
  const model = process.env.XAI_MODEL || "grok-3-fast";

  const response = await fetch("https://api.x.ai/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      input: [{ role: "user", content: prompt }],
      tools,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`xAI API error: ${err}`);
  }

  const data = await response.json();
  return extractText(data as Record<string, unknown>);
}
