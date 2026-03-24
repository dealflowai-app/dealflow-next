// ─── CONTRACT TEMPLATE REGISTRY ─────────────────────────────────────────────
// Structured template definitions for assignment contracts, double-close
// agreements, and JV agreements. Each template defines fillable fields
// with auto-fill sources and document sections with {{placeholder}} syntax.

export type FieldType = 'text' | 'currency' | 'date' | 'address' | 'phone' | 'email' | 'textarea'
export type ContractType = 'ASSIGNMENT' | 'DOUBLE_CLOSE' | 'JV_AGREEMENT'

export interface ContractField {
  key: string
  label: string
  type: FieldType
  required: boolean
  source?: string // auto-fill path: "deal.address", "offer.amount", "buyer.entityName", "profile.company"
}

export interface ContractSection {
  heading: string
  body: string // template text with {{fieldKey}} placeholders
}

export interface ContractTemplate {
  id: string
  name: string
  state: string
  type: ContractType
  version: string
  fields: ContractField[]
  sections: ContractSection[]
}

// ─── SHARED FIELDS ──────────────────────────────────────────────────────────
// Common fields reused across all assignment templates.

const COMMON_ASSIGNMENT_FIELDS: ContractField[] = [
  { key: 'effectiveDate', label: 'Effective Date', type: 'date', required: true },
  { key: 'assignorName', label: 'Assignor (Wholesaler) Name', type: 'text', required: true, source: 'profile.company' },
  { key: 'assignorAddress', label: 'Assignor Mailing Address', type: 'address', required: false },
  { key: 'assignorPhone', label: 'Assignor Phone', type: 'phone', required: false, source: 'profile.phone' },
  { key: 'assignorEmail', label: 'Assignor Email', type: 'email', required: false, source: 'profile.email' },
  { key: 'assigneeName', label: 'Assignee (Buyer) Name', type: 'text', required: true, source: 'buyer.entityName' },
  { key: 'assigneeAddress', label: 'Assignee Mailing Address', type: 'address', required: false, source: 'buyer.address' },
  { key: 'assigneePhone', label: 'Assignee Phone', type: 'phone', required: false, source: 'buyer.phone' },
  { key: 'assigneeEmail', label: 'Assignee Email', type: 'email', required: false, source: 'buyer.email' },
  { key: 'sellerName', label: "Seller's Full Legal Name", type: 'text', required: true },
  { key: 'propertyAddress', label: 'Property Address', type: 'address', required: true, source: 'deal.fullAddress' },
  { key: 'legalDescription', label: 'Legal Description', type: 'textarea', required: false },
  { key: 'propertyType', label: 'Property Type', type: 'text', required: false, source: 'deal.propertyType' },
  { key: 'originalPurchasePrice', label: 'Original Purchase Price', type: 'currency', required: true, source: 'deal.askingPrice' },
  { key: 'assignmentFee', label: 'Assignment Fee', type: 'currency', required: true, source: 'deal.assignFee' },
  { key: 'totalConsideration', label: 'Total Consideration (Purchase Price + Assignment Fee)', type: 'currency', required: true },
  { key: 'earnestMoneyAmount', label: 'Earnest Money Deposit', type: 'currency', required: true },
  { key: 'earnestMoneyHolder', label: 'Earnest Money Held By', type: 'text', required: true },
  { key: 'closingDate', label: 'Closing Date', type: 'date', required: true, source: 'offer.closeDate' },
  { key: 'titleCompany', label: 'Title Company / Closing Agent', type: 'text', required: true },
  { key: 'inspectionPeriodDays', label: 'Buyer Inspection Period (Days)', type: 'text', required: false },
  { key: 'originalContractDate', label: 'Date of Original Purchase Contract', type: 'date', required: false },
]

// ─── SHARED SECTIONS (state-neutral) ────────────────────────────────────────

function makeAssignmentSections(stateGoverningLaw: string): ContractSection[] {
  return [
    {
      heading: 'Assignment of Contract Agreement',
      body:
        'This Assignment of Contract Agreement (the "Agreement") is entered into as of {{effectiveDate}} (the "Effective Date"), by and between {{assignorName}} ("Assignor") and {{assigneeName}} ("Assignee"). The Assignor and Assignee are collectively referred to herein as the "Parties." This Agreement sets forth the terms and conditions under which the Assignor shall assign all rights, title, and interest in and to the Original Purchase Contract described herein to the Assignee.',
    },
    {
      heading: 'Recitals',
      body:
        'WHEREAS, the Assignor entered into a certain Real Estate Purchase Contract dated {{originalContractDate}} (the "Original Contract") with {{sellerName}} ("Seller") for the purchase of the Property described below; and WHEREAS, the Original Contract permits assignment of the Assignor\'s rights and obligations thereunder, or does not expressly prohibit such assignment; and WHEREAS, the Assignor desires to assign all of its rights, title, and interest in and to the Original Contract to the Assignee, and the Assignee desires to accept such assignment and assume all obligations of the Assignor under the Original Contract. NOW, THEREFORE, in consideration of the mutual covenants and agreements hereinafter set forth, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the Parties agree as follows.',
    },
    {
      heading: 'Section 1 — Property Description',
      body:
        'The real property that is the subject of the Original Contract is located at {{propertyAddress}} and is more particularly described as: {{legalDescription}} (the "Property"). The Property is classified as {{propertyType}}. All improvements, fixtures, and appurtenances attached to or used in connection with the Property are included in this assignment unless expressly excluded in writing.',
    },
    {
      heading: 'Section 2 — Assignment of Rights and Obligations',
      body:
        'The Assignor hereby assigns, transfers, and conveys to the Assignee all of the Assignor\'s rights, title, and interest in and to the Original Contract, including but not limited to the right to purchase the Property on the terms and conditions set forth therein. The Assignee hereby accepts such assignment and agrees to assume and perform all of the Assignor\'s obligations under the Original Contract from and after the Effective Date. The Assignee shall be bound by all terms, conditions, and provisions of the Original Contract as if the Assignee were an original party thereto.',
    },
    {
      heading: 'Section 3 — Assignment Fee',
      body:
        'In consideration for this assignment, the Assignee agrees to pay the Assignor an assignment fee of {{assignmentFee}} (the "Assignment Fee"). The Assignment Fee shall be due and payable at closing and shall be disbursed through the closing agent or title company handling the transaction. The original purchase price under the Original Contract is {{originalPurchasePrice}}, bringing the total consideration for the Property to {{totalConsideration}}. The Assignment Fee is non-refundable once the transaction closes, except as otherwise provided herein.',
    },
    {
      heading: 'Section 4 — Earnest Money',
      body:
        'The Assignee shall deposit earnest money in the amount of {{earnestMoneyAmount}} (the "Earnest Money Deposit") with {{earnestMoneyHolder}} within three (3) business days of the Effective Date of this Agreement. The Earnest Money Deposit shall be applied toward the purchase price at closing. In the event this transaction does not close due to the Assignee\'s default, the Earnest Money Deposit shall be disbursed in accordance with the terms of the Original Contract and applicable law. If the transaction fails to close through no fault of the Assignee, the Earnest Money Deposit shall be refunded to the Assignee.',
    },
    {
      heading: 'Section 5 — Closing',
      body:
        'The closing of the transaction contemplated by this Agreement shall take place on or before {{closingDate}} at the offices of {{titleCompany}}, or at such other location as the Parties may mutually agree upon in writing. The Assignee shall be responsible for all closing costs customarily borne by the buyer, including but not limited to title insurance, recording fees, and any lender-required charges. The Assignor shall be responsible for paying any transfer taxes or fees associated with the assignment itself, unless otherwise agreed.',
    },
    {
      heading: 'Section 6 — Representations and Warranties',
      body:
        'The Assignor represents and warrants to the Assignee that: (a) the Assignor has the full legal right and authority to enter into this Agreement and to assign the Original Contract; (b) the Original Contract is in full force and effect and has not been modified, amended, or terminated except as disclosed herein; (c) the Assignor is not in default under the Original Contract and no event has occurred that, with notice or the passage of time, would constitute a default; (d) there are no liens, encumbrances, or claims against the Assignor\'s interest in the Original Contract; and (e) the Assignor has not previously assigned, pledged, or otherwise transferred any interest in the Original Contract to any third party.',
    },
    {
      heading: 'Section 7 — Conditions Precedent',
      body:
        'The obligations of the Assignee under this Agreement are subject to the following conditions: (a) the Seller shall deliver clear and marketable title to the Property, free of all liens and encumbrances except those acceptable to the Assignee; (b) the Assignee shall have a period of {{inspectionPeriodDays}} days from the Effective Date to conduct inspections of the Property, during which time the Assignee may terminate this Agreement for any reason by providing written notice to the Assignor; (c) all representations and warranties of the Assignor shall be true and correct as of the closing date; and (d) there shall be no material adverse change in the condition of the Property between the Effective Date and the closing date.',
    },
    {
      heading: 'Section 8 — Default and Remedies',
      body:
        'In the event the Assignee fails to perform its obligations under this Agreement or the Original Contract, the Assignor\'s sole remedy shall be to retain the Earnest Money Deposit as liquidated damages, and this Agreement shall thereupon be terminated. In the event the Assignor fails to perform its obligations under this Agreement, the Assignee shall be entitled to seek specific performance or to recover actual damages incurred as a result of such failure. The prevailing party in any legal action arising under this Agreement shall be entitled to recover reasonable attorney\'s fees and costs from the non-prevailing party.',
    },
    {
      heading: 'Section 9 — Governing Law',
      body: stateGoverningLaw,
    },
    {
      heading: 'Section 10 — Miscellaneous',
      body:
        'This Agreement constitutes the entire agreement between the Parties with respect to the subject matter hereof and supersedes all prior negotiations, representations, warranties, commitments, offers, and agreements, whether written or oral. This Agreement may not be amended or modified except by a written instrument signed by both Parties. If any provision of this Agreement is held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect. This Agreement may be executed in counterparts, each of which shall be deemed an original, and all of which together shall constitute one and the same instrument. Time is of the essence with respect to all dates and deadlines set forth in this Agreement.',
    },
    {
      heading: 'Signatures',
      body:
        'IN WITNESS WHEREOF, the Parties have executed this Assignment of Contract Agreement as of the date first written above.\n\nASSIGNOR:\n\nSignature: ___________________________\nPrinted Name: {{assignorName}}\nDate: ___________________________\n\nASSIGNEE:\n\nSignature: ___________________________\nPrinted Name: {{assigneeName}}\nDate: ___________________________',
    },
  ]
}

// ─── STATE-SPECIFIC GOVERNING LAW CLAUSES ───────────────────────────────────

function makeGoverningLaw(stateCode: string, stateName: string, extras: string = ''): string {
  return `This Agreement shall be governed by and construed in accordance with the laws of the State of ${stateName}, without regard to its conflict of laws principles. Any dispute arising under this Agreement shall be resolved in the state or federal courts located in the county where the Property is situated. The Assignor represents compliance with all applicable ${stateName} real estate laws and regulations governing the assignment of real property contracts. The Parties agree that all required disclosures under ${stateName} law have been or will be provided prior to closing.${extras ? ' ' + extras : ''}`
}

const GOVERNING_LAW: Record<string, string> = {
  TX:
    'This Agreement shall be governed by and construed in accordance with the laws of the State of Texas, without regard to its conflict of laws principles. All references to statutory authority herein shall include the Texas Property Code, the Texas Business and Commerce Code, and any applicable provisions of the Texas Real Estate License Act (Chapter 1101, Texas Occupations Code). Any dispute arising under this Agreement shall be resolved in the state or federal courts located in the county where the Property is situated. The Parties acknowledge that Texas law requires certain disclosures in real estate transactions, and the Assignor represents that all required disclosures have been made or will be made prior to closing.',

  FL:
    'This Agreement shall be governed by and construed in accordance with the laws of the State of Florida, without regard to its conflict of laws principles. The Parties acknowledge the applicability of Florida Statute Chapter 475 (Real Estate Brokers, Sales Associates, and Schools) and Chapter 689 (Conveyances of Land and Declarations of Trust) to this transaction. Any dispute arising under this Agreement shall be resolved in the state or federal courts located in the county where the Property is situated. The Assignor represents compliance with all Florida assignment disclosure requirements and acknowledges that failure to disclose the assignment nature of this transaction may result in liability under Florida law.',

  GA:
    'This Agreement shall be governed by and construed in accordance with the laws of the State of Georgia, without regard to its conflict of laws principles. The Parties acknowledge the applicability of the Georgia Real Estate Appraisers Board (GREAB) regulations and Title 44 of the Official Code of Georgia Annotated (O.C.G.A.) governing real property transactions. Any dispute arising under this Agreement shall be resolved in the state or federal courts located in the county where the Property is situated. The Assignor represents that this assignment complies with all applicable Georgia real estate laws and that all required disclosures under Georgia law have been or will be provided to the Seller and Assignee prior to closing.',

  AZ:
    'This Agreement shall be governed by and construed in accordance with the laws of the State of Arizona, without regard to its conflict of laws principles. The Parties acknowledge the applicability of the Arizona Revised Statutes (A.R.S.) Title 33 (Property) and Title 32, Chapter 20 (Real Estate) to this transaction. Any dispute arising under this Agreement shall be resolved in the state or federal courts located in the county where the Property is situated. The Assignor represents compliance with all Arizona Department of Real Estate regulations and acknowledges that Arizona law requires good faith and fair dealing in all real estate transactions. The Parties further acknowledge that Arizona is a community property state and that appropriate spousal consents may be required.',

  OH:
    'This Agreement shall be governed by and construed in accordance with the laws of the State of Ohio, without regard to its conflict of laws principles. The Parties acknowledge the applicability of the Ohio Revised Code (O.R.C.) Title LIII (Real Property) and Chapter 4735 (Real Estate Brokers and Salespersons) to this transaction. Any dispute arising under this Agreement shall be resolved in the state or federal courts located in the county where the Property is situated. The Assignor represents compliance with all applicable Ohio real estate laws, including any disclosure requirements under O.R.C. § 5302.30 (Residential Property Disclosure Form), and acknowledges that Ohio law requires fair dealing in real property transactions.',

  // ── Additional states ──
  AL: makeGoverningLaw('AL', 'Alabama', 'The Parties acknowledge the applicability of Alabama Code Title 34, Chapter 27 (Real Estate Brokers and Salesmen) and Title 35 (Property) to this transaction.'),
  AK: makeGoverningLaw('AK', 'Alaska', 'The Parties acknowledge the applicability of Alaska Statutes Title 34 (Property) and Title 08, Chapter 88 (Real Estate Brokers and Salespersons) to this transaction.'),
  AR: makeGoverningLaw('AR', 'Arkansas', 'The Parties acknowledge the applicability of Arkansas Code Title 17, Chapter 42 (Real Estate License Law) and Title 18 (Property) to this transaction.'),
  CA: makeGoverningLaw('CA', 'California', 'The Parties acknowledge the applicability of the California Civil Code (Division 2 — Property), the California Business and Professions Code (Part 1, Division 4 — Real Estate), and all applicable Department of Real Estate regulations. California is a community property state and appropriate spousal consents may be required.'),
  CO: makeGoverningLaw('CO', 'Colorado', 'The Parties acknowledge the applicability of Colorado Revised Statutes Title 12, Article 10 (Real Estate Brokers and Salespersons) and Title 38 (Property — Real and Personal) to this transaction.'),
  CT: makeGoverningLaw('CT', 'Connecticut', 'The Parties acknowledge the applicability of Connecticut General Statutes Title 20, Chapter 392 (Real Estate Brokers and Salespersons) and Title 47 (Property) to this transaction.'),
  DE: makeGoverningLaw('DE', 'Delaware', 'The Parties acknowledge the applicability of Delaware Code Title 24, Chapter 29 (Real Estate Commission) and Title 25 (Property) to this transaction.'),
  HI: makeGoverningLaw('HI', 'Hawaii', 'The Parties acknowledge the applicability of Hawaii Revised Statutes Chapter 467 (Real Estate Brokers and Salespersons) and Chapter 501-516 (Property) to this transaction.'),
  ID: makeGoverningLaw('ID', 'Idaho', 'The Parties acknowledge the applicability of Idaho Code Title 54, Chapter 20 (Real Estate Brokers) and Title 55 (Property in General) to this transaction. Idaho is a community property state and appropriate spousal consents may be required.'),
  IL: makeGoverningLaw('IL', 'Illinois', 'The Parties acknowledge the applicability of the Illinois Real Estate License Act (225 ILCS 454) and the Illinois Compiled Statutes Title 765 (Property) to this transaction.'),
  IN: makeGoverningLaw('IN', 'Indiana', 'The Parties acknowledge the applicability of Indiana Code Title 25, Article 34.1 (Real Estate Brokers) and Title 32 (Property) to this transaction.'),
  IA: makeGoverningLaw('IA', 'Iowa', 'The Parties acknowledge the applicability of Iowa Code Chapter 543B (Real Estate Brokers and Salespersons) and Title XIV (Property) to this transaction.'),
  KS: makeGoverningLaw('KS', 'Kansas', 'The Parties acknowledge the applicability of Kansas Statutes Chapter 58 (Personal and Real Property) and Chapter 58a (Real Estate Brokers and Salespersons Licensing Act) to this transaction.'),
  KY: makeGoverningLaw('KY', 'Kentucky', 'The Parties acknowledge the applicability of Kentucky Revised Statutes Chapter 324 (Real Estate Brokers and Salespersons) and Title XXXII (Property) to this transaction.'),
  LA: makeGoverningLaw('LA', 'Louisiana', 'The Parties acknowledge the applicability of the Louisiana Civil Code (Book II — Things and the Different Modifications of Ownership) and Louisiana Revised Statutes Title 37, Chapter 17 (Real Estate Brokers). Louisiana follows a civil law system and the Parties acknowledge the unique provisions of Louisiana property law regarding the transfer of real property rights.'),
  ME: makeGoverningLaw('ME', 'Maine', 'The Parties acknowledge the applicability of Maine Revised Statutes Title 32, Chapter 114 (Real Estate Brokerage License Act) and Title 33 (Property) to this transaction.'),
  MD: makeGoverningLaw('MD', 'Maryland', 'The Parties acknowledge the applicability of Maryland Code, Business Occupations and Professions Article, Title 17 (Real Estate Brokers) and Real Property Article to this transaction.'),
  MA: makeGoverningLaw('MA', 'Massachusetts', 'The Parties acknowledge the applicability of Massachusetts General Laws Chapter 112, Section 87PP-87DDD (Real Estate Brokers and Salespersons) and Chapter 183-189 (Real Property) to this transaction.'),
  MI: makeGoverningLaw('MI', 'Michigan', 'The Parties acknowledge the applicability of Michigan Compiled Laws Chapter 339 (Occupational Code — Real Estate Brokers and Salespersons) and the Michigan Land Division Act to this transaction.'),
  MN: makeGoverningLaw('MN', 'Minnesota', 'The Parties acknowledge the applicability of Minnesota Statutes Chapter 82 (Real Estate Brokers and Salespersons) and Chapter 507-515 (Real Property) to this transaction.'),
  MS: makeGoverningLaw('MS', 'Mississippi', 'The Parties acknowledge the applicability of Mississippi Code Title 73, Chapter 35 (Real Estate Brokers and Salespersons) and Title 89 (Real and Personal Property) to this transaction.'),
  MO: makeGoverningLaw('MO', 'Missouri', 'The Parties acknowledge the applicability of Missouri Revised Statutes Chapter 339 (Real Estate Agents and Brokers) and Chapter 442 (Titles and Conveyances of Real Estate) to this transaction.'),
  MT: makeGoverningLaw('MT', 'Montana', 'The Parties acknowledge the applicability of Montana Code Title 37, Chapter 51 (Real Estate Brokers and Salespersons) and Title 70 (Property) to this transaction.'),
  NE: makeGoverningLaw('NE', 'Nebraska', 'The Parties acknowledge the applicability of Nebraska Revised Statutes Chapter 76 (Real Property) and Chapter 81, Article 8 (Real Estate Commission) to this transaction.'),
  NV: makeGoverningLaw('NV', 'Nevada', 'The Parties acknowledge the applicability of Nevada Revised Statutes Chapter 645 (Real Estate Brokers and Salespersons) and Chapter 111 (Estates in Property, Conveyancing, and Recording) to this transaction. Nevada is a community property state and appropriate spousal consents may be required.'),
  NH: makeGoverningLaw('NH', 'New Hampshire', 'The Parties acknowledge the applicability of New Hampshire Revised Statutes Title XXXI, Chapter 331-A (Real Estate Practice Act) and Title XLVIII (Conveyances and Mortgages of Realty) to this transaction.'),
  NJ: makeGoverningLaw('NJ', 'New Jersey', 'The Parties acknowledge the applicability of New Jersey Statutes Title 45, Chapter 15 (Real Estate Brokers and Salespersons) and Title 46 (Property) to this transaction.'),
  NM: makeGoverningLaw('NM', 'New Mexico', 'The Parties acknowledge the applicability of New Mexico Statutes Chapter 61, Article 29 (Real Estate Brokers) and Chapter 47 (Property Law) to this transaction. New Mexico is a community property state and appropriate spousal consents may be required.'),
  NY: makeGoverningLaw('NY', 'New York', 'The Parties acknowledge the applicability of New York Real Property Law, the New York General Obligations Law, and Article 12-A of the Real Property Law (Real Estate Brokers and Salespersons) to this transaction.'),
  NC: makeGoverningLaw('NC', 'North Carolina', 'The Parties acknowledge the applicability of North Carolina General Statutes Chapter 93A (Real Estate License Law) and Chapter 39-47 (Property) to this transaction.'),
  ND: makeGoverningLaw('ND', 'North Dakota', 'The Parties acknowledge the applicability of North Dakota Century Code Title 43, Chapter 23 (Real Estate Brokers and Salespersons) and Title 47 (Property) to this transaction.'),
  OK: makeGoverningLaw('OK', 'Oklahoma', 'The Parties acknowledge the applicability of Oklahoma Statutes Title 59, Chapter 15 (Real Estate License Code) and Title 60 (Property) to this transaction.'),
  OR: makeGoverningLaw('OR', 'Oregon', 'The Parties acknowledge the applicability of Oregon Revised Statutes Chapter 696 (Real Estate and Escrow Activities) and Chapter 93-105 (Property Rights and Transactions) to this transaction.'),
  PA: makeGoverningLaw('PA', 'Pennsylvania', 'The Parties acknowledge the applicability of the Pennsylvania Real Estate Licensing and Registration Act (63 P.S. § 455.101 et seq.) and Title 68 (Real and Personal Property) to this transaction.'),
  RI: makeGoverningLaw('RI', 'Rhode Island', 'The Parties acknowledge the applicability of Rhode Island General Laws Title 5, Chapter 20.5 (Real Estate Brokers and Salespersons) and Title 34 (Property) to this transaction.'),
  SC: makeGoverningLaw('SC', 'South Carolina', 'The Parties acknowledge the applicability of South Carolina Code Title 40, Chapter 57 (Real Estate Brokers, Salesmen, and Property Managers) and Title 27 (Property and Conveyances) to this transaction.'),
  SD: makeGoverningLaw('SD', 'South Dakota', 'The Parties acknowledge the applicability of South Dakota Codified Laws Title 36, Chapter 21A (Real Estate Brokers and Salespersons) and Title 43 (Property) to this transaction.'),
  TN: makeGoverningLaw('TN', 'Tennessee', 'The Parties acknowledge the applicability of Tennessee Code Title 62, Chapter 13 (Real Estate Broker License Act) and Title 66 (Property) to this transaction.'),
  UT: makeGoverningLaw('UT', 'Utah', 'The Parties acknowledge the applicability of Utah Code Title 61, Chapter 2f (Real Estate Licensing and Practices Act) and Title 57 (Real Estate) to this transaction.'),
  VT: makeGoverningLaw('VT', 'Vermont', 'The Parties acknowledge the applicability of Vermont Statutes Title 26, Chapter 41 (Real Estate Brokers and Salespersons) and Title 27 (Property) to this transaction.'),
  VA: makeGoverningLaw('VA', 'Virginia', 'The Parties acknowledge the applicability of the Virginia Code Title 54.1, Chapter 21 (Real Estate Brokers, Salespersons, and Rental Location Agents) and Title 55.1 (Property and Conveyances) to this transaction.'),
  WA: makeGoverningLaw('WA', 'Washington', 'The Parties acknowledge the applicability of the Revised Code of Washington Title 18, Chapter 85 (Real Estate Brokers and Managing Brokers) and Title 64 (Real Property and Conveyances) to this transaction. Washington is a community property state and appropriate spousal consents may be required.'),
  WV: makeGoverningLaw('WV', 'West Virginia', 'The Parties acknowledge the applicability of West Virginia Code Chapter 30, Article 40 (Real Estate Brokers and Salespersons) and Chapter 36 (Estates and Property) to this transaction.'),
  WI: makeGoverningLaw('WI', 'Wisconsin', 'The Parties acknowledge the applicability of Wisconsin Statutes Chapter 452 (Real Estate Practice) and Chapter 706-710 (Real Property) to this transaction. Wisconsin is a community property state (marital property) and appropriate spousal consents may be required.'),
  WY: makeGoverningLaw('WY', 'Wyoming', 'The Parties acknowledge the applicability of Wyoming Statutes Title 33, Chapter 28 (Real Estate Brokers, Agents, and Salespersons) and Title 34 (Property, Real and Personal) to this transaction.'),
  DC: makeGoverningLaw('DC', 'the District of Columbia', 'The Parties acknowledge the applicability of the D.C. Code Title 42 (Real Property) and Title 47, Chapter 28 (Real Estate Transactions) to this transaction.'),
}

// ─── ASSIGNMENT TEMPLATES (5 states) ────────────────────────────────────────

function makeAssignmentTemplate(state: string, stateName: string): ContractTemplate {
  return {
    id: `${state.toLowerCase()}_assignment_v1`,
    name: `${stateName} Assignment Agreement`,
    state,
    type: 'ASSIGNMENT',
    version: '1.0',
    fields: [...COMMON_ASSIGNMENT_FIELDS],
    sections: makeAssignmentSections(GOVERNING_LAW[state]),
  }
}

// ─── ALL 50 STATES + DC ASSIGNMENT TEMPLATES ─────────────────────────────────

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
}

const ALL_ASSIGNMENT_TEMPLATES = Object.entries(STATE_NAMES)
  .filter(([code]) => GOVERNING_LAW[code]) // Only states with governing law defined
  .map(([code, name]) => makeAssignmentTemplate(code, name))

// Keep named references for backward compatibility
const TX_ASSIGNMENT = ALL_ASSIGNMENT_TEMPLATES.find(t => t.state === 'TX')!
const FL_ASSIGNMENT = ALL_ASSIGNMENT_TEMPLATES.find(t => t.state === 'FL')!
const GA_ASSIGNMENT = ALL_ASSIGNMENT_TEMPLATES.find(t => t.state === 'GA')!
const AZ_ASSIGNMENT = ALL_ASSIGNMENT_TEMPLATES.find(t => t.state === 'AZ')!
const OH_ASSIGNMENT = ALL_ASSIGNMENT_TEMPLATES.find(t => t.state === 'OH')!

// ─── DOUBLE CLOSE TEMPLATE (TX only for MVP) ───────────────────────────────

const TX_DOUBLE_CLOSE: ContractTemplate = {
  id: 'tx_double_close_v1',
  name: 'Texas Double Close Agreement',
  state: 'TX',
  type: 'DOUBLE_CLOSE',
  version: '1.0',
  fields: [
    { key: 'effectiveDate', label: 'Effective Date', type: 'date', required: true },
    { key: 'buyerName', label: 'End Buyer Name', type: 'text', required: true, source: 'buyer.entityName' },
    { key: 'buyerAddress', label: 'End Buyer Address', type: 'address', required: false, source: 'buyer.address' },
    { key: 'buyerPhone', label: 'End Buyer Phone', type: 'phone', required: false, source: 'buyer.phone' },
    { key: 'buyerEmail', label: 'End Buyer Email', type: 'email', required: false, source: 'buyer.email' },
    { key: 'wholesalerName', label: 'Wholesaler / Intermediary Name', type: 'text', required: true, source: 'profile.company' },
    { key: 'wholesalerAddress', label: 'Wholesaler Mailing Address', type: 'address', required: false },
    { key: 'sellerName', label: "Seller's Full Legal Name", type: 'text', required: true },
    { key: 'propertyAddress', label: 'Property Address', type: 'address', required: true, source: 'deal.fullAddress' },
    { key: 'legalDescription', label: 'Legal Description', type: 'textarea', required: false },
    { key: 'abPurchasePrice', label: 'A-to-B Purchase Price (Wholesaler buys from Seller)', type: 'currency', required: true, source: 'deal.askingPrice' },
    { key: 'bcSalePrice', label: 'B-to-C Sale Price (Wholesaler sells to End Buyer)', type: 'currency', required: true, source: 'offer.amount' },
    { key: 'wholesalerProfit', label: 'Wholesaler Profit (B-C minus A-B)', type: 'currency', required: true, source: 'deal.assignFee' },
    { key: 'earnestMoneyAmount', label: 'Earnest Money Deposit', type: 'currency', required: true },
    { key: 'earnestMoneyHolder', label: 'Earnest Money Held By', type: 'text', required: true },
    { key: 'closingDate', label: 'Closing Date', type: 'date', required: true, source: 'offer.closeDate' },
    { key: 'titleCompany', label: 'Title Company', type: 'text', required: true },
    { key: 'inspectionPeriodDays', label: 'Buyer Inspection Period (Days)', type: 'text', required: false },
  ],
  sections: [
    {
      heading: 'Double Close Purchase Agreement',
      body:
        'This Double Close Purchase Agreement (the "Agreement") is entered into as of {{effectiveDate}} by and between {{wholesalerName}} ("Seller/Intermediary") and {{buyerName}} ("Buyer"). This Agreement governs the second closing (the "B-to-C Transaction") of a simultaneous double close, whereby the Seller/Intermediary will acquire the Property from the original seller (the "A-to-B Transaction") and immediately resell the Property to the Buyer. Both closings shall occur on the same date or within the timeframe specified herein.',
    },
    {
      heading: 'Recitals',
      body:
        'WHEREAS, {{wholesalerName}} has entered into a purchase contract with {{sellerName}} to acquire the Property described below at a purchase price of {{abPurchasePrice}} (the "A-to-B Contract"); and WHEREAS, {{wholesalerName}} desires to sell the Property to {{buyerName}} at a sale price of {{bcSalePrice}} immediately upon acquiring title; and WHEREAS, both transactions are intended to close simultaneously or in immediate succession through {{titleCompany}}, with the proceeds from the B-to-C Transaction funding the A-to-B Transaction. NOW, THEREFORE, the Parties agree as follows.',
    },
    {
      heading: 'Section 1 — Property Description',
      body:
        'The real property that is the subject of this Agreement is located at {{propertyAddress}} and is more particularly described as: {{legalDescription}} (the "Property"). All improvements, fixtures, and appurtenances are included unless expressly excluded.',
    },
    {
      heading: 'Section 2 — Purchase Price and Funding',
      body:
        'The Buyer agrees to purchase the Property from the Seller/Intermediary for {{bcSalePrice}} (the "B-to-C Purchase Price"). The Seller/Intermediary\'s acquisition cost under the A-to-B Contract is {{abPurchasePrice}}, resulting in a gross profit to the Seller/Intermediary of {{wholesalerProfit}}. The Buyer acknowledges that the Seller/Intermediary is acquiring the Property simultaneously and that the Buyer\'s funds will be used to complete both transactions. The Buyer\'s purchase price and the Seller/Intermediary\'s acquisition cost are independent transactions and the Buyer has no claim to the difference between them.',
    },
    {
      heading: 'Section 3 — Earnest Money',
      body:
        'The Buyer shall deposit earnest money in the amount of {{earnestMoneyAmount}} with {{earnestMoneyHolder}} within three (3) business days of the Effective Date. The Earnest Money Deposit shall be applied toward the purchase price at closing. If the transaction fails to close due to the Buyer\'s default, the deposit shall be retained as liquidated damages. If the transaction fails through no fault of the Buyer, including the Seller/Intermediary\'s inability to complete the A-to-B Transaction, the deposit shall be refunded in full to the Buyer.',
    },
    {
      heading: 'Section 4 — Closing',
      body:
        'Both the A-to-B and B-to-C closings shall take place on or before {{closingDate}} at {{titleCompany}}. The Buyer acknowledges that completion of the B-to-C Transaction is contingent upon the successful closing of the A-to-B Transaction. If the A-to-B Transaction fails to close for any reason, this Agreement shall be void and the Buyer\'s earnest money shall be refunded. The title company shall handle both closings and ensure proper sequencing of deed transfers and fund disbursements.',
    },
    {
      heading: 'Section 5 — Inspections and Conditions',
      body:
        'The Buyer shall have {{inspectionPeriodDays}} days from the Effective Date to inspect the Property. During this period the Buyer may terminate this Agreement for any reason by written notice. The Buyer acknowledges that the Seller/Intermediary makes no warranties regarding the condition of the Property beyond those contained in the A-to-B Contract. Title must be clear and marketable at closing, and the Seller/Intermediary shall cause the original seller to deliver such title through the A-to-B Transaction.',
    },
    {
      heading: 'Section 6 — Governing Law',
      body: GOVERNING_LAW.TX,
    },
    {
      heading: 'Signatures',
      body:
        'IN WITNESS WHEREOF, the Parties have executed this Double Close Purchase Agreement as of the date first written above.\n\nSELLER/INTERMEDIARY:\n\nSignature: ___________________________\nPrinted Name: {{wholesalerName}}\nDate: ___________________________\n\nBUYER:\n\nSignature: ___________________________\nPrinted Name: {{buyerName}}\nDate: ___________________________',
    },
  ],
}

// ─── JV AGREEMENT TEMPLATE (multi-state) ────────────────────────────────────

const JV_AGREEMENT: ContractTemplate = {
  id: 'jv_agreement_v1',
  name: 'Joint Venture Wholesale Agreement',
  state: 'ALL',
  type: 'JV_AGREEMENT',
  version: '1.0',
  fields: [
    { key: 'effectiveDate', label: 'Effective Date', type: 'date', required: true },
    { key: 'partyAName', label: 'JV Partner A (Deal Sourcer)', type: 'text', required: true, source: 'profile.company' },
    { key: 'partyAAddress', label: 'Partner A Mailing Address', type: 'address', required: false },
    { key: 'partyAPhone', label: 'Partner A Phone', type: 'phone', required: false, source: 'profile.phone' },
    { key: 'partyAEmail', label: 'Partner A Email', type: 'email', required: false, source: 'profile.email' },
    { key: 'partyBName', label: 'JV Partner B (Buyer Provider)', type: 'text', required: true, source: 'buyer.entityName' },
    { key: 'partyBAddress', label: 'Partner B Mailing Address', type: 'address', required: false, source: 'buyer.address' },
    { key: 'partyBPhone', label: 'Partner B Phone', type: 'phone', required: false, source: 'buyer.phone' },
    { key: 'partyBEmail', label: 'Partner B Email', type: 'email', required: false, source: 'buyer.email' },
    { key: 'propertyAddress', label: 'Property Address', type: 'address', required: true, source: 'deal.fullAddress' },
    { key: 'legalDescription', label: 'Legal Description', type: 'textarea', required: false },
    { key: 'sellerName', label: "Seller's Full Legal Name", type: 'text', required: true },
    { key: 'contractPrice', label: 'Contract Price with Seller', type: 'currency', required: true, source: 'deal.askingPrice' },
    { key: 'targetSalePrice', label: 'Target Sale / Assignment Price', type: 'currency', required: true, source: 'offer.amount' },
    { key: 'projectedProfit', label: 'Projected Profit', type: 'currency', required: true, source: 'deal.assignFee' },
    { key: 'partyASplit', label: 'Partner A Profit Split (%)', type: 'text', required: true },
    { key: 'partyBSplit', label: 'Partner B Profit Split (%)', type: 'text', required: true },
    { key: 'closingDate', label: 'Target Closing Date', type: 'date', required: true, source: 'offer.closeDate' },
    { key: 'titleCompany', label: 'Title Company', type: 'text', required: true },
    { key: 'governingState', label: 'Governing State', type: 'text', required: true, source: 'deal.state' },
  ],
  sections: [
    {
      heading: 'Joint Venture Wholesale Agreement',
      body:
        'This Joint Venture Wholesale Agreement (the "Agreement") is entered into as of {{effectiveDate}} by and between {{partyAName}} ("Partner A") and {{partyBName}} ("Partner B"), collectively the "JV Partners." This Agreement establishes the terms under which the JV Partners will collaborate to wholesale the real property described herein, with Partner A providing the deal and Partner B providing the end buyer or disposition channel. Both parties agree to work cooperatively and in good faith to close the transaction and split the profits as described below.',
    },
    {
      heading: 'Recitals',
      body:
        'WHEREAS, Partner A has secured or is in the process of securing a purchase contract with {{sellerName}} for the Property described below at a contract price of {{contractPrice}}; and WHEREAS, Partner B has access to qualified cash buyers, investor networks, or disposition channels capable of purchasing the Property at or above the target sale price; and WHEREAS, the JV Partners desire to combine their respective resources, expertise, and networks to complete the wholesale transaction and share the resulting profits. NOW, THEREFORE, in consideration of the mutual promises contained herein, the JV Partners agree as follows.',
    },
    {
      heading: 'Section 1 — Property and Deal Overview',
      body:
        'The subject property is located at {{propertyAddress}}, more particularly described as: {{legalDescription}} (the "Property"). The contract price with the Seller is {{contractPrice}}, and the target sale or assignment price to the end buyer is {{targetSalePrice}}, resulting in a projected gross profit of {{projectedProfit}}. The target closing date is {{closingDate}}, with closing to occur at {{titleCompany}}. Both JV Partners acknowledge these figures are estimates and the actual profit may vary based on final negotiated terms and closing costs.',
    },
    {
      heading: 'Section 2 — Roles and Responsibilities',
      body:
        'Partner A ("Deal Sourcer") is responsible for: (a) securing and maintaining the purchase contract with the Seller; (b) handling all communications with the Seller and Seller\'s representatives; (c) ensuring the contract remains in good standing through closing; and (d) coordinating with the title company on the acquisition side. Partner B ("Buyer Provider") is responsible for: (a) identifying and securing a qualified end buyer for the Property; (b) negotiating the sale or assignment terms with the end buyer; (c) ensuring the end buyer has proof of funds and can close by the target date; and (d) coordinating with the title company on the disposition side. Both Partners shall communicate regularly and make decisions jointly on material matters affecting the transaction.',
    },
    {
      heading: 'Section 3 — Profit Split',
      body:
        'The net profit from the transaction (gross profit minus all closing costs, marketing expenses, and any other agreed-upon expenses) shall be split as follows: Partner A shall receive {{partyASplit}}% and Partner B shall receive {{partyBSplit}}% of the net profit. Profit shall be disbursed at closing through the title company directly to each Partner\'s designated account. In the event the transaction results in a loss, both Partners shall bear the loss in the same proportions as the profit split. Neither Partner shall incur expenses exceeding $500 without the prior written consent of the other Partner.',
    },
    {
      heading: 'Section 4 — Exclusivity and Non-Circumvention',
      body:
        'Each JV Partner agrees that during the term of this Agreement and for a period of twelve (12) months following its termination, neither Partner shall directly or indirectly contact, solicit, or transact business with the other Partner\'s contacts, clients, or buyers introduced in connection with this transaction without the other Partner\'s express written consent. This non-circumvention clause applies specifically to the Seller, the end buyer, and any other parties introduced by either Partner during the course of this joint venture. Violation of this clause shall entitle the non-breaching Partner to the full projected profit amount as liquidated damages.',
    },
    {
      heading: 'Section 5 — Term and Termination',
      body:
        'This Agreement shall remain in effect from the Effective Date until the earlier of: (a) the successful closing of the transaction and disbursement of all profits; (b) the expiration or termination of the underlying purchase contract with the Seller; or (c) mutual written agreement of both Partners to terminate. Either Partner may terminate this Agreement with seven (7) days written notice if the other Partner materially breaches any provision hereof and fails to cure such breach within the notice period. Upon termination, any earned but undisbursed profits shall be split according to the percentages set forth above.',
    },
    {
      heading: 'Section 6 — Governing Law',
      body:
        'This Agreement shall be governed by and construed in accordance with the laws of the State of {{governingState}}. Any dispute arising under this Agreement shall be resolved first through good-faith mediation, and if mediation fails, through binding arbitration in the county where the Property is located. The prevailing party in any dispute shall be entitled to recover reasonable attorney\'s fees and costs. This Agreement constitutes the entire understanding between the JV Partners with respect to the subject matter hereof and supersedes all prior discussions, agreements, and understandings of any kind.',
    },
    {
      heading: 'Signatures',
      body:
        'IN WITNESS WHEREOF, the JV Partners have executed this Joint Venture Wholesale Agreement as of the date first written above.\n\nPARTNER A (Deal Sourcer):\n\nSignature: ___________________________\nPrinted Name: {{partyAName}}\nDate: ___________________________\n\nPARTNER B (Buyer Provider):\n\nSignature: ___________________________\nPrinted Name: {{partyBName}}\nDate: ___________________________',
    },
  ],
}

// ─── TEMPLATE REGISTRY ──────────────────────────────────────────────────────

const TEMPLATES: ContractTemplate[] = [
  ...ALL_ASSIGNMENT_TEMPLATES,
  TX_DOUBLE_CLOSE,
  JV_AGREEMENT,
]

const TEMPLATE_MAP = new Map(TEMPLATES.map((t) => [t.id, t]))

export function getTemplate(templateId: string): ContractTemplate | undefined {
  return TEMPLATE_MAP.get(templateId)
}

export function listTemplates(filters?: { state?: string; type?: ContractType }): ContractTemplate[] {
  let results = TEMPLATES
  if (filters?.state) {
    results = results.filter((t) => t.state === filters.state || t.state === 'ALL')
  }
  if (filters?.type) {
    results = results.filter((t) => t.type === filters.type)
  }
  return results
}
