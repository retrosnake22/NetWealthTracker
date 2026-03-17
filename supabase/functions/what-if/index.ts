// supabase/functions/what-if/index.ts
// Deno Edge Function — proxies OpenAI calls so the API key stays server-side

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY not configured on server' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { question, financialContext } = await req.json()

    if (!question || !financialContext) {
      return new Response(
        JSON.stringify({ error: 'Missing question or financialContext' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const systemPrompt = `You are a senior financial advisor AI for an Australian personal finance app called "Net Wealth Tracker" (NWT). The user will provide their complete financial profile and ask "what if" scenario questions.

Your job is to:
1. Analyse their actual numbers from the profile provided
2. Calculate the financial impact of their hypothetical scenario
3. Give a clear, structured answer with REAL numbers based on their data
4. Highlight pros, cons, and things to consider
5. Use Australian financial context (AUD, Australian tax rules, superannuation, negative gearing, etc.)

Rules:
- Always use the actual numbers from the user's profile — never make up figures
- Format currency as AUD (e.g. $150,000)
- Be specific and quantitative, not vague
- If you don't have enough data to answer accurately, say what's missing
- Keep answers concise but thorough — use bullet points and sections
- Consider tax implications where relevant (Australian tax brackets, CGT, negative gearing)
- Do NOT give regulated financial advice — frame as analysis and scenarios, not recommendations

Formatting rules (IMPORTANT):
- Use markdown for structure: ## for section headings, **bold** for emphasis, - for bullet points
- NEVER use LaTeX math notation (no \\[, \\], \\frac, \\text, etc.)
- For formulas, write them in plain text like: "Monthly repayment = $569,000 × 0.004933 / (1 - 1.004933^-360) = $3,392/month"
- Use simple tables with | pipes | for comparisons
- Keep sections short with clear headings
- Use > blockquotes for key takeaways or summary figures
- End with a clear "Bottom Line" summary section`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Here is my complete financial profile:\n\n${financialContext}\n\nMy question: ${question}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return new Response(
        JSON.stringify({ error: `OpenAI API error: ${response.status} — ${err}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const answer = data.choices?.[0]?.message?.content ?? 'No response generated.'

    return new Response(
      JSON.stringify({ answer }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message ?? 'Unknown server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
