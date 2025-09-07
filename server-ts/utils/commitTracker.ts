import User from '../models/User';
import mongoose from 'mongoose';

export const trackCommit = async (userId: string): Promise<void> => {
    try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-11

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            console.error('User not found for commit tracking:', userId);
            return;
        }

        // Initialize commitStats if it doesn't exist
        if (!user.commitStats) {
            user.commitStats = {
                totalCommits: 0,
                monthlyCommits: new mongoose.Types.DocumentArray([])
            };
        }

        // Increment total commits
        user.commitStats.totalCommits += 1;

        // Find or create monthly commit entry
        let monthlyEntry = user.commitStats.monthlyCommits.find(
            entry => entry.year === currentYear && entry.month === currentMonth
        );

        if (monthlyEntry) {
            // Update existing entry
            monthlyEntry.count += 1;
            monthlyEntry.lastUpdated = now;
        } else {
            // Create new entry using create method
            const newEntry = user.commitStats.monthlyCommits.create({
                year: currentYear,
                month: currentMonth,
                count: 1,
                lastUpdated: now
            });
            user.commitStats.monthlyCommits.push(newEntry);
        }

        // Save the user
        await user.save();
        console.log(`Commit tracked for user ${userId}. Total commits: ${user.commitStats.totalCommits}`);
    } catch (error) {
        console.error('Error tracking commit:', error);
    }
};

export const getCommitStats = async (userId: string) => {
    try {
        const user = await User.findById(userId).select('commitStats');
        if (!user || !user.commitStats) {
            return {
                totalCommits: 0,
                monthlyCommits: [],
                monthlyBreakdown: []
            };
        }

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        

        // Get last 12 months breakdown
        const monthlyBreakdown = [];
        for (let i = 11; i >= 0; i--) {
            const date = new Date(currentYear, currentMonth - i, 1);
            const year = date.getFullYear();
            const month = date.getMonth();
            
            const entry = user.commitStats.monthlyCommits.find(
                e => e.year === year && e.month === month
            );
            
            monthlyBreakdown.push({
                year,
                month,
                monthName: date.toLocaleString('default', { month: 'short' }),
                count: entry ? entry.count : 0
            });
        }

        return {
            totalCommits: user.commitStats.totalCommits,
            monthlyBreakdown
        };
    } catch (error) {
        console.error('Error getting commit stats:', error);
        return {
            totalCommits: 0,
            monthlyBreakdown: []
        };
    }
};
