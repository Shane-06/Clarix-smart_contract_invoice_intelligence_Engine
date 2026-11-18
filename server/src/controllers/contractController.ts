import { Request, Response } from 'express';
import { z, ZodError } from 'zod';
import prisma from '../utils/prisma';
import { presentInvoice } from '../utils/invoiceAmounts';
import { demoMode } from '../utils/config';
import { parseFile } from '../utils/parser';
import { discardContract, readContract, StorageUnavailableError, storeContract } from '../services/cloudinaryService';
import {
  AIUnavailableError,
  analyzeContract,
  generateSummary,
  calculateRiskScore,
  chatWithContract,
  detectScopeCreep,
} from '../services/aiService';
import { chatSchema, workLogSchema } from '../validators';

const contractFields = {
  id: true,
  title: true,
  summary: true,
  riskScore: true,
  status: true,
  isDemo: true,
  createdAt: true,
} as const;

const uploadFields = z.object({
  title: z.string().trim().min(1).max(200),
  clientEmail: z.preprocess(value => value === '' ? undefined : value, z.string().trim().email().max(254).optional()),
});

const mimeExtensions: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt',
};

function contractError(res: Response, error: unknown) {
  if (error instanceof ZodError) return res.status(400).json({ error: error.issues });
  if (error instanceof AIUnavailableError || error instanceof StorageUnavailableError) {
    return res.status(503).json({ error: error.message });
  }
  console.error('Contract operation failed:', error instanceof Error ? error.name : 'Unknown error');
  return res.status(500).json({ error: 'Contract operation failed' });
}

async function analyze(rawText: string) {
  const [analysis, summary, riskDetails] = await Promise.all([
    analyzeContract(rawText),
    generateSummary(rawText),
    calculateRiskScore(rawText),
  ]);
  return { analysis, summary, riskDetails, riskScore: riskDetails.score, status: 'ANALYZED', isDemo: demoMode };
}

export async function uploadContract(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!req.file) return res.status(400).json({ error: 'No contract file uploaded.' });
  const { originalname, mimetype, buffer } = req.file;
  try {
    const input = uploadFields.parse({ ...req.body, title: req.body.title || originalname.replace(/\.[^/.]+$/, '') });
    let rawText: string;
    try {
      rawText = await parseFile(buffer, mimetype);
    } catch {
      return res.status(400).json({ error: 'This file could not be read. Upload a readable PDF, DOCX, or TXT file.' });
    }
    if (!rawText.trim()) {
      return res.status(400).json({ error: 'No selectable text was found. For a scanned PDF, run text recognition before uploading.' });
    }
    const extracted = await analyze(rawText);
    const fileUrl = await storeContract(buffer, mimeExtensions[mimetype]);
    try {
      const contract = await prisma.contract.create({
        data: {
          ...input,
          ...extracted,
          userId: req.user.userId,
          fileUrl,
          rawText,
          milestones: {
            create: extracted.analysis.milestones.filter(item => item.dueDate).map(item => ({
              title: item.title, dueDate: new Date(item.dueDate),
            })),
          },
        },
        select: { ...contractFields, clientEmail: true, milestones: true },
      });
      return res.status(201).json({
        message: 'Contract uploaded and analyzed successfully',
        contract: { ...contract, hasFile: true },
        analysisDetails: extracted.analysis,
        milestones: contract.milestones,
        riskDetails: extracted.riskDetails,
      });
    } catch (error) {
      await discardContract(fileUrl).catch(() => console.error('Unable to discard unlinked contract file'));
      throw error;
    }
  } catch (error) {
    return contractError(res, error);
  }
}

export async function getContracts(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const contracts = await prisma.contract.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      select: { ...contractFields, _count: { select: { milestones: true, invoices: true } } },
    });
    return res.json(contracts);
  } catch (error) {
    return contractError(res, error);
  }
}

export async function getContractById(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const record = await prisma.contract.findFirst({
      where: { id: req.params.id, userId: req.user.userId },
      select: {
        ...contractFields,
        fileUrl: true, clientEmail: true, analysis: true, riskDetails: true,
        milestones: { orderBy: { dueDate: 'asc' } },
        invoices: { orderBy: { dueDate: 'asc' }, include: { payments: true } },
        workLogs: { orderBy: { date: 'desc' } },
      },
    });
    if (!record) return res.status(404).json({ error: 'Contract not found' });
    const { fileUrl, invoices, ...contract } = record;
    return res.json({ ...contract, hasFile: !!fileUrl, invoices: invoices.map(presentInvoice) });
  } catch (error) {
    return contractError(res, error);
  }
}

export async function reanalyzeContract(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, userId: req.user.userId }, select: { id: true, rawText: true },
    });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    if (!contract.rawText) return res.status(400).json({ error: 'Contract has no extracted text to analyze.' });
    const extracted = await analyze(contract.rawText);
    const updated = await prisma.contract.update({
      where: { id: contract.id },
      data: extracted,
      select: contractFields,
    });
    return res.json({
      message: 'Contract analysis updated',
      contract: updated,
      analysisDetails: extracted.analysis,
      riskDetails: extracted.riskDetails,
    });
  } catch (error) {
    return contractError(res, error);
  }
}

export async function updateContractContact(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { clientEmail } = z.object({ clientEmail: z.string().trim().email().max(254).nullable() }).parse(req.body);
    const result = await prisma.contract.updateMany({ where: { id: req.params.id, userId: req.user.userId }, data: { clientEmail } });
    if (!result.count) return res.status(404).json({ error: 'Contract not found' });
    return res.json({ clientEmail });
  } catch (error) {
    return contractError(res, error);
  }
}

export async function chatContract(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { message, history } = chatSchema.parse(req.body);
    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, userId: req.user.userId }, select: { rawText: true },
    });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    if (!contract.rawText) return res.status(400).json({ error: 'Contract has no extracted text to search.' });
    return res.json({ reply: await chatWithContract(contract.rawText, history, message) });
  } catch (error) {
    return contractError(res, error);
  }
}

export async function checkScopeCreep(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, userId: req.user.userId },
      select: { rawText: true, analysis: true, isDemo: true, workLogs: { select: { description: true, hours: true } } },
    });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    if (!contract.workLogs.length) return res.json({ hasScopeCreep: false, creepItems: [], workLogsCount: 0 });
    if (!contract.rawText) return res.status(400).json({ error: 'Contract has no extracted text to search.' });
    const stored = z.object({ deliverables: z.array(z.string()) }).safeParse(contract.analysis);
    const deliverables = stored.success && contract.isDemo === demoMode
      ? stored.data.deliverables
      : (await analyzeContract(contract.rawText)).deliverables;
    if (!deliverables.length) return res.status(422).json({ error: 'No contract deliverables could be identified for comparison.' });
    const result = await detectScopeCreep(deliverables, contract.workLogs);
    return res.json({ ...result, deliverables, workLogsCount: contract.workLogs.length });
  } catch (error) {
    return contractError(res, error);
  }
}

export async function addWorkLog(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const data = workLogSchema.parse(req.body);
    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, userId: req.user.userId }, select: { id: true },
    });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    const workLog = await prisma.workLog.create({ data: { ...data, contractId: contract.id } });
    return res.status(201).json({ message: 'Work log added successfully', workLog });
  } catch (error) {
    return contractError(res, error);
  }
}

export async function downloadContract(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, userId: req.user.userId }, select: { title: true, fileUrl: true },
    });
    if (!contract?.fileUrl) return res.status(404).json({ error: 'Contract document not found' });
    const asset = await readContract(contract.fileUrl);
    if (!asset) return res.status(404).json({ error: 'Contract document not found in storage' });
    const title = contract.title.replace(/[^a-zA-Z0-9. _-]/g, '_').trim() || 'contract';
    const extension = Object.values(mimeExtensions).includes(asset.extension.toLowerCase()) ? asset.extension.toLowerCase() : '';
    res.attachment(title.toLowerCase().endsWith(extension) ? title : title + extension);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.send(asset.buffer);
  } catch (error) {
    return contractError(res, error);
  }
}
