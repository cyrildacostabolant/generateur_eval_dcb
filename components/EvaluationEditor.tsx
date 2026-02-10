
import React, { useState, useEffect } from 'react';
import { Category, Evaluation, Question } from '../types';
import { dataService } from '../services/supabaseClient';
import RichTextEditor from './RichTextEditor';
import { Plus, Trash2, ArrowLeft, GripVertical, FileText, CheckCircle, AlertCircle, X, Sparkles, Layout, Layers, Calculator } from 'lucide-react';

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
    <div className="max-w-6xl mx-auto p-4 md:p-10 pb-32 animate-fade-in">
      
      {notification && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 text-white font-bold transition-all animate-fade-in ${notification.type === 'success' ? 'bg-indigo-600' : 'bg-rose-600'}`}>
          {notification.type === 'success' ? <CheckCircle size={22} /> : <AlertCircle size={22} />}
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-80"><X size={18}/></button>
        </div>
      )}

      {/* Interface Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-6">
          <button onClick={onClose} className="p-4 bg-white border border-slate-100 hover:bg-slate-50 rounded-2xl shadow-sm transition-all text-slate-600">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-3xl font-black text-slate-900">
              {evaluationId ? 'Modifier l\'évaluation' : 'Nouveau questionnaire'}
            </h2>
            <p className="text-slate-400 font-medium">Configurez le contenu et le format de votre évaluation.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleSave}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl hover:bg-slate-50 font-black transition-all shadow-sm"
          >
            <CheckCircle size={20} className="text-indigo-500" /> Sauvegarder
          </button>
          <button 
            onClick={() => onPreview(evaluation)}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 font-black shadow-lg shadow-indigo-200 transition-all group"
          >
            <FileText size={20} className="group-hover:translate-x-0.5 transition-transform" /> Aperçu PDF
          </button>
        </div>
      </div>

      {/* Main Form Sections */}
      <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 mb-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Titre du document</label>
          <input
            type="text"
            className="w-full text-2xl font-black p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white rounded-2xl outline-none transition-all text-slate-800"
            placeholder="Ex: Évaluation de Mathématiques - T1"
            value={evaluation.title}
            onChange={(e) => setEvaluation({ ...evaluation, title: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Discipline</label>
          <div className="relative">
            <select
              className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-500/20 focus:bg-white outline-none font-bold text-slate-700 appearance-none transition-all"
              value={evaluation.category_id}
              onChange={(e) => setEvaluation({ ...evaluation, category_id: e.target.value })}
            >
              <option value="" disabled>Sélectionner...</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Layout size={18} />
            </div>
          </div>
          {currentCategory && (
            <div className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-400">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: currentCategory.color }}></span>
              Code couleur actif
            </div>
          )}
        </div>
      </div>

      {/* Questions Stack */}
      <div className="space-y-8">
        {evaluation.questions.map((q, idx) => (
          <div key={q.id} className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden group hover:border-indigo-100 transition-colors animate-fade-in">
            <div className="bg-slate-50/50 p-6 border-b border-slate-100 flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center gap-4 flex-grow">
                <GripVertical className="text-slate-300 cursor-grab hover:text-indigo-400 transition-colors" size={20} />
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xs font-black text-indigo-600 shadow-sm">
                    {idx + 1}
                  </span>
                  
                  {/* Section Name Input */}
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 focus-within:border-indigo-300 transition-colors">
                    <Layers size={14} className="text-slate-400" />
                    <input
                      type="text"
                      value={q.section_name}
                      onChange={(e) => updateQuestion(idx, 'section_name', e.target.value)}
                      className="bg-transparent font-bold text-slate-700 outline-none text-sm w-48 placeholder:text-slate-300"
                      placeholder="Nom de la section"
                      title="Nom de la section / Exercice"
                    />
                  </div>

                  {/* Points Input */}
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 focus-within:border-amber-300 transition-colors ml-2">
                    <Calculator size={14} className="text-slate-400" />
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={q.points || 0}
                      onChange={(e) => updateQuestion(idx, 'points', parseFloat(e.target.value))}
                      className="bg-transparent font-bold text-slate-700 outline-none text-sm w-12 text-center"
                      title="Points"
                    />
                    <span className="text-xs text-slate-400 font-bold">pts</span>
                  </div>
                </div>
              </div>
              <button onClick={() => removeQuestion(idx)} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all">
                <Trash2 size={20} />
              </button>
            </div>
            
            <div className="p-10 space-y-10">
              {/* Question Input */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Consigne / Énoncé</label>
                <textarea
                  className="w-full p-6 bg-slate-50/50 border-2 border-slate-100 rounded-[24px] focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 focus:bg-white outline-none resize-none h-32 font-medium text-slate-700 transition-all leading-relaxed"
                  placeholder="Tapez ici l'énoncé complet..."
                  value={q.question_text}
                  onChange={(e) => updateQuestion(idx, 'question_text', e.target.value)}
                />
              </div>

              <div className="grid lg:grid-cols-2 gap-10">
                {/* Corrigé */}
                <div>
                  <div className="flex items-center gap-2 mb-4 ml-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <label className="block text-xs font-black text-emerald-600 uppercase tracking-[0.2em]">Réponse attendue (Prof)</label>
                  </div>
                  <RichTextEditor
                    value={q.teacher_answer}
                    onChange={(val) => updateQuestion(idx, 'teacher_answer', val)}
                    className="min-h-[220px] rounded-[24px] border-2 border-slate-100 hover:border-emerald-100 focus-within:border-emerald-200 transition-all"
                    placeholder="Indiquez ici la réponse type pour le corrigé..."
                  />
                </div>

                {/* Espace Élève */}
                <div>
                  <div className="flex justify-between items-center mb-4 ml-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      <label className="block text-xs font-black text-indigo-600 uppercase tracking-[0.2em]">Espace de réponse (Élève)</label>
                    </div>
                    <button
                      onClick={() => updateQuestion(idx, 'student_prompt', q.student_prompt === null ? '' : null)}
                      className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1.5"
                    >
                      {q.student_prompt === null ? <Plus size={14} /> : <X size={14} />}
                      {q.student_prompt === null ? 'Zone Spéciale' : 'Lignes Standard'}
                    </button>
                  </div>
                  
                  {q.student_prompt === null ? (
                    <div className="h-[220px] w-full border-2 border-dashed border-slate-100 rounded-[24px] bg-slate-50/30 flex items-center justify-center text-slate-300 text-xs font-black flex-col relative overflow-hidden group/zone">
                      <div className="w-full h-full dotted-lines opacity-20 group-hover/zone:opacity-30 transition-opacity"></div>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <Sparkles size={24} className="mb-2 opacity-30" />
                        <span className="uppercase tracking-widest">Zone de lignes automatiques</span>
                      </div>
                    </div>
                  ) : (
                    <RichTextEditor
                      value={q.student_prompt || ''}
                      onChange={(val) => updateQuestion(idx, 'student_prompt', val)}
                      className="min-h-[220px] rounded-[24px] border-2 border-slate-100 hover:border-indigo-100 focus-within:border-indigo-200 transition-all"
                      placeholder="Contenu pré-rempli (schéma, texte à trous...)"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={addQuestion}
          className="w-full py-10 border-4 border-dashed border-slate-100 rounded-[40px] text-slate-300 hover:border-indigo-200 hover:text-indigo-400 hover:bg-indigo-50/20 transition-all flex flex-col items-center justify-center gap-4 group"
        >
          <div className="p-4 bg-slate-50 text-slate-300 group-hover:bg-indigo-100 group-hover:text-indigo-600 rounded-2xl transition-all">
            <Plus size={32} />
          </div>
          <span className="text-xl font-black uppercase tracking-[0.2em]">Ajouter une question</span>
        </button>
      </div>
    </div>
  );
};

export default EvaluationEditor;
