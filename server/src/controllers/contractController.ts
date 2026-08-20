import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { parseFile } from '../utils/parser';
import { uploadToCloudinary } from '../services/cloudinaryService';
import {
  analyzeContract,
  generateSummary,
  calculateRiskScore,
  chatWithContract,
  detectScopeCreep
} from '../services/aiService';

export async function uploadContract(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No contract file uploaded.' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { originalname, mimetype, buffer } = req.file;
    const title = req.body.title || originalname.replace(/\.[^/.]+$/, ""); // strip extension

    console.log(`[Contract Upload] User ${req.user.email} uploaded: ${originalname} (${mimetype})`);

    // 1. Upload to Cloudinary (returns remote URL)
    let fileUrl = '';
    try {
      fileUrl = await uploadToCloudinary(buffer);
    } catch (err) {
      console.error('Cloudinary upload error:', err);
      return res.status(500).json({ error: 'Failed to upload contract to Cloudinary.' });
    }

    // 2. Parse file buffer to extract raw text
    let rawText = '';
    try {
      rawText = await parseFile(buffer, mimetype);
      console.log(`[AI DIAGNOSIS] Extracted text length: ${rawText.length}`);
      console.log(`[AI DIAGNOSIS] First 500 characters of extracted text:\n${rawText.substring(0, 500)}`);
    } catch (err: any) {
      console.error('File parsing error:', err);
      return res.status(400).json({ error: err.message || 'Failed to parse text from contract file.' });
    }

    if (!rawText.trim()) {
      return res.status(400).json({ error: 'Extracted contract text is empty. Please upload a readable document.' });
    }

    // 3. AI Analysis
    console.log('[Contract Upload] Initiating AI analysis...');
    const analysis = await analyzeContract(rawText);
    const summary = await generateSummary(rawText);
    const risk = await calculateRiskScore(rawText);

    // 4. Save contract in Database
    console.log('[Contract Upload] Saving contract to database...');
    const contract = await prisma.contract.create({
      data: {
        userId: req.user.userId,
        title: title,
        fileUrl: fileUrl,
        rawText: rawText,
        summary: summary,
        riskScore: risk.score,
        status: 'ANALYZED',
      },
    });
    console.log(`[AI DIAGNOSIS] Final object saved to database:\n${JSON.stringify(contract, null, 2)}`);

    // 5. Create Milestones from extracted AI analysis
    const createdMilestones = [];
    if (analysis.milestones && analysis.milestones.length > 0) {
      for (const m of analysis.milestones) {
        // Parse date gracefully
        const dueDate = m.dueDate ? new Date(m.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default
        const milestone = await prisma.milestone.create({
          data: {
            contractId: contract.id,
            title: m.title,
            dueDate: isNaN(dueDate.getTime()) ? new Date() : dueDate,
            status: 'PENDING',
          },
        });
        createdMilestones.push(milestone);
      }
    }

    return res.status(201).json({
      message: 'Contract uploaded and analyzed successfully',
      contract: {
        id: contract.id,
        title: contract.title,
        fileUrl: contract.fileUrl,
        summary: contract.summary,
        riskScore: contract.riskScore,
        status: contract.status,
        createdAt: contract.createdAt,
      },
      analysisDetails: {
        clientName: analysis.clientName,
        contractValue: analysis.contractValue,
        paymentTerms: analysis.paymentTerms,
        clauses: analysis.clauses,
        deliverables: analysis.deliverables,
      },
      milestones: createdMilestones,
      riskDetails: risk,
    });
  } catch (error) {
    console.error('Contract upload & analysis handler error:', error);
    return res.status(500).json({ error: 'Failed to complete contract uploading and analysis pipeline.' });
  }
}

export async function getContracts(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const contracts = await prisma.contract.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        fileUrl: true,
        summary: true,
        riskScore: true,
        status: true,
        createdAt: true,
        _count: {
          select: { milestones: true, invoices: true }
        }
      }
    });

    return res.json(contracts);
  } catch (error) {
    console.error('Get contracts error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getContractById(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        milestones: { orderBy: { dueDate: 'asc' } },
        invoices: { orderBy: { dueDate: 'asc' } },
        workLogs: { orderBy: { date: 'desc' } },
      },
    });

    if (!contract || contract.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    return res.json(contract);
  } catch (error) {
    console.error('Get contract by id error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function reanalyzeContract(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const contract = await prisma.contract.findUnique({
      where: { id }
    });

    if (!contract || contract.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    if (!contract.rawText) {
      return res.status(400).json({ error: 'Contract has no extracted raw text to analyze.' });
    }

    console.log(`[Contract Re-analyze] Re-running AI pipeline for: ${contract.title}`);
    const analysis = await analyzeContract(contract.rawText);
    const summary = await generateSummary(contract.rawText);
    const risk = await calculateRiskScore(contract.rawText);

    const updatedContract = await prisma.contract.update({
      where: { id },
      data: {
        summary: summary,
        riskScore: risk.score,
        status: 'ANALYZED',
      },
    });

    return res.json({
      message: 'Contract re-analysis completed successfully',
      contract: updatedContract,
      analysisDetails: {
        clientName: analysis.clientName,
        contractValue: analysis.contractValue,
        paymentTerms: analysis.paymentTerms,
        clauses: analysis.clauses,
        deliverables: analysis.deliverables,
      },
      riskDetails: risk
    });
  } catch (error) {
    console.error('Reanalyze contract error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function chatContract(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message content is required for chat.' });
    }

    const contract = await prisma.contract.findUnique({
      where: { id },
      select: { userId: true, rawText: true }
    });

    if (!contract || contract.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const contractText = contract.rawText || 'Empty contract text.';
    const chatHistory = history || [];

    const reply = await chatWithContract(contractText, chatHistory, message);

    return res.json({ reply });
  } catch (error) {
    console.error('Contract chat error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function checkScopeCreep(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: { workLogs: true }
    });

    if (!contract || contract.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // Retrieve contract deliverables using the AI analyzeContract endpoint if not already stored,
    // but since we don't store deliverables in the db directly, we'll re-extract deliverables from rawText
    if (!contract.rawText) {
      return res.status(400).json({ error: 'Contract has no parsed text to identify scope.' });
    }

    console.log(`[Scope Creep Check] Analyzing work logs for: ${contract.title}`);
    const analysis = await analyzeContract(contract.rawText);
    const deliverables = analysis.deliverables || [];

    const workLogsPayload = contract.workLogs.map(w => ({
      description: w.description,
      hours: w.hours
    }));

    if (workLogsPayload.length === 0) {
      return res.json({
        hasScopeCreep: false,
        message: 'No work logs recorded yet for this contract.',
        creepItems: []
      });
    }

    const result = await detectScopeCreep(deliverables, workLogsPayload);

    return res.json({
      deliverables,
      workLogsCount: workLogsPayload.length,
      ...result
    });
  } catch (error) {
    console.error('Check scope creep error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function addWorkLog(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { description, hours, date } = req.body;

    if (!description || !hours) {
      return res.status(400).json({ error: 'Description and hours are required for work logs.' });
    }

    const contract = await prisma.contract.findUnique({
      where: { id }
    });

    if (!contract || contract.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const parsedHours = parseFloat(hours);
    if (isNaN(parsedHours) || parsedHours <= 0) {
      return res.status(400).json({ error: 'Hours must be a positive number.' });
    }

    const logDate = date ? new Date(date) : new Date();

    const workLog = await prisma.workLog.create({
      data: {
        contractId: id,
        description,
        hours: parsedHours,
        date: isNaN(logDate.getTime()) ? new Date() : logDate,
      }
    });

    return res.status(201).json({
      message: 'Work log added successfully',
      workLog
    });
  } catch (error) {
    console.error('Add work log error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function downloadContract(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const contract = await prisma.contract.findUnique({
      where: { id }
    });

    if (!contract || contract.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    if (!contract.fileUrl) {
      return res.status(404).json({ error: 'Document file URL not found' });
    }

    console.log(`[Contract Download] User ${req.user.email} downloading file from: ${contract.fileUrl}`);

    // Fetch the file from the remote URL
    const response = await fetch(contract.fileUrl);
    if (!response.ok) {
      console.error(`[Contract Download] Failed to fetch file from remote: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ error: 'Failed to retrieve contract file from storage.' });
    }

    // Determine the content-type and file extension
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    const urlParts = contract.fileUrl.split('?')[0].split('/');
    const lastPart = urlParts[urlParts.length - 1];
    const dotIndex = lastPart.lastIndexOf('.');
    let ext = '.pdf'; // Default fallback
    if (dotIndex !== -1) {
      ext = lastPart.substring(dotIndex).toLowerCase();
    }

    // Clean title and ensure correct extension
    let cleanTitle = contract.title.trim();
    if (cleanTitle.toLowerCase().endsWith(ext)) {
      cleanTitle = cleanTitle.substring(0, cleanTitle.length - ext.length).trim();
    }

    // Sanitize filename to be safe for HTTP header (prevent special char bugs)
    const sanitized = cleanTitle.replace(/[^a-zA-Z0-9. \-_]/g, '_');
    const filename = `${sanitized}${ext}`;

    // Read response body as buffer and send to client
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    console.error('Download contract error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
