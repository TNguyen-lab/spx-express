import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../config/db.js';
import { generateToken } from '../utils/jwt.js';
import { authenticate, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['ADMIN', 'QUALITY', 'ACCOUNTING', 'WAREHOUSE_DIRECTOR', 'STAFF', 'DRIVER']).optional(),
  phone: z.string().optional(),
});

// POST /auth/login
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user || !bcrypt.compareSync(data.password, user.password)) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({ error: 'Account is disabled' });
      return;
    }

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/register
router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      res.status(400).json({ error: 'Email already exists' });
      return;
    }

    const hashedPassword = bcrypt.hashSync(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role || 'STAFF',
        phone: data.phone,
      },
    });

    const token = generateToken(user);
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /auth/me
router.get('/auth/me', authenticate, async (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

// GET /auth/users - List all users (admin only)
router.get('/auth/users', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
