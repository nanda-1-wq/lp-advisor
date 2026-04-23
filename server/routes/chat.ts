import { Router } from 'express';
import { runAdvisor } from '../services/claude.js';

export const chatRouter = Router();

chatRouter.post('/', async (req, res) => {
  try {
    const { messages } = req.body as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    if (!messages?.length) {
      res.status(400).json({ success: false, error: 'messages array is required' });
      return;
    }

    const result = await runAdvisor(messages);

    res.json({
      success: true,
      message: result.text,
      toolData: Object.keys(result.toolData).length > 0 ? result.toolData : undefined,
    });
  } catch (err) {
    console.error('[chat]', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});
