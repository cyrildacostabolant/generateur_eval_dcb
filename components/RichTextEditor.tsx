import React, { useRef, useEffect, useState } from 'react';
import { Bold, Italic, List, Image as ImageIcon, Heading1, Check, X } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, className }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  // Sync value to innerHTML when value changes externally
  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== value) {
      contentRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (contentRef.current) {
      onChange(contentRef.current.innerHTML);
    }
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (contentRef.current) {
      contentRef.current.focus();
    }
    handleInput();
  };

  const handleImageInsert = () => {
    if (imageUrl) {
      execCmd('insertImage', imageUrl);
      setImageUrl('');
      setShowUrlInput(false);
    }
  };

  return (
    <div className={`border rounded-md overflow-hidden bg-white ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 bg-gray-50 p-2 border-b flex-wrap">
        <button
          onClick={() => execCmd('bold')}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
          type="button"
          title="Bold"
        >
          <Bold size={16} />
        </button>
        <button
          onClick={() => execCmd('italic')}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
          type="button"
          title="Italic"
        >
          <Italic size={16} />
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1"></div>
        <button
          onClick={() => execCmd('insertUnorderedList')}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
          type="button"
          title="List"
        >
          <List size={16} />
        </button>
        <button
          onClick={() => execCmd('formatBlock', '<h2>')}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
          type="button"
          title="Heading"
        >
          <Heading1 size={16} />
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1"></div>
        
        {/* Image Input Toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowUrlInput(!showUrlInput)}
            className={`p-1.5 rounded text-gray-700 ${showUrlInput ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}
            type="button"
            title="Insert Image"
          >
            <ImageIcon size={16} />
          </button>
          
          {showUrlInput && (
            <div className="flex items-center gap-1 bg-white border rounded p-0.5 ml-1 shadow-sm animate-fade-in">
              <input 
                type="text" 
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="URL de l'image"
                className="text-xs p-1 outline-none w-32 md:w-48"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleImageInsert()}
              />
              <button 
                onClick={handleImageInsert}
                className="p-1 hover:bg-green-100 text-green-600 rounded"
              >
                <Check size={14} />
              </button>
              <button 
                onClick={() => { setShowUrlInput(false); setImageUrl(''); }}
                className="p-1 hover:bg-red-100 text-red-500 rounded"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div
        ref={contentRef}
        className="p-3 min-h-[100px] outline-none editor-content text-sm"
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        data-placeholder={placeholder}
      />
    </div>
  );
};

export default RichTextEditor;