import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const BRAND_COLOR = '#059669'
const HEADER_BG_COLOR = '#c1ff72'
const LOGO_URL = 'https://ik.imagekit.io/wuygwau6s/HomiCare+/HomiCare%20Logo.png'

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, name, subject, originalMessage, adminResponse, adminName, category, status, respondedAt } = await req.json()

    // Category badge styling
    const categoryColors: Record<string, { bg: string; text: string }> = {
      general: { bg: '#F3F4F6', text: '#4B5563' },
      technical: { bg: '#EEF2FF', text: '#3730A3' },
      billing: { bg: '#F0FDF4', text: '#15803D' },
      appointment: { bg: '#F3E8FF', text: '#6B21A8' },
      complaint: { bg: '#FEE2E2', text: '#991B1B' },
      feedback: { bg: '#CFFAFE', text: '#164E63' },
    }
    const categoryStyle = categoryColors[category] || categoryColors.general

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; border: 1px solid #eeeeee; border-radius: 8px; overflow: hidden;">
        <div style="background-color: ${HEADER_BG_COLOR}; padding: 20px 0; text-align: center;">
          <img src="${LOGO_URL}" alt="HomiCareplus Logo" style="max-width: 150px; height: auto; border: 0;">
        </div>
        <div style="padding: 30px;">
          <p>Hello ${name},</p>
          <p>Thank you for contacting HomiCareplus. We have reviewed your message and ${adminName} has provided a response below.</p>
          
          <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #111827;">Your Message</h3>
            <p style="margin: 0; color: #6B7280; font-style: italic;">Subject: ${subject}</p>
            <div style="background: white; padding: 15px; margin-top: 12px; border-left: 4px solid #D1D5DB; border-radius: 4px;">
              <p style="margin: 0; color: #374151; line-height: 1.5;">${originalMessage}</p>
            </div>
          </div>

          <div style="background: #ECFDF5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${BRAND_COLOR};">
            <h3 style="margin: 0 0 15px 0; color: ${BRAND_COLOR};">Response from ${adminName}</h3>
            <div style="background: white; padding: 15px; border-radius: 4px;">
              <p style="margin: 0; color: #374151; line-height: 1.6;">${adminResponse}</p>
            </div>
          </div>

          <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #111827;">Message Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; color: #6B7280; border-bottom: 1px solid #E5E7EB;">Category:</td>
                <td style="padding: 10px 0; text-align: right; border-bottom: 1px solid #E5E7EB;">
                  <span style="background: ${categoryStyle.bg}; color: ${categoryStyle.text}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${category}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #6B7280; border-bottom: 1px solid #E5E7EB;">Status:</td>
                <td style="padding: 10px 0; text-align: right; border-bottom: 1px solid #E5E7EB; font-weight: 600; color: ${BRAND_COLOR};">${status}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #6B7280;">Responded:</td>
                <td style="padding: 10px 0; text-align: right; font-weight: 600;">${respondedAt}</td>
              </tr>
            </table>
          </div>

          <div style="background: #EFF6FF; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563EB;">
            <p style="margin: 0; color: #1E40AF; font-weight: 600;">Need More Help?</p>
            <p style="margin: 10px 0 0 0; color: #1E40AF; font-size: 14px;">If you have additional questions or concerns, please contact us through your HomiCareplus app or reply to this email.</p>
          </div>

          <p style="margin-top: 30px; color: #6B7280;">Best regards,<br><strong>The HomiCareplus Team</strong></p>
        </div>
        <div style="background-color: #f4f4f4; color: #777777; padding: 15px 30px; font-size: 12px; text-align: center; border-top: 1px solid #eeeeee;">
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} HomiCareplus. All rights reserved.</p>
          <p style="margin: 8px 0 0 0;">This is an automated notification. Please do not reply directly to this email.</p>
        </div>
      </div>
    `

    const emailSubject = `Re: ${subject} - Response from ${adminName}`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'HomiCareplus Support <support@homicareplus.com>',
        to: [email],
        subject: emailSubject,
        html: html,
      }),
    })

    const responseData = await res.json()

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: res.status,
      }
    )
  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
