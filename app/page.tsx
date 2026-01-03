'use client';

import React, { useState, useEffect } from 'react';

// Types
interface RowData {
  id: string;
  category: string;
  prompt: string;
  stock: string;
}

export default function Dashboard() {
  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial Data
  const INITIAL_ROWS: RowData[] = [
    { id: '1', category: 'ギャグ', prompt: '面白いダジャレを考えて', stock: '' },
    { id: '2', category: '技術解説', prompt: 'Next.jsのメリットを3行で', stock: '' },
    { id: '3', category: '日常', prompt: '今日のランチの感想風テキスト', stock: '' },
  ];

  // Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('dashboard_data');
    if (saved) {
      setRows(JSON.parse(saved));
    } else {
      setRows(INITIAL_ROWS);
    }
    setLoading(false);
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('dashboard_data', JSON.stringify(rows));
    }
  }, [rows, loading]);

  // Tracking loading state for each row
  const [generatingRows, setGeneratingRows] = useState<Set<string>>(new Set());

  // Handlers
  const handleUpdate = (id: string, field: keyof RowData, value: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleGenerate = async (id: string, prompt: string) => {
    if (!prompt) {
      alert("Please enter a prompt first.");
      return;
    }

    // Set loading state for this row
    setGeneratingRows(prev => new Set(prev).add(id));

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      // Update the row with the result
      handleUpdate(id, 'stock', data.output);

    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      // Clear loading state
      setGeneratingRows(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleSetToExt = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard! \n\nNext Step:\n1. Open Threads Extension\n2. Paste into text box\n3. Click "Save Draft"');
  };

  const addNewRow = () => {
    const newId = Date.now().toString();
    setRows([...rows, { id: newId, category: '', prompt: '', stock: '' }]);
  };

  const deleteRow = (id: string) => {
    if (confirm('Delete this row?')) {
      setRows(rows.filter(r => r.id !== id));
    }
  };

  if (loading) return <div className="p-10">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-800">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Threads Shokunin Dashboard</h1>
        <button
          onClick={addNewRow}
          className="bg-black text-white px-4 py-2 rounded shadow hover:bg-gray-800"
        >
          + Add Category
        </button>
      </header>

      <div className="overflow-x-auto bg-white shadow rounded-lg border border-gray-200">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="p-4 w-1/6 font-semibold">Category</th>
              <th className="p-4 w-1/3 font-semibold">Prompt</th>
              <th className="p-4 w-1/3 font-semibold">Stock (Output)</th>
              <th className="p-4 w-1/6 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 transition">
                {/* Category */}
                <td className="p-4 align-top">
                  <input
                    type="text"
                    value={row.category}
                    onChange={(e) => handleUpdate(row.id, 'category', e.target.value)}
                    className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Category..."
                  />
                </td>

                {/* Prompt */}
                <td className="p-4 align-top">
                  <textarea
                    value={row.prompt}
                    onChange={(e) => handleUpdate(row.id, 'prompt', e.target.value)}
                    className="w-full h-24 border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="Prompt to AI..."
                  />
                </td>

                {/* Stock */}
                <td className="p-4 align-top">
                  <textarea
                    value={row.stock}
                    onChange={(e) => handleUpdate(row.id, 'stock', e.target.value)}
                    className="w-full h-24 bg-gray-50 border border-gray-200 rounded p-2 text-gray-600 resize-none"
                    placeholder="(Generated content)"
                  />
                </td>

                {/* Actions */}
                <td className="p-4 align-top space-y-2">
                  <button
                    onClick={() => handleGenerate(row.id, row.prompt)}
                    disabled={generatingRows.has(row.id)}
                    className={`w-full text-white px-3 py-2 rounded text-sm font-bold shadow-sm transition
                      ${generatingRows.has(row.id)
                        ? 'bg-blue-400 cursor-wait'
                        : 'bg-blue-600 hover:bg-blue-700'}`
                    }
                  >
                    {generatingRows.has(row.id) ? '🤖 Thinking...' : '✨ Generate'}
                  </button>
                  <button
                    onClick={() => handleSetToExt(row.stock)}
                    disabled={!row.stock}
                    className={`w-full px-3 py-2 rounded text-sm font-bold shadow-sm border ${!row.stock
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    📋 Copy for Ext
                  </button>
                  <button
                    onClick={() => deleteRow(row.id)}
                    className="w-full text-red-500 text-xs hover:underline mt-2"
                  >
                    Delete Row
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 text-sm text-gray-500 text-center">
        Data is saved to your browser's LocalStorage.
      </div>
    </div>
  );
}
