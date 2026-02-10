import React from 'react';
import { Evaluation, Category } from '../types';
import { ArrowLeft, Printer } from 'lucide-react';

interface PdfPreviewProps {
  evaluation: Evaluation;
  category?: Category;
  mode: 'student' | 'teacher';
  onClose: () => void;
}

const PdfPreview: React.FC<PdfPreviewProps> = ({ evaluation, category, mode, onClose }) => {
  const categoryColor = category?.color || '#3b82f6';

  const handlePrint = () => {
    window.print();
  };

  /**
   * Estime le nombre de lignes d'un contenu HTML pour générer 
   * une zone de réponse proportionnelle.
   */
  const getDottedLinesHeight = (teacherAnswer: string) => {
    if (!teacherAnswer) return 120; // 4 lignes par défaut si vide

    // On compte les balises de fin de bloc ou les sauts de ligne
    const lineBreaks = (teacherAnswer.match(/<\/p>|<br\/?>|<\/li>|<\/h\d>/gi) || []).length;
    
    // On vérifie s'il y a du texte brut sans balises de structure
    const hasText = teacherAnswer.replace(/<[^>]*>/g, '').trim().length > 0;
    
    // Si pas de balises mais du texte, on compte au moins une ligne
    const estimatedTeacherLines = Math.max(1, lineBreaks + (lineBreaks === 0 && hasText ? 1 : 0));
    
    // On ajoute +1 ligne comme demandé
    const totalLines = estimatedTeacherLines + 1;
    
    // Hauteur = lignes * 30px (basé sur le CSS line-height de index.html)
    return totalLines * 30;
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-90 z-50 overflow-y-auto flex flex-col items-center">
      {/* Toolbar - Hidden when printing */}
      <div className="w-full bg-white p-4 shadow-md sticky top-0 z-10 flex justify-between items-center no-print">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-gray-600 hover:text-black flex items-center gap-2">
            <ArrowLeft size={20} /> Retour
          </button>
          <h2 className="font-bold text-lg">Aperçu {mode === 'teacher' ? 'Professeur' : 'Élève'}</h2>
        </div>
        <button
          onClick={handlePrint}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
          <Printer size={18} /> Imprimer / PDF
        </button>
      </div>

      {/* A4 Container */}
      <div className="py-8 print:p-0">
        <div className="a4-page bg-white mx-auto shadow-2xl relative flex flex-col print:shadow-none">
          {/* HEADER */}
          <div className="p-[1cm] pb-0">
            {/* Top Frame: Date & Title */}
            <div className="h-[2cm] flex border-2 border-black mb-[0.5cm] overflow-hidden">
              <div className="w-[20%] border-r-2 border-black flex flex-col justify-center items-center p-2">
                <span className="text-xs text-gray-500 uppercase">Date</span>
                <div className="text-gray-300">..../..../....</div>
              </div>
              <div 
                className="w-[80%] flex items-center justify-center text-center px-4 font-bold text-xl uppercase tracking-wider text-white"
                style={{ backgroundColor: categoryColor, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
              >
                {evaluation.title}
              </div>
            </div>

            {/* Bottom Frame: Comments & Grade */}
            <div className="h-[3cm] flex border-2 border-black mb-8">
              <div className="w-[80%] border-r-2 border-black p-2 relative">
                <span className="text-xs text-gray-500 uppercase absolute top-1 left-2">Commentaires</span>
              </div>
              <div className="w-[20%] p-2 relative flex flex-col justify-end items-center">
                 <span className="text-xs text-gray-500 uppercase absolute top-1 left-2">Note</span>
                 <div className="text-2xl font-bold text-gray-800">/ 20</div>
              </div>
            </div>
          </div>

          {/* CONTENT */}
          <div className="px-[1cm] flex-grow">
            {evaluation.questions.map((q, idx) => (
              <div key={q.id} className="mb-6 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                <div className="flex gap-2 items-baseline mb-2">
                  <h3 className="font-bold text-lg underline decoration-2 underline-offset-2" style={{ textDecorationColor: categoryColor }}>
                    {q.section_name}
                  </h3>
                </div>

                <div className="mb-4 text-blue-900 font-medium text-base">
                   {q.question_text}
                </div>

                {/* Answer Area */}
                <div className="pl-4">
                  {mode === 'teacher' ? (
                    <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-900 editor-content"
                         style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
                         dangerouslySetInnerHTML={{ __html: q.teacher_answer }} 
                    />
                  ) : (
                    // Student Mode
                    <>
                      {q.student_prompt ? (
                         <div className="editor-content" dangerouslySetInnerHTML={{ __html: q.student_prompt }} />
                      ) : (
                        // Espace de réponse proportionnel
                        <div 
                          className="w-full dotted-lines border-b border-gray-300" 
                          style={{ height: `${getDottedLinesHeight(q.teacher_answer)}px` }}
                        ></div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Pagination */}
          <div className="mt-auto p-[1cm] pt-4 text-right text-xs text-gray-400 border-t border-gray-100 mx-[1cm]">
            EvalGen Pro &bull; {evaluation.title}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
             margin-bottom: 2cm;
          }
          body { 
             counter-reset: page; 
          }
          .a4-page {
             margin: 0;
             box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
};

export default PdfPreview;