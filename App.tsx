
import React, { useState, useEffect } from 'react';
import { Tab, Evaluation, Category } from './types';
import { dataService } from './services/supabaseClient';
import { LayoutGrid, FilePlus, BookOpen, Clock, Tags, FileText, GraduationCap, X, Trash2, AlertTriangle, ChevronRight, Sparkles } from 'lucide-react';

import CategoryManager from './components/CategoryManager';
import EvaluationEditor from './components/EvaluationEditor';
import PdfPreview from './components/PdfPreview';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [selectedEvalId, setSelectedEvalId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{ eval: Evaluation, mode: 'student' | 'teacher' } | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState<Evaluation | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState<Evaluation | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    const [evals, cats] = await Promise.all([
      dataService.getEvaluations(),
      dataService.getCategories()
    ]);
    setEvaluations(evals);
    setCategories(cats);
  };

  const handleEditEvaluation = (id: string | null) => {
    setSelectedEvalId(id);
    setActiveTab('editor');
  };

  const requestPreview = (evaluation: Evaluation) => {
    setPreviewModalOpen(evaluation);
  };

  const confirmPreview = (mode: 'student' | 'teacher') => {
    if (previewModalOpen) {
      setPreviewData({ eval: previewModalOpen, mode });
      setPreviewModalOpen(null);
    }
  };

  const handleDeleteEvaluation = async () => {
    if (!deleteModalOpen) return;
    try {
      await dataService.deleteEvaluation(deleteModalOpen.id);
      setDeleteModalOpen(null);
      await loadData();
    } catch (error) {
      console.error("Error deleting evaluation:", error);
    }
  };

  const renderDashboard = () => (
    <div className="max-w-7xl mx-auto p-8 animate-fade-in">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold mb-2">
            <Sparkles size={20} />
            <span className="uppercase tracking-wider text-xs">Espace Famille DCB</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Tableau de bord</h1>
          <p className="text-slate-500 text-lg mt-1">Gérez vos évaluations avec simplicité et élégance.</p>
        </div>
        <button 
          onClick={() => handleEditEvaluation(null)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all hover:-translate-y-1 flex items-center gap-2 group"
        >
          <FilePlus size={20} className="group-hover:rotate-12 transition-transform" />
          Nouveau questionnaire
        </button>
      </header>

      {categories.length === 0 ? (
         <div className="text-center p-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-500">
              <Tags size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Aucune matière configurée</h2>
            <p className="mb-8 text-slate-500 max-w-sm mx-auto">Commencez par organiser votre espace en créant vos matières d'enseignement.</p>
            <button 
              onClick={() => setActiveTab('categories')} 
              className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all"
            >
              Gérer les matières
            </button>
         </div>
      ) : (
        <div className="space-y-12">
          {categories.map(cat => {
            const catEvals = evaluations.filter(e => e.category_id === cat.id);
            if (catEvals.length === 0) return null;

            return (
              <div key={cat.id} className="animate-fade-in">
                <div className="flex items-center justify-between mb-6 group cursor-default">
                  <div className="flex items-center gap-4">
                    <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: cat.color }}></div>
                    <h2 className="text-2xl font-extrabold text-slate-800">{cat.name}</h2>
                    <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold uppercase tracking-widest">
                      {catEvals.length} {catEvals.length > 1 ? 'fichiers' : 'fichier'}
                    </span>
                  </div>
                  <div className="h-px flex-grow mx-8 bg-slate-100"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {catEvals.map(ev => (
                    <div 
                      key={ev.id} 
                      className="group relative bg-white p-7 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all cursor-pointer overflow-hidden"
                      onClick={() => handleEditEvaluation(ev.id)}
                    >
                      {/* Accent bar */}
                      <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: cat.color }}></div>
                      
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover:text-indigo-500 transition-colors">
                          <FileText size={20} />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModalOpen(ev);
                          }}
                          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <h3 className="font-extrabold text-xl text-slate-800 mb-4 group-hover:text-indigo-600 transition-colors leading-tight">
                        {ev.title}
                      </h3>
                      
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Clock size={14} />
                            <span>{new Date(ev.created_at || '').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                          </div>
                          <span>•</span>
                          <span className="bg-slate-50 px-2 py-1 rounded-md">{ev.questions.length} questions</span>
                        </div>
                        <div className="text-indigo-500 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                          <ChevronRight size={20} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fcfdff] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-700">
      {!previewData && (activeTab as string) !== 'editor' && (
        <nav className="fixed left-0 top-0 h-full w-24 bg-white border-r border-slate-100 flex flex-col items-center py-10 z-20 shadow-sm">
          <div className="mb-12 p-3 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-[22px] text-white shadow-lg shadow-indigo-200">
            <BookOpen size={28} />
          </div>
          
          <div className="flex flex-col gap-8 w-full px-4">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`p-4 rounded-2xl transition-all flex flex-col items-center gap-2 group ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
              title="Tableau de bord"
            >
              <LayoutGrid size={24} className={`${activeTab === 'dashboard' ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Accueil</span>
            </button>
            <button
              onClick={() => handleEditEvaluation(null)}
              className={`p-4 rounded-2xl transition-all flex flex-col items-center gap-2 group ${activeTab === 'editor' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
              title="Nouveau"
            >
              <FilePlus size={24} className={`${activeTab === 'editor' ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Créer</span>
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`p-4 rounded-2xl transition-all flex flex-col items-center gap-2 group ${activeTab === 'categories' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
              title="Matières"
            >
              <Tags size={24} className={`${activeTab === 'categories' ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Matières</span>
            </button>
          </div>
          
          <div className="mt-auto mb-4 text-slate-300 font-black text-xs vertical-text tracking-[0.3em]">
            DCB FAMILLE
          </div>
        </nav>
      )}

      <main className={`${!previewData && (activeTab as string) !== 'editor' ? 'pl-24' : ''} min-h-screen`}>
        {activeTab === 'dashboard' && renderDashboard()}
        
        {activeTab === 'categories' && (
          <div className="p-8">
            <CategoryManager onBack={() => setActiveTab('dashboard')} />
          </div>
        )}
        
        {activeTab === 'editor' && (
          <EvaluationEditor 
            evaluationId={selectedEvalId} 
            onClose={() => setActiveTab('dashboard')}
            onPreview={requestPreview}
          />
        )}

        {previewData && (
          <PdfPreview 
            evaluation={previewData.eval}
            category={categories.find(c => c.id === previewData.eval.category_id)}
            mode={previewData.mode}
            onClose={() => setPreviewData(null)}
          />
        )}
      </main>

      {/* Modal Backdrop Styling */}
      {previewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-lg w-full p-10 animate-fade-in relative">
            <button onClick={() => setPreviewModalOpen(null)} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} />
            </button>
            <h3 className="text-3xl font-black text-slate-900 mb-3">Mode d'aperçu</h3>
            <p className="text-slate-500 mb-10 text-lg">
              Préparez le document pour <strong>{previewModalOpen.title}</strong>.
            </p>
            <div className="grid grid-cols-1 gap-5">
              <button 
                onClick={() => confirmPreview('student')}
                className="flex items-center gap-5 p-6 border-2 border-slate-50 rounded-3xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group text-left"
              >
                <div className="bg-indigo-100 text-indigo-600 p-4 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <GraduationCap size={28} />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-lg">Version Élève</div>
                  <div className="text-slate-500">Prêt pour le contrôle, espaces vides.</div>
                </div>
              </button>
              <button 
                onClick={() => confirmPreview('teacher')}
                className="flex items-center gap-5 p-6 border-2 border-slate-50 rounded-3xl hover:border-emerald-500 hover:bg-emerald-50 transition-all group text-left"
              >
                <div className="bg-emerald-100 text-emerald-600 p-4 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <FileText size={28} />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-lg">Version Professeur</div>
                  <div className="text-slate-500">Corrigé complet inclus.</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full p-10 animate-fade-in text-center">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-3">Supprimer ?</h3>
            <p className="text-slate-500 mb-10">
              Voulez-vous vraiment supprimer <strong>"{deleteModalOpen.title}"</strong> ? Cette action est irréversible.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteModalOpen(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors">
                Annuler
              </button>
              <button onClick={handleDeleteEvaluation} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-colors">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
