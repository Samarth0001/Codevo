import { Request, Response, NextFunction } from 'express';
import GithubAccount from '../models/GithubAccount';

// Augment Request to carry loaded GitHub account
declare module 'express-serve-static-core' {
  interface Request {
    githubAccount?: any;
  }
}

export const requireGithubAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) { res.status(401).json({ success:false, message:'User not authenticated' }); return; }

    // Prefer explicit accountId from body or query
    const accountId = (req.body && req.body.accountId) || (req.query && (req.query as any).accountId);

    let account: any = null;
    if (accountId) {
      account = await GithubAccount.findOne({ _id: accountId, user: userId });
      if (!account) { res.status(404).json({ success:false, message:'GitHub account not found' }); return; }
    } else {
      // Fallback to first available account for this user
      account = await GithubAccount.findOne({ user: userId });
      if (!account) { res.status(404).json({ success:false, message:'No GitHub account connected' }); return; }
    }

    // Attach to request for downstream handlers
    req.githubAccount = account;
    next();
  } catch (error) {
    console.error('[Middleware] requireGithubAccount error:', error);
    res.status(500).json({ success:false, message:'Failed to validate GitHub account' });
  }
};


