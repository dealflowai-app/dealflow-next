/**
 * Anthropic tool definitions for the Ask AI chat route.
 *
 * These tools let Claude query the user's data in real-time
 * when the system-prompt summary isn't detailed enough.
 */

export const chatTools: Array<{
  name: string
  description: string
  input_schema: Record<string, unknown>
}> = [
  // ── a) search_buyers ──────────────────────────────────────────────────────
  {
    name: 'search_buyers',
    description:
      'Search the user\'s Buyer List with filters. Use when the user asks about specific buyers, wants to filter by status/score/market/strategy, or needs buyer details not in the initial summary.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search by first name, last name, or entity name',
        },
        status: {
          type: 'string',
          enum: ['ACTIVE', 'DORMANT', 'HIGH_CONFIDENCE', 'RECENTLY_VERIFIED', 'DO_NOT_CALL'],
          description: 'Filter by buyer status',
        },
        minScore: {
          type: 'integer',
          description: 'Minimum buyer score (0-100)',
        },
        maxScore: {
          type: 'integer',
          description: 'Maximum buyer score (0-100)',
        },
        market: {
          type: 'string',
          description: 'Filter by preferred market (e.g. "Atlanta, GA")',
        },
        propertyType: {
          type: 'string',
          enum: ['SFR', 'MULTI_FAMILY', 'LAND', 'COMMERCIAL', 'MOBILE_HOME', 'CONDO'],
          description: 'Filter by preferred property type',
        },
        strategy: {
          type: 'string',
          enum: ['FLIP', 'HOLD', 'BOTH', 'LAND', 'COMMERCIAL'],
          description: 'Filter by investment strategy',
        },
        limit: {
          type: 'integer',
          description: 'Max results (default 10, max 50)',
        },
      },
    },
  },

  // ── b) get_buyer_detail ───────────────────────────────────────────────────
  {
    name: 'get_buyer_detail',
    description:
      'Get a complete buyer profile including call history, deal matches, offers, tags, and activity timeline. Use when the user asks about a specific buyer by name or ID.',
    input_schema: {
      type: 'object',
      properties: {
        buyerId: {
          type: 'string',
          description: 'The buyer ID',
        },
      },
      required: ['buyerId'],
    },
  },

  // ── c) search_deals ──────────────────────────────────────────────────────
  {
    name: 'search_deals',
    description:
      'Search deals with filters. Use when the user asks about specific deals, wants to filter by status/location/price, or needs deal details beyond the summary.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['DRAFT', 'ACTIVE', 'UNDER_OFFER', 'CLOSED', 'CANCELLED', 'EXPIRED'],
          description: 'Filter by deal status',
        },
        city: {
          type: 'string',
          description: 'Filter by city',
        },
        state: {
          type: 'string',
          description: 'Filter by state code (e.g. "GA")',
        },
        minPrice: {
          type: 'integer',
          description: 'Minimum asking price',
        },
        maxPrice: {
          type: 'integer',
          description: 'Maximum asking price',
        },
        propertyType: {
          type: 'string',
          enum: ['SFR', 'MULTI_FAMILY', 'LAND', 'COMMERCIAL', 'MOBILE_HOME', 'CONDO'],
          description: 'Filter by property type',
        },
        limit: {
          type: 'integer',
          description: 'Max results (default 10, max 50)',
        },
      },
    },
  },

  // ── d) get_deal_detail ────────────────────────────────────────────────────
  {
    name: 'get_deal_detail',
    description:
      'Get full deal details including AI analysis, all buyer matches with scores, and offers. Use when the user asks about a specific deal.',
    input_schema: {
      type: 'object',
      properties: {
        dealId: {
          type: 'string',
          description: 'The deal ID',
        },
      },
      required: ['dealId'],
    },
  },

  // ── e) get_campaign_detail ────────────────────────────────────────────────
  {
    name: 'get_campaign_detail',
    description:
      'Get campaign details with aggregated call outcomes and recent call results. Use when the user asks about a specific campaign\'s performance or call results.',
    input_schema: {
      type: 'object',
      properties: {
        campaignId: {
          type: 'string',
          description: 'The campaign ID',
        },
      },
      required: ['campaignId'],
    },
  },

  // ── f) match_buyers_to_deal ───────────────────────────────────────────────
  {
    name: 'match_buyers_to_deal',
    description:
      'Find the best buyer matches for a specific deal using the scoring engine. Scores buyers across buy box fit, price range, strategy alignment, timing, and close probability. Use when the user asks "who should I send this deal to?" or wants buyer recommendations for a deal.',
    input_schema: {
      type: 'object',
      properties: {
        dealId: {
          type: 'string',
          description: 'The deal ID to match buyers against',
        },
        limit: {
          type: 'integer',
          description: 'Max matches to return (default 10, max 50)',
        },
      },
      required: ['dealId'],
    },
  },

  // ── g) get_pipeline_summary ───────────────────────────────────────────────
  {
    name: 'get_pipeline_summary',
    description:
      'Get a full pipeline overview: deals grouped by status with counts and total value, buyers by status, campaigns with completion percentages, and recent activity. Use for high-level business questions like "how\'s my pipeline?" or "give me a status update."',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },

  // ── h) search_marketplace ─────────────────────────────────────────────────
  {
    name: 'search_marketplace',
    description:
      'Search the DealFlow AI marketplace for active deal listings from other wholesalers. Use when the user wants to browse marketplace inventory, compare deals, or find acquisition opportunities.',
    input_schema: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: 'Filter by city',
        },
        state: {
          type: 'string',
          description: 'Filter by state code (e.g. "TX")',
        },
        propertyType: {
          type: 'string',
          enum: ['SFR', 'MULTI_FAMILY', 'LAND', 'COMMERCIAL', 'MOBILE_HOME', 'CONDO'],
          description: 'Filter by property type',
        },
        minPrice: {
          type: 'integer',
          description: 'Minimum asking price',
        },
        maxPrice: {
          type: 'integer',
          description: 'Maximum asking price',
        },
        limit: {
          type: 'integer',
          description: 'Max results (default 10, max 50)',
        },
      },
    },
  },

  // ── i) get_contract_status ────────────────────────────────────────────────
  {
    name: 'get_contract_status',
    description:
      'Get all offers and contracts for a specific deal, including status, amounts, buyer names, signature status, and timeline. Use when the user asks about contracts, signatures, or offer status on a deal.',
    input_schema: {
      type: 'object',
      properties: {
        dealId: {
          type: 'string',
          description: 'The deal ID',
        },
      },
      required: ['dealId'],
    },
  },

  // ── j) propose_action ────────────────────────────────────────────────────
  {
    name: 'propose_action',
    description:
      'Propose a platform action for the user to confirm before executing. Use this when the user wants to TAKE an action — not just get information. The frontend will render an interactive confirmation card. Always gather the needed parameters first (e.g. look up the deal ID, buyer ID) before proposing.',
    input_schema: {
      type: 'object',
      properties: {
        actionType: {
          type: 'string',
          enum: [
            // Buyer List actions
            'add_buyer',
            'update_buyer',
            'archive_buyer',
            'unarchive_buyer',
            'tag_buyer',
            'score_buyer',
            'rescore_all_buyers',
            'add_buyer_note',
            'update_buyer_status',
            'merge_buyers',
            'bulk_tag_buyers',
            'export_buyers',
            // Deal actions
            'create_deal',
            'update_deal',
            'delete_deal',
            'analyze_property',
            'match_deal',
            'send_deal_blast',
            'change_deal_status',
            // Marketplace actions
            'list_on_marketplace',
            'pause_listing',
            'reactivate_listing',
            'post_buyer_board',
            // Contract actions
            'generate_contract',
            'void_contract',
            'send_contract',
            // Outreach actions
            'create_campaign',
            'pause_campaign',
            'resume_campaign',
            'send_sms',
            'send_email',
            // Discovery actions
            'search_properties',
            'reveal_contact',
          ],
          description: 'The type of platform action to propose',
        },
        title: {
          type: 'string',
          description:
            'Human-readable action title, e.g. "Send Deal Blast to 8 Matched Buyers"',
        },
        description: {
          type: 'string',
          description: 'What will happen if the user confirms this action. For destructive actions (delete, void, archive), include a warning.',
        },
        params: {
          type: 'object',
          description:
            'Parameters needed to execute the action (varies by actionType). Examples: add_buyer: {firstName, lastName, phone, email, city, state, preferredTypes, strategy, minPrice, maxPrice}. update_buyer: {buyerId, updates: {...}}. archive_buyer/unarchive_buyer: {buyerId}. tag_buyer: {buyerId, tagId, action: "add"|"remove"}. score_buyer: {buyerId}. merge_buyers: {primaryBuyerId, secondaryBuyerIds: [...]}. bulk_tag_buyers: {tagId, buyerIds: [...], action: "add"|"remove"}. create_deal: {address, city, state, zip, propertyType, askingPrice, ...}. update_deal: {dealId, updates: {...}}. delete_deal: {dealId}. change_deal_status: {dealId, status}. match_deal: {dealId, minScore?}. send_deal_blast: {dealId, buyerIds?, channels?, minScore?}. list_on_marketplace: {dealId, headline?, description?}. pause_listing/reactivate_listing: {listingId}. post_buyer_board: {displayName, propertyTypes, markets, strategy?, minPrice?, maxPrice?, description?, buyerId?}. generate_contract: {dealId, buyerId?, offerId?, manualBuyer?}. void_contract: {contractId, reason?}. send_contract: {contractId}. create_campaign: {name, channelType?: "AI"|"SMS"|"EMAIL"}. pause_campaign/resume_campaign: {campaignId}. send_sms: {buyerId, message}. send_email: {buyerId, subject, body}. search_properties: {city, state, zip?, propertyType?, limit?}. reveal_contact: {propertyId}. analyze_property: {address, city, state, zip?}. export_buyers: {filters?}.',
        },
        estimatedImpact: {
          type: 'string',
          description:
            'Brief impact statement. For destructive actions mention permanence. For credit-consuming actions (reveal_contact) mention credit usage. For bulk actions show count.',
        },
      },
      required: ['actionType', 'title', 'description', 'params', 'estimatedImpact'],
    },
  },

  // ── k) get_market_intelligence ──────────────────────────────────────────
  {
    name: 'get_market_intelligence',
    description:
      'Get market conditions for a specific city/state: median prices, price trends, inventory levels, buyer demand, cash buyer activity, mortgage rates, and a 0-100 market health score. Use when the user asks about market conditions, whether a market is hot/cold, or needs data to evaluate a new market.',
    input_schema: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: 'City name (e.g. "Atlanta")',
        },
        state: {
          type: 'string',
          description: 'State code (e.g. "GA")',
        },
      },
      required: ['city', 'state'],
    },
  },
]
