import { RequestHandler } from 'express';
import { getCommitStats } from '../utils/commitTracker';

/**
 * Get commit statistics for the authenticated user
 */
export const getCommitStatistics: RequestHandler = async (req, res) => {
    try {
        const userId = (req as any).user?.id as string;
        
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
            return;
        }

        const commitStats = await getCommitStats(userId);
        
        res.status(200).json({
            success: true,
            data: commitStats
        });
    } catch (error: any) {
        console.error('Error fetching commit statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch commit statistics'
        });
    }
};
