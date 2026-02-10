
import React, { useState, useEffect, useRef } from 'react';
import { Category, Evaluation, Question } from '../types';
import { dataService } from '../services/supabaseClient';
import RichTextEditor from './RichTextEditor';
import { Plus, Trash2, ArrowLeft, GripVertical, FileText, CheckCircle, AlertCircle, X, Sparkles, Layout, Layers, Calculator, Save } from 'lucide-react';

interface EvaluationEditorProps {
  evaluationId?: string | null;
  onClose: () => void;
  onPreview: (evaluation: Evaluation) => void;
}

const EvaluationEditor: React.FC<EvaluationEditorProps> = ({ evaluationId, onClose, onPreview }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [evaluation, setEvaluation] = useState<Evaluation>({
    id: evaluationId || crypto.randomUUID(),
    title: '',
    category_id: '',
    questions: []
  });
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{type: 'success'|'error', message: string} | null>(null);

  // Refs pour les textareas auto-extensibles
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  useEffect(() => {
    const init = async () => {
      const cats = await dataService.getCategories();
      setCategories(cats);
      
      if (evaluationId) {
        const allEvals = await dataService.getEvaluations();
        const found = allEvals.find(e => e.id === evaluationId);
        if (found) {
          // Assurer la rétrocompatibilité si 'points' n'existe pas
          const safeEval = JSON.parse(JSON.stringify(found));
          safeEval.questions = safeEval.questions.map((q: any) => ({
             ...q,
             points: q.points ?? 2
          }));
          setEvaluation(safeEval);
        }
      } else if (cats.length > 0) {
        setEvaluation(prev => ({ ...prev, category_id: cats[0].id }));
      }
      setLoading(false);
    };
    init();
  }, [evaluationId]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Fonction pour ajuster la hauteur des textareas
  const adjustTextareaHeight = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const addQuestion = () => {
    // Récupérer la section de la dernière question pour l'héritage
    const lastQuestion = evaluation.questions[evaluation.questions.length - 1];
    const inheritedSection = lastQuestion ? lastQuestion.section_name : 'Exercice 1';

    const newQ: Question = {
      id: crypto.randomUUID(),
      section_name: inheritedSection,
      question_text: '',
      teacher_answer: '',
      student_prompt: null,
      order_index: evaluation.questions.length,
      points: 2 // Défaut 2 points
    };
    setEvaluation(prev => ({ ...prev, questions: [...prev.questions, newQ] }));
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...evaluation.questions];
    updated[index] = { ...updated[index], [field]: value };
    setEvaluation(prev => ({ ...prev, questions: updated }));
  };

  const removeQuestion = (index: number) => {
    const updated = evaluation.questions.filter((_, i) => i !== index);
    setEvaluation(prev => ({ ...prev, questions: updated }));
  };

  const handleSave = async () => {
    if (!evaluation.title || !evaluation.category_id) {
      setNotification({ type: 'error', message: "Veuillez remplir le titre et choisir une matière." });
      return;
    }
    try {
      await dataService.saveEvaluation(evaluation);
      setNotification({ type: 'success', message: "Sauvegardé avec succès !" });
    } catch (e) {
      setNotification({ type: 'error', message: "Erreur lors de la sauvegarde." });
    }
  };

  if (loading) return <div className="p-20 text-center font-bold text-slate-400">Ouverture de l'éditeur...</div>;

  const currentCategory = categories.find(c => c.id === evaluation.category_id);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 pb-32 animate-fade-in">
      
      {notification && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 text-white font-bold transition-all animate-fade-in ${notification.type === 'success' ? 'bg-indigo-600' : 'bg-rose-600'}`}>
          {notification.type === 'success' ? <CheckCircle size={22} /> : <AlertCircle size={22} />}
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-80"><X size={18}/></button>
        </div>
      )}

      {/* Interface Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-6">
          <button onClick={onClose} className="p-3 bg-white border border-slate-100 hover:bg-slate-50 rounded-2xl shadow-sm transition-all text-slate-600">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              {evaluationId ? 'Modifier l\'évaluation' : 'Nouveau questionnaire'}
            </h2>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleSave}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 font-bold transition-all shadow-sm text-sm"
          >
            <Save size={18} className="text-indigo-500" /> Sauvegarder
          </button>
          <button 
            onClick={() => onPreview(evaluation)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 transition-all group text-sm"
          >
            <FileText size={18} className="group-hover:translate-x-0.5 transition-transform" /> Aperçu PDF
          </button>
        </div>
      </div>

      {/* Main Form Sections - Condensed */}
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Titre du document</label>
          <input
            type="text"
            className="w-full text-xl font-bold p-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-xl outline-none transition-all text-slate-800"
            placeholder="Ex: Évaluation de Mathématiques - T1"
            value={evaluation.title}
            onChange={(e) => setEvaluation({ ...evaluation, title: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Discipline</label>
          <div className="relative">
            <select
              className="w-full p-3 bg-slate-50 border-2 border-transparent rounded-xl focus:border-indigo-500/20 focus:bg-white outline-none font-bold text-slate-700 appearance-none transition-all text-sm"
              value={evaluation.category_id}
              onChange={(e) => setEvaluation({ ...evaluation, category_id: e.target.value })}
            >
              <option value="" disabled>Sélectionner...</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Layout size={16} />
            </div>
          </div>
          {currentCategory && (
            <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentCategory.color }}></span>
              Code couleur actif
            </div>
          )}
        </div>
      </div>

      {/* Questions Stack - Condensed */}
      <div className="space-y-6">
        {evaluation.questions.map((q, idx) => (
          <div key={q.id} className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden group hover:border-indigo-100 transition-colors animate-fade-in">
            {/* Question Header */}
            <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex justify-between items-center flex-wrap gap-3">
              <div className="flex items-center gap-3 flex-grow">
                <GripVertical className="text-slate-300 cursor-grab hover:text-indigo-400 transition-colors" size={18} />
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-black text-indigo-600 shadow-sm">
                    {idx + 1}
                  </span>
                  
                  {/* Section Name Input */}
                  <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg border border-slate-200 focus-within:border-indigo-300 transition-colors">
                    <Layers size={14} className="text-slate-400" />
                    <input
                      type="text"
                      value={q.section_name}
                      onChange={(e) => updateQuestion(idx, 'section_name', e.target.value)}
                      className="bg-transparent font-bold text-slate-700 outline-none text-sm w-48 placeholder:text-slate-300"
                      placeholder="Nom de la section"
                    />
                  </div>

                  {/* Points Input */}
                  <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg border border-slate-200 focus-within:border-amber-300 transition-colors ml-2">
                    <Calculator size={14} className="text-slate-400" />
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={q.points || 0}
                      onChange={(e) => updateQuestion(idx, 'points', parseFloat(e.target.value))}
                      className="bg-transparent font-bold text-slate-700 outline-none text-sm w-12 text-center"
                    />
                    <span className="text-xs text-slate-400 font-bold">pts</span>
                  </div>
                </div>
              </div>
              <button onClick={() => removeQuestion(idx)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                <Trash2 size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Question Input (Auto-growing) */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Consigne / Énoncé</label>
                <textarea
                  ref={(el) => { textareaRefs.current[idx] = el; }}
                  className="w-full p-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 focus:bg-white outline-none overflow-hidden min-h-[80px] font-medium text-slate-700 transition-all leading-relaxed resize-none"
                  placeholder="Tapez ici l'énoncé complet..."
                  value={q.question_text}
                  rows={2}
                  onInput={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
                  onChange={(e) => updateQuestion(idx, 'question_text', e.target.value)}
                  style={{ height: 'auto' }} 
                />
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Corrigé */}
                <div>
                  <div className="flex items-center gap-2 mb-2 ml-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Réponse Prof</label>
                  </div>
                  <RichTextEditor
                    value={q.teacher_answer}
                    onChange={(val) => updateQuestion(idx, 'teacher_answer', val)}
                    className="min-h-[100px] rounded-2xl border-2 border-slate-100 hover:border-emerald-100 focus-within:border-emerald-200 transition-all"
                    placeholder="Réponse type..."
                  />
                </div>

                {/* Espace Élève */}
                <div>
                  <div className="flex justify-between items-center mb-2 ml-1">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                      <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Espace Élève</label>
                    </div>
                    <button
                      onClick={() => updateQuestion(idx, 'student_prompt', q.student_prompt === null ? '' : null)}
                      className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1.5"
                    >
                      {q.student_prompt === null ? <Plus size={14} /> : <X size={14} />}
                      {q.student_prompt === null ? 'Zone Spéciale' : 'Lignes'}
                    </button>
                  </div>
                  
                  {q.student_prompt === null ? (
                    <div className="h-[140px] w-full border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30 flex items-center justify-center text-slate-300 text-[10px] font-black flex-col relative overflow-hidden group/zone">
                      <div className="w-full h-full dotted-lines opacity-20 group-hover/zone:opacity-30 transition-opacity"></div>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <Sparkles size={20} className="mb-2 opacity-30" />
                        <span className="uppercase tracking-widest">Lignes automatiques</span>
                      </div>
                    </div>
                  ) : (
                    <RichTextEditor
                      value={q.student_prompt || ''}
                      onChange={(val) => updateQuestion(idx, 'student_prompt', val)}
                      className="min-h-[100px] rounded-2xl border-2 border-slate-100 hover:border-indigo-100 focus-within:border-indigo-200 transition-all"
                      placeholder="Contenu pré-rempli..."
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={addQuestion}
          className="w-full py-6 border-3 border-dashed border-slate-100 rounded-[32px] text-slate-300 hover:border-indigo-200 hover:text-indigo-400 hover:bg-indigo-50/20 transition-all flex items-center justify-center gap-3 group"
        >
          <div className="p-2 bg-slate-50 text-slate-300 group-hover:bg-indigo-100 group-hover:text-indigo-600 rounded-xl transition-all">
            <Plus size={24} />
          </div>
          <span className="text-sm font-black uppercase tracking-[0.2em]">Ajouter une question</span>
        </button>

        {/* Bottom Save Bar */}
        <div className="sticky bottom-4 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-2xl flex justify-between items-center animate-fade-in z-40">
           <div className="text-xs font-bold text-slate-400 pl-2">
             {evaluation.questions.length} question{evaluation.questions.length > 1 ? 's' : ''} • {evaluation.questions.reduce((acc, q) => acc + (q.points || 0), 0)} points total
           </div>
           <div className="flex gap-3">
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-900 font-bold transition-all shadow-md text-sm"
              >
                <Save size={18} /> Enregistrer
              </button>
              <button 
                onClick={() => onPreview(evaluation)}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 transition-all text-sm"
              >
                <FileText size={18} /> Aperçu
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationEditor;
