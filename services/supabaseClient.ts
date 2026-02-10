import { createClient } from '@supabase/supabase-js';
import { Category, Evaluation } from '../types';

// --- CONFIGURATION SUPABASE ---
const SUPABASE_URL: string = "https://ludjqwklfvbzcltbopse.supabase.co";
const SUPABASE_KEY: string = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1ZGpxd2tsZnZiemNsdGJvcHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzI3NTksImV4cCI6MjA4NjI0ODc1OX0.fzfzmbvEWm3DvMA1j2D_niFNpkoX2yj8zuab3TM4hQg";

const envUrl = process.env.SUPABASE_URL;
const envKey = process.env.SUPABASE_KEY;

const storedUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('supabase_url') : null;
const storedKey = typeof localStorage !== 'undefined' ? localStorage.getItem('supabase_key') : null;

const finalUrl = (SUPABASE_URL && SUPABASE_URL !== "https://votre-projet.supabase.co") ? SUPABASE_URL : (envUrl || storedUrl || '');
const finalKey = (SUPABASE_KEY && SUPABASE_KEY !== "votre-cle-anon-publique") ? SUPABASE_KEY : (envKey || storedKey || '');

export const isSupabaseConfigured = !!(finalUrl && finalKey);

export const supabase = isSupabaseConfigured 
  ? createClient(finalUrl, finalKey) 
  : null;

export const updateSupabaseConfig = (url: string, key: string) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_key', key);
    window.location.reload();
  }
};

export const resetSupabaseConfig = () => {
    if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_key');
    window.location.reload();
  }
};

// --- Mock Data Service ---

let MOCK_CATEGORIES: Category[] = [
  { id: '1', name: 'Mathématiques', color: '#3b82f6' },
  { id: '2', name: 'Histoire', color: '#ef4444' },
  { id: '3', name: 'Sciences', color: '#10b981' },
  { id: '4', name: 'Français', color: '#f59e0b' },
];

let MOCK_EVALUATIONS: Evaluation[] = [
  {
    id: '101',
    title: 'Algèbre et Géométrie',
    category_id: '1',
    created_at: new Date().toISOString(),
    questions: [
      {
        id: 'q1',
        section_name: 'Exercice 1 : Calcul',
        question_text: 'Résoudre l\'équation suivante : 2x + 4 = 10',
        teacher_answer: '<p>2x = 6 <br> <strong>x = 3</strong></p>',
        student_prompt: null,
        order_index: 0
      },
      {
        id: 'q2',
        section_name: 'Exercice 2 : Géométrie',
        question_text: 'Calculer l\'aire d\'un carré de côté 5cm.',
        teacher_answer: '<p>Aire = c x c = 5 x 5 = <strong>25 cm²</strong></p>',
        student_prompt: '<p>Formule : A = ...</p>',
        order_index: 1
      }
    ]
  }
];

export const dataService = {
  getCategories: async (): Promise<Category[]> => {
    if (supabase) {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) {
        console.error("Supabase Error:", error);
        return MOCK_CATEGORIES;
      }
      return data || [];
    }
    return Promise.resolve(MOCK_CATEGORIES);
  },

  addCategory: async (category: Omit<Category, 'id'>): Promise<Category> => {
    if (supabase) {
      const { data, error } = await supabase.from('categories').insert(category).select().single();
      if (error) throw error;
      return data;
    }
    const newCat = { ...category, id: Math.random().toString(36).substr(2, 9) };
    MOCK_CATEGORIES.push(newCat);
    return Promise.resolve(newCat);
  },

  updateCategory: async (category: Category): Promise<void> => {
    if (supabase) {
      const { error } = await supabase
        .from('categories')
        .update({ name: category.name, color: category.color })
        .eq('id', category.id);
      if (error) throw error;
      return;
    }
    const index = MOCK_CATEGORIES.findIndex(c => c.id === category.id);
    if (index > -1) {
      MOCK_CATEGORIES[index] = category;
    }
    return Promise.resolve();
  },

  deleteCategory: async (id: string): Promise<void> => {
    if (supabase) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    MOCK_CATEGORIES = MOCK_CATEGORIES.filter(c => c.id !== id);
    return Promise.resolve();
  },

  getEvaluations: async (): Promise<Evaluation[]> => {
    if (supabase) {
      const { data, error } = await supabase.from('evaluations').select(`
        *,
        questions (*)
      `);
      if (error) {
         console.error("Supabase Error:", error);
         return MOCK_EVALUATIONS;
      }
      
      const evaluations = data?.map(ev => ({
        ...ev,
        questions: (ev.questions || []).sort((a: any, b: any) => a.order_index - b.order_index)
      })) as Evaluation[];

      return evaluations || [];
    }
    return Promise.resolve(MOCK_EVALUATIONS);
  },

  saveEvaluation: async (evaluation: Evaluation): Promise<void> => {
    if (supabase) {
      const { data: evalData, error } = await supabase.from('evaluations').upsert({
        id: evaluation.id.length < 10 ? undefined : evaluation.id,
        title: evaluation.title,
        category_id: evaluation.category_id,
      }).select().single();

      if (error || !evalData) throw error;

      await supabase.from('questions').delete().eq('evaluation_id', evalData.id);

      if (evaluation.questions.length > 0) {
        const questionsToInsert = evaluation.questions.map((q, idx) => ({
          evaluation_id: evalData.id,
          section_name: q.section_name,
          question_text: q.question_text,
          teacher_answer: q.teacher_answer,
          student_prompt: q.student_prompt,
          order_index: idx
        }));

        const { error: qError } = await supabase.from('questions').insert(questionsToInsert);
        if (qError) throw qError;
      }
      return;
    }
    
    const idx = MOCK_EVALUATIONS.findIndex(e => e.id === evaluation.id);
    if (idx > -1) {
      MOCK_EVALUATIONS[idx] = evaluation;
    } else {
      MOCK_EVALUATIONS.push(evaluation);
    }
    return Promise.resolve();
  },

  deleteEvaluation: async (id: string): Promise<void> => {
    if (supabase) {
      const { error } = await supabase.from('evaluations').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    MOCK_EVALUATIONS = MOCK_EVALUATIONS.filter(e => e.id !== id);
    return Promise.resolve();
  }
};