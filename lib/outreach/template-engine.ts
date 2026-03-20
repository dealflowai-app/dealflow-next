// ─── Template Engine ────────────────────────────────────────────────────────
// Renders {{variable}} placeholders in scripts and message templates.

export const TEMPLATE_VARIABLES: Record<string, string> = {
  // Contact variables
  '{{firstName}}': 'Contact first name',
  '{{lastName}}': 'Contact last name',
  '{{fullName}}': 'Full name or entity name',
  '{{phone}}': 'Contact phone number',
  '{{email}}': 'Contact email',

  // Wholesaler variables
  '{{companyName}}': 'Your company name (from settings)',
  '{{agentName}}': 'Your name',
  '{{agentPhone}}': 'Your phone number',

  // Deal variables
  '{{propertyAddress}}': 'Property address',
  '{{propertyType}}': 'Property type (SFR, Multi-Family, etc.)',
  '{{beds}}': 'Bedrooms',
  '{{baths}}': 'Bathrooms',
  '{{sqft}}': 'Square footage',
  '{{askingPrice}}': 'Asking price',
  '{{arv}}': 'After repair value',
  '{{dealScore}}': 'Deal score (A/B/C/D)',

  // Market variables
  '{{market}}': 'City, State',
}

export function renderTemplate(
  template: string,
  variables: Record<string, string | number | null | undefined>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key]
    if (value == null || value === '') return match
    return String(value)
  })
}

export function extractVariables(template: string): string[] {
  const vars: string[] = []
  const regex = /\{\{(\w+)\}\}/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(template)) !== null) {
    if (!vars.includes(m[1])) vars.push(m[1])
  }
  return vars
}

export function validateTemplate(template: string): { valid: boolean; unknownVars: string[] } {
  const vars = extractVariables(template)
  const known = Object.keys(TEMPLATE_VARIABLES).map(k => k.replace(/\{\{|\}\}/g, ''))
  const unknown = vars.filter(v => !known.includes(v))
  return { valid: unknown.length === 0, unknownVars: unknown }
}

// Sample data for template preview
export const SAMPLE_DATA: Record<string, string> = {
  firstName: 'John',
  lastName: 'Smith',
  fullName: 'John Smith',
  companyName: 'DealFlow Properties',
  agentName: 'Sarah',
  agentPhone: '(555) 123-4567',
  propertyAddress: '123 Main St, Phoenix, AZ',
  propertyType: 'Single Family',
  beds: '3',
  baths: '2',
  sqft: '1,500',
  askingPrice: '$150,000',
  arv: '$220,000',
  dealScore: 'A',
  market: 'Phoenix, AZ',
  phone: '(555) 987-6543',
  email: 'john@example.com',
}
