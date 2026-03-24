import { NextRequest, NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { gatherChatContext } from '@/lib/chat/context'
import { chatTools } from '@/lib/chat/tools'
import { executeTool } from '@/lib/chat/tool-executor'

// ── Rate limiter ────────────────────────────────────────────────────────────

const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT = 30
const RATE_WINDOW_MS = 60_000

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(userId) ?? []
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_LIMIT) return false
  recent.push(now)
  rateLimitMap.set(userId, recent)
  return true
}

// ── System prompt builder ───────────────────────────────────────────────────

type ChatContext = Awaited<ReturnType<typeof gatherChatContext>>

function buildSystemPrompt(context: ChatContext, today: string): string {
  return `You are the AI assistant for DealFlow AI, a real estate wholesaling platform. You have full access to this wholesaler's account data including their Buyer List, active deals, outreach campaigns, deal matches, marketplace listings, contracts, and activity history. The user should be able to run their entire wholesaling business through this chat.

## Instructions
- Be concise, actionable, and specific. Reference actual names, numbers, and data from the account below.
- When recommending buyers for deals, explain why based on buy box match (preferred markets, property types, price range, strategy).
- Use real estate wholesaling terminology naturally (ARV, assignment fee, buy box, disposition, etc.).
- Format responses with markdown for readability.
- You have access to data query tools that can look up specific details beyond the summary below. Use them when you need more information (e.g. a specific buyer's full profile, campaign call results, deal match scores, marketplace listings, contract status, or market intelligence for a city).
- When the user asks you to TAKE an action (not just get info), use the propose_action tool to create a confirmation card. The user will see a "Confirm" button in the chat. Never claim to have performed the action — always propose it first.
- Be smart about extracting the right parameters from natural language. Always look up the actual IDs (dealId, buyerId) using search tools before proposing an action. If you're unsure about specifics, ask a clarifying question before proposing.

## Action Capabilities
You can execute any platform action through the propose_action tool:

BUYER MANAGEMENT: Add new buyers, update their info (phone, email, buy box, markets, strategy, price range), archive/unarchive, tag/untag, rescore, merge duplicates, add notes, change status, bulk tag groups, export to CSV.

DEAL MANAGEMENT: Create deals, update deal details, change status (ACTIVE, UNDER_OFFER, CLOSED, CANCELLED, EXPIRED), delete deals, run AI property analysis, match deals to buyers, blast deals to matched buyers via SMS/email.

MARKETPLACE: List deals on the marketplace, pause/reactivate listings, post buyer profiles to the buyer board.

CONTRACTS: Generate assignment contracts from deals, send for signature, void contracts.

OUTREACH: Create campaigns (AI voice, SMS, email), pause/resume campaigns, send one-off SMS or email to specific buyers.

DISCOVERY: Search for properties in a market, reveal owner contact info (uses reveal credits).

## Rules for Actions
1. ALWAYS use propose_action with a confirmation step. Never claim you already did something — always propose first.
2. When the user references a buyer by name, use search_buyers first to find their ID before proposing the action.
3. When the user references a deal by address, use search_deals first to find its ID.
4. When the user references a tag by name, match it against the tags in the context data below to find the tag ID.
5. When the user references a campaign by name, use get_campaign_detail to find its ID.
6. For multi-step workflows, propose one action at a time. After the user confirms, propose the next.
7. For destructive actions (delete_deal, void_contract, archive_buyer), warn the user clearly in the description.
8. For actions that cost credits (reveal_contact), mention the credit usage in estimatedImpact.
9. For bulk actions, show the count in estimatedImpact (e.g., "This will tag 23 buyers as Hot Lead").
10. If you need information you don't have, use a query tool first (search_buyers, search_deals, get_pipeline_summary, etc.) BEFORE proposing the action.

## Multi-Step Workflow Examples
- "Find cash buyers in Phoenix and call them" → search_properties → propose add_buyer (for each) → propose create_campaign
- "Submit 123 Main St and blast it to matching buyers" → propose create_deal → after confirm, propose match_deal → after confirm, propose send_deal_blast
- "Close the Elm St deal and generate the contract" → propose change_deal_status (to CLOSED) → after confirm, propose generate_contract

## Natural Language Interpretation
Map casual language to the right action:
- "add Marcus to my list" → add_buyer
- "put this deal up" / "list this" → list_on_marketplace
- "call my Phoenix buyers" / "reach out to Tampa list" → create_campaign
- "shoot Marcus a text" / "text David" → send_sms
- "email the contract to the buyer" → send_contract
- "kill that campaign" / "stop the calls" → pause_campaign
- "bring back the Dallas campaign" → resume_campaign
- "nuke that deal" / "get rid of 123 Oak St" → delete_deal
- "Marcus is VIP now" → update_buyer_status to HIGH_CONFIDENCE
- "who owns 456 Elm?" → search_properties then offer reveal_contact
- "merge the two David Chen records" → merge_buyers
- "tag all my Phoenix buyers as hot" → search_buyers with market filter, then bulk_tag_buyers

## Today's Date
${today}

## Buyer List Summary
- Total active buyers: ${context.buyers.total}
- By status: ${JSON.stringify(context.buyers.byStatus)}
- Top 10 highest-scored buyers:
${JSON.stringify(context.buyers.top10, null, 2)}

## Deals
- Total deals: ${context.deals.all.length}
- By status: ${JSON.stringify(context.deals.byStatus)}
- All deals:
${JSON.stringify(context.deals.all, null, 2)}

## Campaigns
- Total campaigns: ${context.campaigns.all.length}
- Total calls completed across all campaigns: ${context.campaigns.totalCallsCompleted}
- Campaigns:
${JSON.stringify(context.campaigns.all, null, 2)}

## Recent Activity (last 15 events)
${JSON.stringify(context.recentActivity, null, 2)}

## Tags
${JSON.stringify(context.tags, null, 2)}

## Recent Deal Matches (last 20)
${JSON.stringify(context.dealMatches, null, 2)}

## Marketplace
- Active listings: ${context.marketplace.activeListings}
- Inquiries in last 7 days: ${context.marketplace.recentInquiries}

## Contracts
- By status: ${JSON.stringify(context.contracts.byStatus)}
- Awaiting signature (SENT): ${context.contracts.awaitingSignature}`
}

// ── Anthropic SSE stream parser ─────────────────────────────────────────────
// Parses the streaming response, forwarding text deltas to the client in
// real-time while collecting any tool_use blocks for execution.

interface ContentBlock {
  type: 'text' | 'tool_use'
  text?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
}

interface StreamResult {
  content: ContentBlock[]
  stopReason: string
}

async function processAnthropicStream(
  response: Response,
  onTextDelta: (text: string) => void,
): Promise<StreamResult> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const contentBlocks = new Map<number, ContentBlock>()
  const toolInputBuffers = new Map<number, string>()
  let stopReason = 'end_turn'

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (!data || data === '[DONE]') continue

      try {
        const event = JSON.parse(data)

        switch (event.type) {
          case 'content_block_start': {
            const block = event.content_block
            contentBlocks.set(event.index, {
              type: block.type,
              ...(block.type === 'text' ? { text: '' } : {}),
              ...(block.type === 'tool_use'
                ? { id: block.id, name: block.name, input: {} }
                : {}),
            })
            if (block.type === 'tool_use') {
              toolInputBuffers.set(event.index, '')
            }
            break
          }

          case 'content_block_delta': {
            const delta = event.delta
            if (delta.type === 'text_delta') {
              onTextDelta(delta.text)
              const block = contentBlocks.get(event.index)
              if (block) block.text = (block.text ?? '') + delta.text
            } else if (delta.type === 'input_json_delta') {
              const existing = toolInputBuffers.get(event.index) ?? ''
              toolInputBuffers.set(event.index, existing + delta.partial_json)
            }
            break
          }

          case 'content_block_stop': {
            const block = contentBlocks.get(event.index)
            if (block?.type === 'tool_use') {
              const jsonStr = toolInputBuffers.get(event.index) || '{}'
              try {
                block.input = JSON.parse(jsonStr)
              } catch {
                block.input = {}
              }
            }
            break
          }

          case 'message_delta': {
            if (event.delta?.stop_reason) {
              stopReason = event.delta.stop_reason
            }
            break
          }
        }
      } catch {
        // Skip unparseable chunks
      }
    }
  }

  const content = Array.from(contentBlocks.entries())
    .sort(([a], [b]) => a - b)
    .map(([, block]) => block)

  return { content, stopReason }
}

// ── Anthropic API call helper ───────────────────────────────────────────────

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_HEADERS = {
  'Content-Type': 'application/json',
  'anthropic-version': '2023-06-01',
}

function getAnthropicKey(): string {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set')
  return key
}
const MAX_TOOL_ROUNDS = 5

// ── Auto-title / summary generation ─────────────────────────────────────────

async function generateTitle(userMessage: string): Promise<string> {
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        ...ANTHROPIC_HEADERS,
        'x-api-key': getAnthropicKey(),
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 30,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: `Generate a short title (max 6 words) for a chat that starts with this message. Return ONLY the title, no quotes or punctuation at the end.\n\nMessage: "${userMessage.slice(0, 300)}"`,
          },
        ],
      }),
    })

    if (!res.ok) return 'New conversation'

    const data = await res.json()
    const title = data.content?.[0]?.text?.trim() ?? 'New conversation'
    return title.slice(0, 80)
  } catch {
    return 'New conversation'
  }
}

async function generateSummary(
  messages: { role: string; content: string }[],
): Promise<string> {
  try {
    const last10 = messages.slice(-10)
    const transcript = last10
      .map((m) => `${m.role}: ${m.content.slice(0, 200)}`)
      .join('\n')

    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        ...ANTHROPIC_HEADERS,
        'x-api-key': getAnthropicKey(),
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 60,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: `Summarize this conversation in one sentence (max 15 words). Return ONLY the summary.\n\n${transcript}`,
          },
        ],
      }),
    })

    if (!res.ok) return ''

    const data = await res.json()
    return data.content?.[0]?.text?.trim()?.slice(0, 150) ?? ''
  } catch {
    return ''
  }
}

// ── Auto-save conversation ──────────────────────────────────────────────────

async function autoSaveConversation(
  profileId: string,
  conversationId: string | null,
  messages: { role: string; content: string; timestamp?: string }[],
): Promise<string | null> {
  try {
    const timestamped = messages.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp ?? new Date().toISOString(),
    }))

    const assistantCount = timestamped.filter(
      (m) => m.role === 'assistant',
    ).length

    if (conversationId) {
      // Update existing conversation
      const data: Record<string, unknown> = { messages: timestamped }

      // Re-generate summary every 5th assistant message
      if (assistantCount > 0 && assistantCount % 5 === 0) {
        const summary = await generateSummary(messages)
        if (summary) data.summary = summary
      }

      await prisma.chatConversation.update({
        where: { id: conversationId },
        data,
      })

      return conversationId
    }

    // Create new conversation
    const userMsg = messages.find((m) => m.role === 'user')
    const title = userMsg
      ? await generateTitle(userMsg.content)
      : 'New conversation'

    const created = await prisma.chatConversation.create({
      data: {
        profileId,
        title,
        messages: timestamped,
      },
    })

    return created.id
  } catch (err) {
    console.error('Auto-save conversation error:', err instanceof Error ? err.message : err)
    console.error('Auto-save full error:', err)
    return null
  }
}

function callAnthropic(
  systemPrompt: string,
  messages: unknown[],
  includeTools: boolean,
) {
  return fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      ...ANTHROPIC_HEADERS,
      'x-api-key': getAnthropicKey(),
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      temperature: 0.7,
      stream: true,
      system: systemPrompt,
      messages,
      ...(includeTools ? { tools: chatTools } : {}),
    }),
  })
}

// ── POST handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) {
      return NextResponse.json({ error }, { status })
    }

    if (!checkRateLimit(profile.id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 30 requests per minute.' },
        { status: 429 },
      )
    }

    const body = await req.json()
    const { messages, conversationId } = body

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'messages array is required' },
        { status: 400 },
      )
    }

    const context = await gatherChatContext(profile.id)
    const today = new Date().toISOString().split('T')[0]
    const systemPrompt = buildSystemPrompt(context, today)

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const send = (payload: string) =>
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`))

        try {
          // Build the conversation messages for the API
          const apiMessages: unknown[] = messages.map(
            (m: { role: string; content: string }) => ({
              role: m.role,
              content: m.content,
            }),
          )

          let fullAssistantText = ''

          for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
            const isLastRound = round === MAX_TOOL_ROUNDS

            // On the last forced round, omit tools to guarantee a text response
            const res = await callAnthropic(
              systemPrompt,
              apiMessages,
              !isLastRound,
            )

            if (!res.ok) {
              const errBody = await res.text()
              console.error('Anthropic API error:', res.status, errBody)
              send(JSON.stringify({ error: 'AI service error' }))
              break
            }

            // Stream the response — text deltas are forwarded to the
            // client in real-time, tool_use blocks are collected.
            const { content, stopReason } = await processAnthropicStream(
              res,
              (text) => {
                send(JSON.stringify({ token: text }))
                fullAssistantText += text
              },
            )

            // If no tool calls (or last round), we're done
            if (stopReason !== 'tool_use' || isLastRound) break

            // ── Handle tool calls ────────────────────────────────────────
            // Add the assistant's full response (text + tool_use blocks)
            // to the conversation so the next API call has context.
            apiMessages.push({ role: 'assistant', content })

            const toolResults: unknown[] = []

            for (const block of content) {
              if (block.type !== 'tool_use' || !block.name) continue

              // Notify the frontend which tool is being called
              send(
                JSON.stringify({
                  status: 'calling_tool',
                  tool: block.name,
                }),
              )

              const result = await executeTool(
                block.name,
                block.input ?? {},
                profile.id,
              )

              // If this is a propose_action result, forward the card to the client
              if (
                result &&
                typeof result === 'object' &&
                (result as Record<string, unknown>).__actionCard
              ) {
                send(
                  JSON.stringify({
                    actionCard: result,
                  }),
                )
              }

              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(result),
              })
            }

            // Feed tool results back as a user message for the next round
            apiMessages.push({ role: 'user', content: toolResults })
          }

          // ── Auto-save conversation after stream completes ───────────
          if (fullAssistantText) {
            const allMessages = [
              ...messages.map((m: { role: string; content: string; timestamp?: string }) => ({
                role: m.role,
                content: m.content,
                timestamp: m.timestamp,
              })),
              {
                role: 'assistant',
                content: fullAssistantText,
                timestamp: new Date().toISOString(),
              },
            ]

            const savedId = await autoSaveConversation(
              profile.id,
              conversationId ?? null,
              allMessages,
            )

            if (savedId) {
              send(JSON.stringify({ conversationId: savedId }))
            }
          }

          send('[DONE]')
          controller.close()
        } catch (err) {
          console.error('Chat stream error:', err)
          controller.error(err)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('POST /api/chat error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
