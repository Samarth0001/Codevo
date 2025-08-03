import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiConnector } from '@/services/apiConnector';
import { getTemplates } from '@/services/operations/ProjectAPI';

interface Template {
  _id: string;
  name: string;
  slug: string;
  description: string;
  language: string;
  icon?: string;
  visibility: 'public' | 'private';
}

interface TemplateContextType {
  templates: Template[];
  loading: boolean;
  error: string | null;
  fetchTemplates: () => Promise<void>;
}

const TemplateContext = createContext<TemplateContextType | undefined>(undefined);

export const useTemplates = () => {
  const context = useContext(TemplateContext);
  if (context === undefined) {
    throw new Error('useTemplates must be used within a TemplateProvider');
  }
  return context;
};

interface TemplateProviderProps {
  children: ReactNode;
}

export const TemplateProvider: React.FC<TemplateProviderProps> = ({ children }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getTemplates();
      
      if (response && response.success) {
        setTemplates(response.templates);
      } else {
        setError(response?.message || 'Failed to fetch templates');
      }
    } catch (err: any) {
      console.error('Error fetching templates:', err);
      setError(err.response?.data?.message || 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const value = {
    templates,
    loading,
    error,
    fetchTemplates,
  };

  return (
    <TemplateContext.Provider value={value}>
      {children}
    </TemplateContext.Provider>
  );
}; 