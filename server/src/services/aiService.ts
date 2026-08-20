import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const isMockMode = !apiKey || apiKey.includes('your-') || apiKey === '';

const ai = isMockMode ? null : new GoogleGenAI({ apiKey });
const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

console.log(`[AI Service] Mode: ${isMockMode ? 'MOCK/DEMO' : 'LIVE Gemini (' + modelName + ')'}`);

export interface ContractAnalysisResult {
  clientName: string;
  contractValue: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  paymentTerms: string;
  milestones: { title: string; dueDate: string }[];
  clauses: { title: string; description: string; riskLevel: 'low' | 'medium' | 'high' }[];
  deliverables: string[];
}

export interface RiskAnalysisResult {
  score: number; // 1-10
  missingClauses: string[];
  recommendations: string[];
}

export interface ReminderEmailResult {
  subject: string;
  body: string;
}

export interface ScopeCreepResult {
  hasScopeCreep: boolean;
  creepItems: { logDescription: string; explanation: string }[];
}

// Helper to clean and parse JSON securely
function safeJsonParse<T>(text: string): T {
  try {
    // Strip markdown code block wrappers if present
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch (error) {
    throw new Error(`Failed to parse AI JSON response: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
  }
}

// 1. Contract Analyzer
export async function analyzeContract(rawText: string): Promise<ContractAnalysisResult> {
  if (isMockMode || !ai) {
    console.log('[AI DIAGNOSIS] analyzeContract running in MOCK mode.');
    return getMockAnalysis();
  }

  console.log(`[AI DIAGNOSIS] analyzeContract running in LIVE mode. Model: ${modelName}`);

  const prompt = `You are an expert contract lawyer. Extract the key operational details from the contract text below.
Return a valid JSON object matching this schema:
{
  "clientName": "Name of the client/company contracting the work",
  "contractValue": 12000.50 (a number representing total value, 0 if not found),
  "startDate": "YYYY-MM-DD (format as YYYY-MM-DD, or empty string)",
  "endDate": "YYYY-MM-DD (format as YYYY-MM-DD, or empty string)",
  "paymentTerms": "Short description of payment schedule or milestones terms",
  "milestones": [
    { "title": "Milestone title or phase description", "dueDate": "YYYY-MM-DD or empty string" }
  ],
  "clauses": [
    { "title": "Clause topic, e.g., Late Fees, Termination", "description": "Summary of the clause text", "riskLevel": "low" or "medium" or "high" }
  ],
  "deliverables": [
    "Specific item, feature, or outcome the contractor is obligated to deliver"
  ]
}

Ensure all dates are formatted as YYYY-MM-DD. Extract at least 2-4 primary deliverables and milestones if mentioned.
If milestones are not explicitly dated, estimate them based on the contract length or leave the date blank.

Contract Text:
${rawText.slice(0, 15000)}
`;

  console.log(`[AI DIAGNOSIS] analyzeContract Prompt length: ${prompt.length}`);

  try {
    // Retry once on failure
    let attempt = 1;
    while (attempt <= 2) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        });

        console.log(`[AI DIAGNOSIS] analyzeContract Gemini raw response:\n${response.text}`);
        const parsed = safeJsonParse<ContractAnalysisResult>(response.text || '{}');
        console.log(`[AI DIAGNOSIS] analyzeContract Parsed JSON:\n${JSON.stringify(parsed, null, 2)}`);
        return parsed;
      } catch (err) {
        if (attempt === 2) throw err;
        attempt++;
        console.warn('[AI Service] Retrying contract analysis...');
      }
    }
    throw new Error('Analysis failed after retries');
  } catch (error) {
    console.error('[AI DIAGNOSIS] Error in live analyzeContract:', error);
    // Graceful error fallback: log and return fallback mock instead of crashing
    return getMockAnalysis();
  }
}

// 2. Contract Summary
export async function generateSummary(rawText: string): Promise<string> {
  if (isMockMode || !ai) {
    console.log('[AI DIAGNOSIS] generateSummary running in MOCK mode.');
    return getMockSummary();
  }

  console.log(`[AI DIAGNOSIS] generateSummary running in LIVE mode. Model: ${modelName}`);

  const prompt = `You are a helpful business assistant. Write a clear, concise summary of this contract. 
Highlight the parties involved, main goal of the engagement, key deadlines, deliverables, and total contract value.
Limit the response to 3-5 sentences. Do not use Markdown styling in the body, keep it plain text.

Contract Text:
${rawText.slice(0, 10000)}
`;

  console.log(`[AI DIAGNOSIS] generateSummary Prompt length: ${prompt.length}`);

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        temperature: 0.3,
      },
    });
    console.log(`[AI DIAGNOSIS] generateSummary Gemini raw response:\n${response.text}`);
    return response.text?.trim() || 'Summary unavailable.';
  } catch (error) {
    console.error('[AI DIAGNOSIS] Error in generateSummary:', error);
    return getMockSummary();
  }
}

// 3. Risk Assessment
export async function calculateRiskScore(rawText: string): Promise<RiskAnalysisResult> {
  if (isMockMode || !ai) {
    console.log('[AI DIAGNOSIS] calculateRiskScore running in MOCK mode.');
    return getMockRisk();
  }

  console.log(`[AI DIAGNOSIS] calculateRiskScore running in LIVE mode. Model: ${modelName}`);

  const prompt = `Analyze the following contract text for risks, missing clauses, and recommendation improvements.
Evaluate common protective clauses: Indemnification, Limitation of Liability, Intellectual Property, Termination notice, Dispute resolution.
Return a valid JSON object matching this schema:
{
  "score": 5 (number between 1 and 10, where 1 is zero risk, 10 is extremely high risk for the freelancer),
  "missingClauses": ["List of standard protective clauses that are missing or poorly defined"],
  "recommendations": ["Actionable steps the freelancer should take to negotiate or amend the contract"]
}

Contract Text:
${rawText.slice(0, 10000)}
`;

  console.log(`[AI DIAGNOSIS] calculateRiskScore Prompt length: ${prompt.length}`);

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    });
    console.log(`[AI DIAGNOSIS] calculateRiskScore Gemini raw response:\n${response.text}`);
    const parsed = safeJsonParse<RiskAnalysisResult>(response.text || '{}');
    console.log(`[AI DIAGNOSIS] calculateRiskScore Parsed JSON:\n${JSON.stringify(parsed, null, 2)}`);
    return parsed;
  } catch (error) {
    console.error('[AI DIAGNOSIS] Error in calculateRiskScore:', error);
    return getMockRisk();
  }
}

// 4. Reminder Generator
export async function generatePaymentReminder(
  invoiceAmount: number,
  invoiceDueDate: string,
  milestoneTitle: string,
  clientName: string,
  freelancerName: string
): Promise<ReminderEmailResult> {
  if (isMockMode || !ai) {
    console.log('[AI DIAGNOSIS] generatePaymentReminder running in MOCK mode.');
    return getMockReminder(invoiceAmount, invoiceDueDate, milestoneTitle, clientName, freelancerName);
  }

  console.log(`[AI DIAGNOSIS] generatePaymentReminder running in LIVE mode. Model: ${modelName}`);

  const prompt = `Draft a polite, professional, yet firm email reminder from freelancer "${freelancerName}" to the client "${clientName}".
The email is regarding an unpaid invoice for $${invoiceAmount.toFixed(2)} for the milestone "${milestoneTitle}". The invoice was due on ${invoiceDueDate}.
Return a valid JSON object matching this schema:
{
  "subject": "Professional and clear email subject line",
  "body": "HTML-formatted email body. Keep it elegant. Use <p>, <br>, <strong> tags. Do not write full HTML structure, just the body content."
}
`;

  console.log(`[AI DIAGNOSIS] generatePaymentReminder Prompt length: ${prompt.length}`);

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });
    console.log(`[AI DIAGNOSIS] generatePaymentReminder Gemini raw response:\n${response.text}`);
    const parsed = safeJsonParse<ReminderEmailResult>(response.text || '{}');
    console.log(`[AI DIAGNOSIS] generatePaymentReminder Parsed JSON:\n${JSON.stringify(parsed, null, 2)}`);
    return parsed;
  } catch (error) {
    console.error('[AI DIAGNOSIS] Error in generatePaymentReminder:', error);
    return getMockReminder(invoiceAmount, invoiceDueDate, milestoneTitle, clientName, freelancerName);
  }
}

// 5. Contract Chat
export async function chatWithContract(
  rawText: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[],
  message: string
): Promise<string> {
  if (isMockMode || !ai) {
    console.log('[AI DIAGNOSIS] chatWithContract running in MOCK mode.');
    return getMockChat(message);
  }

  console.log(`[AI DIAGNOSIS] chatWithContract running in LIVE mode. Model: ${modelName}`);

  const systemInstruction = `You are a contract intelligence AI. You help a freelancer understand their contract by answering questions.
You have access to the full contract text. Answer questions accurately based ONLY on the contract context provided.
If the answer is not found or cannot be inferred from the contract text, state that clearly.
Keep answers concise, direct, and helpful.

Contract Text Context:
${rawText.slice(0, 15000)}
`;

  console.log(`[AI DIAGNOSIS] chatWithContract systemInstruction length: ${systemInstruction.length}`);

  const contents = [
    ...chatHistory.map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    })),
    { role: 'user', parts: [{ text: message }] }
  ];

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3,
      },
    });
    console.log(`[AI DIAGNOSIS] chatWithContract Gemini raw response:\n${response.text}`);
    return response.text?.trim() || "I couldn't generate an answer.";
  } catch (error) {
    console.error('[AI DIAGNOSIS] Error in chatWithContract:', error);
    return getMockChat(message);
  }
}

// 6. Scope Creep Detector
export interface WorkLogInput {
  description: string;
  hours: number;
}

export async function detectScopeCreep(
  deliverables: string[],
  workLogs: WorkLogInput[]
): Promise<ScopeCreepResult> {
  if (isMockMode || !ai) {
    console.log('[AI DIAGNOSIS] detectScopeCreep running in MOCK mode.');
    return getMockScopeCreep(workLogs);
  }

  console.log(`[AI DIAGNOSIS] detectScopeCreep running in LIVE mode. Model: ${modelName}`);

  const prompt = `You are an AI scope management tool for freelancers.
Compare the freelancer's daily work logs against the list of contract deliverables to detect if there is "scope creep" (tasks performed that are outside the agreed contract scope).

Agreed Contract Deliverables:
${deliverables.map((d, i) => `${i + 1}. ${d}`).join('\n')}

Freelancer Work Logs to analyze:
${workLogs.map((w) => `- ${w.description} (${w.hours} hours)`).join('\n')}

Return a valid JSON object matching this schema:
{
  "hasScopeCreep": true or false,
  "creepItems": [
    {
      "logDescription": "Exact or summarized work log entry that represents scope creep",
      "explanation": "Why this work log is outside the original agreed deliverables"
    }
  ]
}
If no scope creep is detected, "hasScopeCreep" should be false, and "creepItems" should be an empty array.
`;

  console.log(`[AI DIAGNOSIS] detectScopeCreep Prompt length: ${prompt.length}`);

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });
    console.log(`[AI DIAGNOSIS] detectScopeCreep Gemini raw response:\n${response.text}`);
    const parsed = safeJsonParse<ScopeCreepResult>(response.text || '{}');
    console.log(`[AI DIAGNOSIS] detectScopeCreep Parsed JSON:\n${JSON.stringify(parsed, null, 2)}`);
    return parsed;
  } catch (error) {
    console.error('[AI DIAGNOSIS] Error in detectScopeCreep:', error);
    return getMockScopeCreep(workLogs);
  }
}

// ==========================================
// MOCK GENERATORS FOR DEMO / OFFLINE MODE
// ==========================================

function getMockAnalysis(): ContractAnalysisResult {
  return {
    clientName: 'Acme Global Solutions Inc.',
    contractValue: 18500.0,
    startDate: '2026-08-01',
    endDate: '2026-12-15',
    paymentTerms: 'Payment split into milestones. Net 15 days upon invoice approval.',
    milestones: [
      { title: 'Project Kickoff & UI Layouts', dueDate: '2026-08-20' },
      { title: 'Backend Core APIs & Integrations', dueDate: '2026-10-05' },
      { title: 'Beta Release & User Review', dueDate: '2026-11-15' },
      { title: 'Final Handover & Launch', dueDate: '2026-12-10' }
    ],
    clauses: [
      {
        title: 'Late Payment Fee',
        description: 'Interest of 1.5% per month will be charged on overdue payments after 15 days.',
        riskLevel: 'low'
      },
      {
        title: 'Termination for Convenience',
        description: 'Either party can terminate with 7 days written notice, paying for completed work only.',
        riskLevel: 'medium'
      },
      {
        title: 'Intellectual Property Transfer',
        description: 'All IP rights transfer to the client immediately upon final payment confirmation.',
        riskLevel: 'low'
      }
    ],
    deliverables: [
      'Interactive Figma UI Mockups',
      'TypeScript Node.js Backend Server API code',
      'Next.js Web Client UI Dashboard',
      'PostgreSQL Database Schema & Prisma Migrations',
      'Integration testing reports and deployment configuration scripts'
    ]
  };
}

function getMockSummary(): string {
  return "This software engineering services agreement governs the delivery of a responsive web application dashboard by the contractor to Acme Global Solutions Inc. The project runs from August 1 to December 15, 2026, with a total service fee of $18,500. Payments are milestone-based with Net 15 terms. The scope includes mockups, a Node.js backend, a Next.js client, and PostgreSQL setup, with IP transferring upon full payment.";
}

function getMockRisk(): RiskAnalysisResult {
  return {
    score: 4,
    missingClauses: ['Indemnification Clause', 'Force Majeure Clause'],
    recommendations: [
      'Include a mutual Indemnification clause to protect against third-party patent or copyright claims related to software libraries.',
      'Change the Termination for Convenience notice from 7 days to at least 14-30 days to protect your cash flow and schedule.',
      'Specify that any open-source packages utilized in the project are not subject to direct custom warranties.'
    ]
  };
}

function getMockReminder(
  amount: number,
  dueDate: string,
  milestoneTitle: string,
  clientName: string,
  freelancerName: string
): ReminderEmailResult {
  const formattedAmount = amount.toLocaleString('en-US', { minimumFractionDigits: 2 });
  return {
    subject: `Friendly Payment Reminder: Invoice for "${milestoneTitle}" Pending`,
    body: `<p>Hi ${clientName},</p>
<p>I hope this email finds you well.</p>
<p>This is a quick, friendly message to remind you that the invoice for the completed milestone <strong>"${milestoneTitle}"</strong> is currently outstanding.</p>
<ul>
  <li><strong>Invoice Amount:</strong> $${formattedAmount}</li>
  <li><strong>Due Date:</strong> ${dueDate}</li>
</ul>
<p>According to our contract terms, payment is due within 15 days of invoice submission. Please let me know if there are any issues, or if you need me to resend the payment credentials.</p>
<p>Thank you so much for your support and partnership!</p>
<p>Best regards,<br/><strong>${freelancerName}</strong></p>`
  };
}

function getMockChat(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes('terminate') || msg.includes('termination')) {
    return 'Based on the contract, either party may terminate the agreement for convenience at any time by providing at least 7 days written notice. Upon termination, the client will pay for all hours worked and milestones completed up to the termination date.';
  }
  if (msg.includes('pay') || msg.includes('payment') || msg.includes('invoice')) {
    return 'Payments are milestone-based, totaling $18,500. Overdue invoices (past 15 days) are subject to a late fee interest of 1.5% per month.';
  }
  if (msg.includes('ip') || msg.includes('copyright') || msg.includes('intellectual')) {
    return 'All Intellectual Property rights to the custom software created will transfer to the client, but ONLY after the final payment has been successfully made and cleared.';
  }
  if (msg.includes('deliverable') || msg.includes('scope') || msg.includes('what am i building')) {
    return 'You are responsible for delivering: 1) Interactive Figma UI layouts, 2) Node.js TypeScript API server, 3) Next.js Web Client, 4) PostgreSQL Prisma schema, and 5) integration testing reports and deployment configurations.';
  }
  return `This is a demo response to your query: "${message}". In live mode, this answers questions about the specific text of the uploaded contract. Try asking about payment terms, termination rules, or deliverables!`;
}

function getMockScopeCreep(workLogs: WorkLogInput[]): ScopeCreepResult {
  const creepItems = [];
  for (const log of workLogs) {
    const desc = log.description.toLowerCase();
    if (desc.includes('marketing') || desc.includes('social media') || desc.includes('ad banner') || desc.includes('seo')) {
      creepItems.push({
        logDescription: log.description,
        explanation: 'Marketing, social media design, SEO optimization, and ad banner creations are out of scope. The contract only covers software development (API, client dashboard, database).'
      });
    } else if (desc.includes('logo') || desc.includes('branding') || desc.includes('vector art')) {
      creepItems.push({
        logDescription: log.description,
        explanation: 'Branding and logo design are out of scope. The contract specifies UI layout mockups (Figma) and developer implementation, not brand identity assets.'
      });
    }
  }

  return {
    hasScopeCreep: creepItems.length > 0,
    creepItems
  };
}
