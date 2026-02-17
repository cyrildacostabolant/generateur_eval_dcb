
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
  points?: number; // Pour l'affichage des points
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

  // --- CONSTANTES DE DIMENSIONS ---
  // A4 = 210mm x 297mm ≈ 794px x 1123px (à 96 DPI)
  const PAGE_HEIGHT = 1123; 
  
  // Marges de la page (padding) : 10mm ≈ 38px
  const PAGE_PADDING_MM = 10;
  const PIXELS_PER_MM = 3.78;
  const PAGE_PADDING_Y = Math.ceil(PAGE_PADDING_MM * 2 * PIXELS_PER_MM); // Haut + Bas (~76px)

  // Hauteurs réservées (Header / Footer)
  const HEADER_HEIGHT_P1 = 240; 
  const FOOTER_HEIGHT = 50; // Augmenté de 40 à 50
  
  // Buffer de sécurité :
  // On augmente significativement pour éviter les troncatures sur les imprimantes avec marges physiques.
  const SAFETY_BUFFER = 45; // Augmenté de 10 à 45

  // Hauteur disponible pour le contenu (Questions/Sections)
  const CONTENT_HEIGHT_P1 = PAGE_HEIGHT - PAGE_PADDING_Y - HEADER_HEIGHT_P1 - FOOTER_HEIGHT - SAFETY_BUFFER;
  const CONTENT_HEIGHT_PN = PAGE_HEIGHT - PAGE_PADDING_Y - FOOTER_HEIGHT - SAFETY_BUFFER;

  // Style commun pour le texte
  const contentStyle = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '13pt',
    lineHeight: '1.4'
  };

  const getContrastColor = (hexColor: string) => {
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 128 ? 'black' : 'white';
  };

  const handlePrint = () => {
    window.print();
  };

  const sections: string[] = Array.from(new Set(evaluation.questions.map(q => q.section_name || 'Autre')));

  const getSectionPoints = (sectionName: string) => {
    return evaluation.questions
      .filter(q => (q.section_name || 'Autre') === sectionName)
      .reduce((acc, curr) => acc + (curr.points || 0), 0);
  };

  useLayoutEffect(() => {
    if (!measureContainerRef.current) return;

    const computedPages: Page[] = [];
    let currentPageItems: PageItem[] = [];
    let currentHeight = 0;
    let pageIndex = 1;
    
    let maxPageHeight = CONTENT_HEIGHT_P1;

    const elements = Array.from(measureContainerRef.current.children) as HTMLElement[];
    
    const calculateQuestionMetrics = (el: HTMLElement) => {
      const qTextEl = el.querySelector('.measure-question-text') as HTMLElement;
      const qTextHeight = qTextEl ? qTextEl.offsetHeight : 0;
      
      const tAnswerEl = el.querySelector('.measure-teacher-answer') as HTMLElement;
      const tAnswerHeight = tAnswerEl ? tAnswerEl.offsetHeight : 0;
      
      const linesCount = Math.ceil(tAnswerHeight / 30); 
      const calculatedDottedHeight = Math.max(1, linesCount) * 30;

      const wrapperMargin = 24; 
      const internalGap = 12;

      let finalHeight = 0;
      if (mode === 'teacher') {
        finalHeight = el.offsetHeight + wrapperMargin; 
      } else {
        const isStudentPrompt = el.dataset.hasPrompt === 'true';
        if (isStudentPrompt) {
             finalHeight = el.offsetHeight + wrapperMargin;
        } else {
            finalHeight = qTextHeight + internalGap + calculatedDottedHeight + wrapperMargin;
        }
      }

      return { finalHeight, calculatedDottedHeight };
    };

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const type = el.dataset.type as PageItemType;
      
      let itemHeight = 0;
      let dottedH = 0;
      let itemData: any = null;
      let itemPoints = 0;

      if (type === 'section') {
        itemData = el.dataset.title;
        itemPoints = parseFloat(el.dataset.points || '0');
        itemHeight = el.offsetHeight + 24; 
      } else {
        const qId = el.dataset.id;
        itemData = evaluation.questions.find(q => q.id === qId);
        itemPoints = parseFloat(el.dataset.points || '0');
        const metrics = calculateQuestionMetrics(el);
        itemHeight = metrics.finalHeight;
        dottedH = metrics.calculatedDottedHeight;
      }

      let forceBreak = false;
      if (type === 'section') {
        const nextEl = elements[i + 1];
        if (nextEl && nextEl.dataset.type === 'question') {
          const nextMetrics = calculateQuestionMetrics(nextEl);
          if (currentHeight + itemHeight + nextMetrics.finalHeight > maxPageHeight) {
            forceBreak = true;
          }
        } else if (currentHeight + itemHeight > maxPageHeight) {
             forceBreak = true;
        }
      } else {
        if (currentHeight + itemHeight > maxPageHeight) {
           forceBreak = true;
        }
      }

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

      currentPageItems.push({
        type,
        data: itemData,
        height: itemHeight,
        dottedLinesHeight: dottedH,
        points: itemPoints
      });
      currentHeight += itemHeight;
    }

    if (currentPageItems.length > 0) {
      computedPages.push({
        pageNumber: pageIndex,
        items: currentPageItems
      });
    }

    setPages(computedPages);
    setIsMeasuring(false);
  }, [evaluation, mode]);

  const renderRealQuestion = (q: Question, dottedHeight?: number, points?: number) => {
    const numberOfLines = dottedHeight ? Math.floor(dottedHeight / 30) : 1;

    return (
    <div className="mb-6 pl-2">
      <div className="mb-3 text-blue-900 flex justify-between items-start gap-4">
        <div className="measure-question-text flex-grow font-bold" style={contentStyle}>
          {q.question_text}
        </div>
        {points !== undefined && points > 0 && (
           <div className="font-bold text-slate-400 text-sm whitespace-nowrap pt-1">
             / {points}
           </div>
        )}
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
              <div className="w-full flex flex-col">
                {Array.from({ length: Math.max(1, numberOfLines) }).map((_, i) => (
                  <div 
                    key={i} 
                    className="w-full border-b border-black" 
                    style={{ height: '30px', flexShrink: 0 }}
                  ></div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-90 z-50 overflow-y-auto flex flex-col items-center pdf-modal-root">
      
      {/* --- GHOST CONTAINER --- */}
      <div 
        ref={measureContainerRef} 
        className="absolute top-0 left-0 -z-50 opacity-0 pointer-events-none bg-white no-print"
        style={{ width: '210mm', padding: `0 ${PAGE_PADDING_MM}mm` }}
      >
        {sections.map(section => {
          const sectionPoints = getSectionPoints(section);
          return (
          <React.Fragment key={section}>
            <div className="mb-6" data-type="section" data-title={section} data-points={sectionPoints}>
               <div className="mb-4 pb-2 border-b-2 flex justify-between items-end" style={{ borderColor: '#dc2626' }}>
                  <h3 className="font-bold text-xl uppercase tracking-wider" style={{ color: '#dc2626' }}>
                    {section}
                  </h3>
                  <span className="font-bold text-sm mb-1" style={{ color: '#dc2626' }}>
                    ({sectionPoints} {sectionPoints > 1 ? 'points' : 'point'})
                  </span>
                </div>
            </div>
            {evaluation.questions
              .filter(q => (q.section_name || 'Autre') === section)
              .map(q => (
                <div key={q.id} data-type="question" data-id={q.id} data-has-prompt={!!q.student_prompt} data-points={q.points}>
                  <div className="mb-6 pl-2">
                    <div className="mb-3 text-blue-900 font-bold measure-question-text" style={contentStyle}>
                        {q.question_text}
                    </div>
                    <div className="pl-2">
                         {q.student_prompt ? (
                            <div className="editor-content" style={contentStyle} dangerouslySetInnerHTML={{ __html: q.student_prompt }} />
                         ) : (
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
        )})}
      </div>

      {/* Toolbar */}
      <div className="w-full bg-white p-4 shadow-md sticky top-0 z-10 flex justify-between items-center no-print">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-gray-600 hover:text-black flex items-center gap-2">
            <ArrowLeft size={20} /> Retour
          </button>
          <h2 className="font-bold text-lg">Aperçu {mode === 'teacher' ? 'Professeur' : 'Élève'} {isMeasuring && '(Calcul en cours...)'}</h2>
        </div>
        <button
          onClick={handlePrint}
          disabled={isMeasuring}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
        >
          <Printer size={18} /> Imprimer
        </button>
      </div>

      {/* --- REAL RENDER --- */}
      <div className="py-8 w-full flex flex-col items-center gap-8 print-wrapper">
        {!isMeasuring && pages.map((page) => (
          <div key={page.pageNumber} className="a4-page bg-white shadow-2xl relative flex flex-col overflow-hidden">
            <div className="flex-grow flex flex-col h-full" style={{ padding: `${PAGE_PADDING_MM}mm` }} >
              {page.pageNumber === 1 && (
                <div className="mb-8">
                  <div className="h-[2cm] flex border-2 border-black mb-[0.5cm] overflow-hidden">
                    <div className="w-[20%] border-r-2 border-black flex flex-col justify-center items-center p-2">
                      <span className="text-[10px] text-gray-500 uppercase">Date</span>
                      <div className="text-gray-300">..../..../....</div>
                    </div>
                    <div 
                      className="w-[80%] flex items-center justify-center text-center px-4 font-bold text-xl uppercase tracking-wider"
                      style={{ 
                        backgroundColor: categoryColor, 
                        color: getContrastColor(categoryColor),
                        printColorAdjust: 'exact', 
                        WebkitPrintColorAdjust: 'exact' 
                      }}
                    >
                      {evaluation.title}
                    </div>
                  </div>
                  <div className="h-[3cm] flex border-2 border-black">
                    <div className="w-[80%] border-r-2 border-black p-2 relative">
                      <span className="text-[10px] text-gray-500 uppercase absolute top-1 left-2">Commentaires</span>
                    </div>
                    <div className="w-[20%] p-2 relative flex flex-col justify-end items-center">
                      <span className="text-[10px] text-gray-500 uppercase absolute top-1 left-2">Note</span>
                      <div className="text-2xl font-bold text-gray-800">/ 20</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex-grow">
                {page.items.map((item, idx) => (
                  <div key={idx}>
                    {item.type === 'section' ? (
                      <div className="mb-6">
                        <div className="mb-4 pb-2 border-b-2 flex justify-between items-end" style={{ borderColor: '#dc2626' }}>
                          <h3 className="font-bold text-xl uppercase tracking-wider" style={{ color: '#dc2626' }}>
                            {item.data}
                          </h3>
                          <span className="font-bold text-sm mb-1" style={{ color: '#dc2626' }}>
                            ({item.points} {item.points !== undefined && item.points > 1 ? 'points' : 'point'})
                          </span>
                        </div>
                      </div>
                    ) : (
                      renderRealQuestion(item.data, item.dottedLinesHeight, item.points)
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-4 flex justify-between items-center text-[10px] text-gray-400 border-t border-gray-100">
                <span className="font-bold uppercase tracking-wider truncate max-w-[70%]">{evaluation.title}</span>
                <span>Page {page.pageNumber} / {pages.length}</span>
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
          
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .no-print { display: none !important; }

          .pdf-modal-root {
             position: absolute !important; 
             width: 100% !important;
             height: auto !important;
             overflow: visible !important;
             z-index: 9999;
             background: white !important;
             top: 0 !important;
             left: 0 !important;
          }
          
          .print-wrapper {
             display: block !important;
             width: 100% !important;
             padding: 0 !important;
             margin: 0 !important;
          }
          
          .a4-page {
             margin: 0 !important;
             border: none !important;
             box-shadow: none !important;
             width: 210mm !important;
             height: 297mm !important;
             min-height: 297mm !important;
             overflow: hidden !important;
             break-after: page;
             page-break-after: always;
             print-color-adjust: exact;
             -webkit-print-color-adjust: exact;
             box-sizing: border-box;
          }
          
          .a4-page * {
             visibility: visible !important;
          }
          
          .a4-page:last-child {
             break-after: auto;
             page-break-after: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default PdfPreview;
