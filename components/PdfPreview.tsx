import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Evaluation, Category, Question } from '../types';
import { ArrowLeft, Printer } from 'lucide-react';

interface PdfPreviewProps {
  evaluation: Evaluation;
  category?: Category;
  mode: 'student' | 'teacher';
  onClose: () => void;
}

// Types pour la structure de pagination
type PageItemType = 'section' | 'question';

interface PageItem {
  type: PageItemType;
  data: any;
  height: number;
  dottedLinesHeight?: number; // Hauteur calculée pour le mode élève
}

interface Page {
  pageNumber: number;
  items: PageItem[];
}

const PdfPreview: React.FC<PdfPreviewProps> = ({ evaluation, category, mode, onClose }) => {
  const categoryColor = category?.color || '#3b82f6';
  const [pages, setPages] = useState<Page[]>([]);
  const [isMeasuring, setIsMeasuring] = useState(true);
  
  // Ref pour le conteneur "fantôme" qui sert à mesurer
  const measureContainerRef = useRef<HTMLDivElement>(null);

  // Constantes de dimensions (en pixels à ~96DPI)
  // A4 = 210mm x 297mm ≈ 794px x 1123px
  const PAGE_HEIGHT = 1123; 
  const PAGE_PADDING_Y = 76; // ~2cm total (1cm top + 1cm bottom) padding 'p-[1cm]'
  
  // Ajustement des hauteurs réservées pour maximiser l'espace contenu
  // Header: 2cm (76px) + 0.5cm (19px) + 3cm (114px) + mb-8 (32px) = ~241px
  const HEADER_HEIGHT_P1 = 245; 
  
  // Footer: Text line (~16px) + pt-4 (16px) + border (1px) + safe buffer = ~40px
  const FOOTER_HEIGHT = 40; 
  
  // Hauteur disponible
  const CONTENT_HEIGHT_P1 = PAGE_HEIGHT - PAGE_PADDING_Y - HEADER_HEIGHT_P1 - FOOTER_HEIGHT;
  const CONTENT_HEIGHT_PN = PAGE_HEIGHT - PAGE_PADDING_Y - FOOTER_HEIGHT;

  // Style commun pour le texte (Arial 14)
  const contentStyle = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '14pt',
    lineHeight: '1.5'
  };

  const handlePrint = () => {
    window.print();
  };

  // Liste des sections
  const sections = Array.from(new Set(evaluation.questions.map(q => q.section_name || 'Autre')));

  // Algorithme de pagination et mesure
  useLayoutEffect(() => {
    if (!measureContainerRef.current) return;

    const computedPages: Page[] = [];
    let currentPageItems: PageItem[] = [];
    let currentHeight = 0;
    let pageIndex = 1;
    
    // Déterminer la limite de la page actuelle
    let maxPageHeight = CONTENT_HEIGHT_P1;

    // Récupérer tous les éléments mesurés du DOM fantôme
    const elements = Array.from(measureContainerRef.current.children) as HTMLElement[];
    
    // Fonction utilitaire pour calculer la hauteur réelle d'un élément question
    const calculateQuestionMetrics = (el: HTMLElement) => {
      // Hauteur du texte de la question (avec marges incluses dans le rendu ou ajoutées ici)
      const qTextEl = el.querySelector('.measure-question-text') as HTMLElement;
      const qTextHeight = qTextEl ? qTextEl.offsetHeight : 0;
      
      // Hauteur de la réponse prof (pour référence)
      const tAnswerEl = el.querySelector('.measure-teacher-answer') as HTMLElement;
      const tAnswerHeight = tAnswerEl ? tAnswerEl.offsetHeight : 0;
      
      // Calcul des lignes pointillées : Hauteur Prof / 30px (arrondi sup)
      // Modification : On met EXACTEMENT le même nombre de lignes que la réponse prof (minimum 1)
      const linesCount = Math.ceil(tAnswerHeight / 30); 
      const calculatedDottedHeight = Math.max(1, linesCount) * 30;

      // Hauteur totale selon le mode
      // On ajoute les marges (mb-6 = 24px, mb-3 = 12px entre question et réponse)
      // Structure : Wrapper(mb-6) > QText(mb-3) + Answer
      const wrapperMargin = 24; 
      const internalGap = 12;

      let finalHeight = 0;
      if (mode === 'teacher') {
        // En mode prof, c'est la hauteur naturelle du bloc mesuré
        finalHeight = el.offsetHeight + wrapperMargin; 
      } else {
        // En mode élève, on remplace la réponse prof par les pointillés
        const isStudentPrompt = el.dataset.hasPrompt === 'true';
        if (isStudentPrompt) {
            // Si prompt spécifique, on prend la hauteur mesurée du prompt (qui est rendu dans le ghost)
             finalHeight = el.offsetHeight + wrapperMargin;
        } else {
            finalHeight = qTextHeight + internalGap + calculatedDottedHeight + wrapperMargin;
        }
      }

      return { finalHeight, calculatedDottedHeight };
    };

    // Boucle principale de pagination
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const type = el.dataset.type as PageItemType;
      
      let itemHeight = 0;
      let dottedH = 0;
      let itemData: any = null;

      // 1. Récupération des données et calcul de hauteur de l'élément courant
      if (type === 'section') {
        itemData = el.dataset.title;
        // Hauteur de la section (mb-8 = 32px inclus dans le calcul visuel si margin collapse pas, sinon on ajoute)
        itemHeight = el.offsetHeight + 32; 
      } else {
        const qId = el.dataset.id;
        itemData = evaluation.questions.find(q => q.id === qId);
        const metrics = calculateQuestionMetrics(el);
        itemHeight = metrics.finalHeight;
        dottedH = metrics.calculatedDottedHeight;
      }

      // 2. Logique "Keep With Next" pour les Sections
      // Si c'est une section, on regarde si elle tient AVEC la question suivante
      let forceBreak = false;
      if (type === 'section') {
        const nextEl = elements[i + 1];
        if (nextEl && nextEl.dataset.type === 'question') {
          const nextMetrics = calculateQuestionMetrics(nextEl);
          // Si Hauteur courante + Hauteur Section + Hauteur Question > Page
          if (currentHeight + itemHeight + nextMetrics.finalHeight > maxPageHeight) {
            forceBreak = true;
          }
        }
      } else {
        // Pour une question normale, on vérifie juste si elle tient
        if (currentHeight + itemHeight > maxPageHeight) {
           forceBreak = true;
        }
      }

      // 3. Changement de page si nécessaire
      if (forceBreak && currentPageItems.length > 0) {
        computedPages.push({
          pageNumber: pageIndex,
          items: currentPageItems
        });
        pageIndex++;
        currentPageItems = [];
        currentHeight = 0;
        maxPageHeight = CONTENT_HEIGHT_PN;
      }

      // 4. Ajout de l'item
      currentPageItems.push({
        type,
        data: itemData,
        height: itemHeight,
        dottedLinesHeight: dottedH
      });
      currentHeight += itemHeight;
    }

    // Pousser la dernière page
    if (currentPageItems.length > 0) {
      computedPages.push({
        pageNumber: pageIndex,
        items: currentPageItems
      });
    }

    setPages(computedPages);
    setIsMeasuring(false);
  }, [evaluation, mode]);

  // Rendu FINAL d'une question (Affiche les pointillés calculés)
  const renderRealQuestion = (q: Question, dottedHeight?: number) => (
    <div className="mb-6 pl-2">
      <div className="mb-3 text-slate-900 measure-question-text" style={contentStyle}>
        {q.question_text}
      </div>
      <div className="pl-2">
        {mode === 'teacher' ? (
          <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-900 editor-content rounded-r-lg"
               style={contentStyle}
               dangerouslySetInnerHTML={{ __html: q.teacher_answer }} 
          />
        ) : (
          <>
            {q.student_prompt ? (
               <div className="editor-content" style={contentStyle} dangerouslySetInnerHTML={{ __html: q.student_prompt }} />
            ) : (
              <div 
                className="w-full dotted-lines" 
                style={{ height: `${dottedHeight || 30}px` }}
              ></div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-90 z-50 overflow-y-auto flex flex-col items-center pdf-modal-root">
      
      {/* --- GHOST CONTAINER (Pour mesure) --- */}
      {/* IMPORTANT : Doit avoir les mêmes styles de police que le rendu final pour que les calculs soient justes */}
      <div 
        ref={measureContainerRef} 
        className="absolute top-0 left-0 -z-50 opacity-0 pointer-events-none bg-white no-print"
        style={{ width: '210mm', padding: '0 1cm' }}
      >
        {sections.map(section => (
          <React.Fragment key={section}>
            {/* Section Header Ghost */}
            <div className="mb-8" data-type="section" data-title={section}>
               <div className="mb-4 pb-2 border-b-2" style={{ borderColor: categoryColor }}>
                  <h3 className="font-bold text-xl uppercase tracking-wider" style={{ color: categoryColor }}>
                    {section}
                  </h3>
                </div>
            </div>
            {/* Questions Ghost */}
            {evaluation.questions
              .filter(q => (q.section_name || 'Autre') === section)
              .map(q => (
                <div key={q.id} data-type="question" data-id={q.id} data-has-prompt={!!q.student_prompt}>
                  <div className="mb-6 pl-2">
                    <div className="mb-3 text-slate-900 measure-question-text" style={contentStyle}>
                        {q.question_text}
                    </div>
                    
                    <div className="pl-2">
                         {q.student_prompt ? (
                            <div className="editor-content" style={contentStyle} dangerouslySetInnerHTML={{ __html: q.student_prompt }} />
                         ) : (
                            // On applique le style aussi ici pour que la hauteur mesurée corresponde à la taille Arial 14
                            <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-900 editor-content rounded-r-lg measure-teacher-answer"
                                style={contentStyle}
                                dangerouslySetInnerHTML={{ __html: q.teacher_answer }} 
                            />
                         )}
                    </div>
                  </div>
                </div>
              ))
            }
          </React.Fragment>
        ))}
      </div>


      {/* Toolbar */}
      <div className="w-full bg-white p-4 shadow-md sticky top-0 z-10 flex justify-between items-center no-print">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-gray-600 hover:text-black flex items-center gap-2">
            <ArrowLeft size={20} /> Retour
          </button>
          <h2 className="font-bold text-lg">Aperçu {mode === 'teacher' ? 'Professeur' : 'Élève'} {isMeasuring && '(Calcul...)'}</h2>
        </div>
        <button
          onClick={handlePrint}
          disabled={isMeasuring}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
        >
          <Printer size={18} /> Imprimer
        </button>
      </div>

      {/* --- REAL RENDER (Pages paginées) --- */}
      <div className="py-8 w-full flex flex-col items-center gap-8 print-wrapper">
        {!isMeasuring && pages.map((page) => (
          <div key={page.pageNumber} className="a4-page bg-white shadow-2xl relative flex flex-col overflow-hidden">
            
            {/* Page Padding Container */}
            <div className="p-[1cm] flex-grow flex flex-col h-full">
              
              {/* En-tête (Uniquement Page 1) */}
              {page.pageNumber === 1 && (
                <div className="mb-8">
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
                  <div className="h-[3cm] flex border-2 border-black">
                    <div className="w-[80%] border-r-2 border-black p-2 relative">
                      <span className="text-xs text-gray-500 uppercase absolute top-1 left-2">Commentaires</span>
                    </div>
                    <div className="w-[20%] p-2 relative flex flex-col justify-end items-center">
                      <span className="text-xs text-gray-500 uppercase absolute top-1 left-2">Note</span>
                      <div className="text-2xl font-bold text-gray-800">/ 20</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Contenu de la page */}
              <div className="flex-grow">
                {page.items.map((item, idx) => (
                  <div key={idx}>
                    {item.type === 'section' ? (
                      <div className="mb-8">
                        <div className="mb-4 pb-2 border-b-2" style={{ borderColor: categoryColor }}>
                          <h3 className="font-bold text-xl uppercase tracking-wider" style={{ color: categoryColor }}>
                            {item.data}
                          </h3>
                        </div>
                      </div>
                    ) : (
                      renderRealQuestion(item.data, item.dottedLinesHeight)
                    )}
                  </div>
                ))}
              </div>

              {/* Footer Pagination */}
              <div className="mt-auto pt-4 flex justify-between items-center text-xs text-gray-400 border-t border-gray-100">
                <span className="font-bold uppercase tracking-wider">{evaluation.title}</span>
                <span>Page {page.pageNumber}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          @page {
             size: A4;
             margin: 0;
          }
          
          /* Cache tout le contenu de la page par défaut */
          body {
            visibility: hidden;
            background: white;
          }

          /* Force la visibilité du conteneur modal et de son contenu */
          .pdf-modal-root {
             visibility: visible !important;
             position: absolute !important;
             top: 0 !important;
             left: 0 !important;
             width: 100% !important;
             height: auto !important;
             margin: 0 !important;
             padding: 0 !important;
             background: white !important;
             overflow: visible !important;
             z-index: 9999;
          }
          
          /* Cache spécifiquement la toolbar et le fond gris */
          .no-print, .bg-gray-900 {
             display: none !important;
          }

          /* Wrapper d'impression */
          .print-wrapper {
             visibility: visible !important;
             display: block !important;
             width: 100% !important;
             margin: 0 !important;
             padding: 0 !important;
             gap: 0 !important;
          }
          
          /* Page A4 */
          .a4-page {
             visibility: visible !important;
             margin: 0 !important;
             box-shadow: none !important;
             border: none !important;
             break-after: page; 
             page-break-after: always;
             width: 100% !important;
             min-height: 297mm !important;
             overflow: visible !important;
             print-color-adjust: exact;
             -webkit-print-color-adjust: exact;
          }
          
          .a4-page:last-child {
             break-after: auto;
             page-break-after: auto;
          }
          
          /* Force la visibilité des enfants de la page */
          .a4-page * {
             visibility: visible !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PdfPreview;