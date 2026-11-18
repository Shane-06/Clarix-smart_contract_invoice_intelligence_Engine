import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { milestoneSchema, milestoneUpdateSchema } from '../validators';
import { ZodError } from 'zod';

export async function getMilestones(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { contractId } = req.query;

    const whereClause: any = {
      contract: {
        userId: req.user.userId,
      },
    };

    if (contractId && typeof contractId === 'string') {
      whereClause.contractId = contractId;
    }

    const milestones = await prisma.milestone.findMany({
      where: whereClause,
      include: {
        contract: {
          select: { title: true }
        }
      },
      orderBy: { dueDate: 'asc' },
    });

    return res.json(milestones);
  } catch (error) {
    console.error('Get milestones error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createMilestone(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validatedData = milestoneSchema.parse(req.body);

    // Verify contract belongs to user
    const contract = await prisma.contract.findUnique({
      where: { id: validatedData.contractId }
    });

    if (!contract || contract.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const milestone = await prisma.milestone.create({
      data: {
        contractId: validatedData.contractId,
        title: validatedData.title,
        dueDate: validatedData.dueDate,
        status: validatedData.status,
      },
    });

    return res.status(201).json({
      message: 'Milestone created successfully',
      milestone,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create milestone error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateMilestone(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const data = milestoneUpdateSchema.parse(req.body);

    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: { contract: true }
    });

    if (!milestone || milestone.contract.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    const updatedMilestone = await prisma.milestone.update({
      where: { id },
      data,
    });

    return res.json({
      message: 'Milestone updated successfully',
      milestone: updatedMilestone,
    });
  } catch (error) {
    if (error instanceof ZodError) return res.status(400).json({ error: error.issues });
    console.error('Update milestone error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteMilestone(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: { contract: true }
    });

    if (!milestone || milestone.contract.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    await prisma.milestone.delete({
      where: { id },
    });

    return res.json({ message: 'Milestone deleted successfully' });
  } catch (error) {
    console.error('Delete milestone error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
