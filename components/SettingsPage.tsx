import React, { useState } from 'react';
import { isSupabaseConfigured, updateSupabaseConfig, resetSupabaseConfig } from '../services/supabaseClient';
import { Database, ShieldAlert, CheckCircle, LogOut, AlertTriangle, X } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const [url, setUrl] = useState(localStorage.getItem('supabase_url') || '');
  const [key, setKey] = useState(localStorage.getItem('supabase_key') || '');
  const [notification, setNotification] = useState<{type: 'error' | 'success', message: string} | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const handleSave = () => {
    setNotification(null);
    if (!url || !key) {
      setNotification({ type: 'error', message: 'Veuillez remplir les deux champs.' });
      return;
    }
    updateSupabaseConfig(url, key);
    setNotification({ type: 'success', message: 'Configuration sauvegardée. Rechargement...' });
  };

  const handleReset = () => {
    resetSupabaseConfig();
    setUrl('');
    setKey('');
    setShowDisconnectConfirm(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-8 mt-8 bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center gap-4 mb-8">
        <div className={`p-3 rounded-full ${isSupabaseConfigured ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
          <Database size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Connexion Base de Données</h2>
          <p className="text-gray-500">Configurez votre projet Supabase pour sauvegarder vos évaluations.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Connection Status */}
        {isSupabaseConfigured ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
             <CheckCircle className="text-green-600 mt-1" />
             <div>
               <h3 className="font-bold text-green-800">Connecté</h3>
               <p className="text-sm text-green-700">L'application est connectée à votre instance Supabase.</p>
             </div>
          </div>
        ) : (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
             <ShieldAlert className="text-orange-600 mt-1" />
             <div>
               <h3 className="font-bold text-orange-800">Mode Démo (Local)</h3>
               <p className="text-sm text-orange-700">Aucune base de donnée connectée. Les données sont temporaires et seront perdues au rechargement.</p>
             </div>
          </div>
        )}

        {/* Notifications */}
        {notification && (
          <div className={`p-3 rounded-lg border flex items-center gap-2 ${notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
             {notification.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
             <span>{notification.message}</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Supabase URL</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://xyz.supabase.co"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Supabase Anon Key</label>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="eyJh..."
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
          />
        </div>

        <div className="pt-4 flex justify-between items-center relative">
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 shadow-sm transition-colors"
          >
            {isSupabaseConfigured ? 'Mettre à jour' : 'Connecter'}
          </button>

          {isSupabaseConfigured && (
            <div className="relative">
              {!showDisconnectConfirm ? (
                <button
                  onClick={() => setShowDisconnectConfirm(true)}
                  className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg font-medium flex items-center gap-2"
                >
                  <LogOut size={18} /> Déconnecter
                </button>
              ) : (
                <div className="flex items-center gap-2 animate-fade-in bg-red-50 p-1 pr-2 rounded-lg border border-red-100">
                  <span className="text-xs text-red-600 font-medium ml-2">Sûr ?</span>
                  <button 
                    onClick={handleReset} 
                    className="bg-red-600 text-white text-xs px-3 py-1.5 rounded hover:bg-red-700"
                  >
                    Oui
                  </button>
                  <button 
                    onClick={() => setShowDisconnectConfirm(false)} 
                    className="text-gray-500 hover:bg-gray-200 p-1 rounded"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 pt-8 border-t text-sm text-gray-400">
        <p>Astuce : Créez les tables SQL fournies dans l'onglet "Dashboard" > "SQL Editor" de Supabase avant de connecter.</p>
      </div>
    </div>
  );
};

export default SettingsPage;