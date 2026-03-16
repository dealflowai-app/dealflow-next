/**
 * Master Email Template
 *
 * Every email in the system wraps its content in this template.
 * All CSS is inline for maximum email client compatibility.
 * Table-based layout for Outlook/Gmail/Apple Mail support.
 */

/* ═══════════════════════════════════════════════
   BRAND TOKENS
   ═══════════════════════════════════════════════ */

export const brand = {
  navy: '#0B1224',
  blue: '#2563EB',
  blueLight: '#60A5FA',
  green: '#16a34a',
  greenLight: '#dcfce7',
  greenBorder: '#bbf7d0',
  amber: '#d97706',
  amberLight: '#fef3c7',
  amberBorder: '#fde68a',
  red: '#dc2626',
  redLight: '#fef2f2',
  redBorder: '#fecaca',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  white: '#FFFFFF',
  font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
} as const

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dealflowai.app'

/* ═══════════════════════════════════════════════
   MASTER TEMPLATE
   ═══════════════════════════════════════════════ */

export interface EmailTemplateOptions {
  previewText?: string
  showFooterCTA?: boolean
}

export function wrapInEmailTemplate(
  bodyHtml: string,
  options?: EmailTemplateOptions,
): string {
  const preheader = options?.previewText
    ? `<span style="display:none;font-size:1px;color:${brand.gray50};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${options.previewText}${'&nbsp;&zwnj;'.repeat(30)}</span>`
    : ''

  const footerCTA = options?.showFooterCTA
    ? `<tr><td align="center" style="padding:0 0 20px;">
        <a href="${APP_URL}/dashboard" style="color:${brand.blue};font-family:${brand.font};font-size:13px;font-weight:500;text-decoration:none;">Log in to DealFlow AI &rarr;</a>
      </td></tr>`
    : ''

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>DealFlow AI</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${brand.gray50};font-family:${brand.font};-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
${preheader}

<!-- Outer wrapper -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${brand.gray50};">
<tr><td align="center" style="padding:40px 16px;">

<!-- Header -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
<tr><td align="center" style="padding:0 0 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${brand.navy};border-radius:10px 10px 0 0;border-bottom:3px solid ${brand.blue};">
  <tr><td align="center" style="padding:18px 32px;">
    <span style="font-family:${brand.font};font-size:22px;font-weight:700;color:${brand.white};letter-spacing:-0.02em;">Deal<span style="font-weight:700;">Flow</span></span><span style="font-family:${brand.font};font-size:22px;font-weight:700;color:${brand.blueLight};letter-spacing:-0.02em;"> AI</span>
  </td></tr>
  </table>
</td></tr>
</table>

<!-- Body container -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
<tr><td style="background-color:${brand.white};border:1px solid ${brand.gray200};border-radius:0 0 10px 10px;padding:32px;margin-top:-24px;">

${bodyHtml}

</td></tr>
</table>

<!-- Footer -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
<tr><td style="padding:28px 32px 0;">
  ${footerCTA}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td align="center" style="padding:0 0 8px;">
    <span style="font-family:${brand.font};font-size:22px;font-weight:700;color:${brand.navy};letter-spacing:-0.02em;">Deal<span style="font-weight:700;">Flow</span></span><span style="font-family:${brand.font};font-size:22px;font-weight:700;color:${brand.blue};letter-spacing:-0.02em;"> AI</span>
  </td></tr>
  <tr><td align="center" style="padding:0 0 6px;">
    <span style="font-family:${brand.font};font-size:12px;color:${brand.gray400};line-height:1.6;">Sent by DealFlow AI &middot; <a href="${APP_URL}" style="color:${brand.gray400};text-decoration:none;">dealflowai.app</a></span>
  </td></tr>
  <tr><td align="center" style="padding:0 0 6px;">
    <a href="${APP_URL}/settings" style="font-family:${brand.font};font-size:12px;color:${brand.gray400};text-decoration:underline;">Manage your notification preferences</a>
  </td></tr>
  <tr><td align="center" style="padding:8px 0 0;">
    <span style="font-family:${brand.font};font-size:11px;color:${brand.gray300};">&copy; 2026 DealFlow AI. All rights reserved.</span>
  </td></tr>
  </table>
</td></tr>
</table>

</td></tr>
</table>

</body>
</html>`
}

/* ═══════════════════════════════════════════════
   COMPONENT HELPERS
   ═══════════════════════════════════════════════ */

/**
 * Bulletproof email button (table-based for Outlook compat)
 */
export function emailButton(
  text: string,
  url: string,
  color?: string,
): string {
  const bg = color || brand.blue
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
<tr><td align="center" style="background-color:${bg};border-radius:6px;">
  <!--[if mso]>
  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:42px;v-text-anchor:middle;width:220px;" arcsize="14%" fillcolor="${bg}" stroke="f">
  <w:anchorlock/>
  <center style="color:#ffffff;font-family:${brand.font};font-size:14px;font-weight:600;">
  ${text}
  </center>
  </v:roundrect>
  <![endif]-->
  <!--[if !mso]><!-->
  <a href="${url}" style="display:inline-block;background-color:${bg};color:${brand.white};font-family:${brand.font};font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:6px;line-height:1;mso-hide:all;">
    ${text}
  </a>
  <!--<![endif]-->
</td></tr>
</table>`
}

/**
 * Horizontal divider
 */
export function emailDivider(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
<tr><td style="border-top:1px solid ${brand.gray200};font-size:1px;line-height:1px;">&nbsp;</td></tr>
</table>`
}

/**
 * Stat card — label above, large bold value below
 */
export function emailStatCard(
  label: string,
  value: string,
  color?: string,
): string {
  const valueColor = color || brand.navy
  return `<td align="center" style="padding:12px 8px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
  <tr><td align="center" style="padding:0 0 4px;">
    <span style="font-family:${brand.font};font-size:11px;font-weight:500;color:${brand.gray400};text-transform:uppercase;letter-spacing:0.06em;">${label}</span>
  </td></tr>
  <tr><td align="center">
    <span style="font-family:${brand.font};font-size:20px;font-weight:700;color:${valueColor};letter-spacing:-0.01em;">${value}</span>
  </td></tr>
  </table>
</td>`
}

/**
 * Info row — label: value with subtle bottom border
 */
export function emailInfoRow(
  label: string,
  value: string,
  valueColor?: string,
): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
  <td style="padding:10px 0;border-bottom:1px solid ${brand.gray100};font-family:${brand.font};font-size:13px;color:${brand.gray500};width:40%;">${label}</td>
  <td align="right" style="padding:10px 0;border-bottom:1px solid ${brand.gray100};font-family:${brand.font};font-size:14px;font-weight:600;color:${valueColor || brand.gray800};">${value}</td>
</tr>
</table>`
}

/**
 * Section heading
 */
export function emailHeading(
  text: string,
  options?: { size?: 'lg' | 'md' | 'sm'; color?: string; align?: 'left' | 'center' },
): string {
  const sizes = { lg: '22px', md: '18px', sm: '15px' }
  const fontSize = sizes[options?.size || 'lg']
  const color = options?.color || brand.navy
  const align = options?.align || 'left'
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="${align}" style="padding:0 0 8px;">
  <span style="font-family:${brand.font};font-size:${fontSize};font-weight:700;color:${color};line-height:1.3;letter-spacing:-0.02em;">${text}</span>
</td></tr>
</table>`
}

/**
 * Paragraph text
 */
export function emailText(
  text: string,
  options?: { color?: string; size?: string; align?: 'left' | 'center' },
): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="${options?.align || 'left'}" style="padding:0 0 16px;">
  <span style="font-family:${brand.font};font-size:${options?.size || '14px'};color:${options?.color || brand.gray600};line-height:1.6;">${text}</span>
</td></tr>
</table>`
}

/**
 * Spacer
 */
export function emailSpacer(height?: number): string {
  const h = height || 16
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="font-size:1px;line-height:${h}px;height:${h}px;">&nbsp;</td></tr>
</table>`
}

/**
 * Accent banner — colored top border with content
 */
export function emailBanner(
  text: string,
  type: 'success' | 'warning' | 'error' | 'info',
): string {
  const styles = {
    success: { bg: brand.greenLight, border: brand.greenBorder, color: brand.green, topBorder: brand.green },
    warning: { bg: brand.amberLight, border: brand.amberBorder, color: brand.amber, topBorder: brand.amber },
    error: { bg: brand.redLight, border: brand.redBorder, color: brand.red, topBorder: brand.red },
    info: { bg: '#eff6ff', border: '#bfdbfe', color: brand.blue, topBorder: brand.blue },
  }
  const s = styles[type]
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
<tr><td style="background-color:${s.bg};border:1px solid ${s.border};border-top:3px solid ${s.topBorder};border-radius:6px;padding:14px 20px;">
  <span style="font-family:${brand.font};font-size:14px;font-weight:600;color:${s.color};">${text}</span>
</td></tr>
</table>`
}

/**
 * Match score badge
 */
export function emailMatchBadge(score: number): string {
  let bg: string, color: string, border: string
  if (score >= 80) {
    bg = brand.greenLight; color = brand.green; border = brand.greenBorder
  } else if (score >= 60) {
    bg = '#eff6ff'; color = brand.blue; border = '#bfdbfe'
  } else {
    bg = brand.amberLight; color = brand.amber; border = brand.amberBorder
  }
  return `<span style="display:inline-block;background-color:${bg};color:${color};border:1px solid ${border};border-radius:20px;padding:4px 14px;font-family:${brand.font};font-size:13px;font-weight:700;line-height:1.4;">${score}% Match</span>`
}

/**
 * Note/callout box
 */
export function emailNote(text: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">
<tr><td style="background-color:${brand.gray50};border-left:3px solid ${brand.gray300};border-radius:0 4px 4px 0;padding:12px 16px;">
  <span style="font-family:${brand.font};font-size:13px;color:${brand.gray500};line-height:1.5;">${text}</span>
</td></tr>
</table>`
}

/**
 * Property type / condition pill
 */
export function emailPill(text: string, color?: string): string {
  const bg = color || brand.gray100
  const textColor = color ? brand.white : brand.gray600
  return `<span style="display:inline-block;background-color:${bg};color:${textColor};font-family:${brand.font};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;padding:3px 10px;border-radius:4px;margin-right:6px;">${text}</span>`
}

/* ═══════════════════════════════════════════════
   UTILITY
   ═══════════════════════════════════════════════ */

export function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return 'N/A'
  return '$' + n.toLocaleString()
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return 'N/A'
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
