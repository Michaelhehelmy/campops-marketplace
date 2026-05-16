'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Save } from 'lucide-react';

export default function ListingConfigPage() {
  const [sections, setSections] = useState([
    { id: 'hero', name: 'Hero Section' },
    { id: 'features', name: 'Features' },
    { id: 'gallery', name: 'Gallery' },
    { id: 'reviews', name: 'Reviews' },
  ]);
  const [saved, setSaved] = useState(false);

  const moveDown = (index: number) => {
    if (index === sections.length - 1) return;
    const newSections = [...sections];
    [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    setSections(newSections);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Listing Configuration
          </h1>
          <p className="text-gray-500">Customize layout and section order for this property.</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
        >
          <Save className="h-5 w-5" /> Save Order
        </button>
      </div>

      {saved && (
        <div className="p-4 bg-green-50 text-green-600 rounded-2xl font-bold text-sm">
          Configuration saved successfully!
        </div>
      )}

      <div className="space-y-4">
        {sections.map((section, index) => (
          <div
            key={section.id}
            className="section-item flex items-center justify-between p-6 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
          >
            <div className="font-bold text-gray-900">{section.name}</div>
            <div className="flex gap-2">
              <button
                onClick={() => {}}
                className="p-2 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-gray-900"
                aria-label="Move Up"
              >
                <ChevronUp className="h-5 w-5" />
              </button>
              <button
                onClick={() => moveDown(index)}
                className="p-2 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-gray-900"
                aria-label="Move Down"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
