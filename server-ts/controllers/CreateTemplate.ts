import { Request, Response } from 'express';
import Template from '../models/Template';

export const createTemplate = async (req: Request, res: Response) => {
  try {
    const { name, slug, description, language, icon,  visibility } = req.body;
        if (!name || !slug || !language) {
        res.status(400).json({ message: 'name, slug, and language are required' });
        return;
    }
    const template = await Template.create({
      name,
      slug,
      description,
      language,
      icon,
      visibility,
    });
    res.status(201).json({ message: 'Template created successfully', template });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ message: 'Failed to create template' });
  }
}; 


export const getTemplates = async (req: Request, res: Response) => {
    try {
      const templates = await Template.find({ visibility: 'public' }).sort({ name: 1 });
      res.status(200).json({ 
        success: true, 
        message: 'Templates fetched successfully', 
        templates 
      });
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch templates' 
      });
    }
  }; 