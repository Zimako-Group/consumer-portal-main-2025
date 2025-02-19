import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DocPage, docs as initialDocs } from '../data/docs';

interface DocStore {
  docs: DocPage[];
  updateDoc: (id: string, updates: Partial<DocPage>) => void;
}

export const useDocStore = create<DocStore>()(
  persist(
    set => ({
      docs: initialDocs,
      updateDoc: (id, updates) =>
        set(state => ({
          docs: state.docs.map(doc =>
            doc.id === id
              ? {
                  ...doc,
                  ...updates,
                  lastUpdated: new Date().toISOString().split('T')[0],
                }
              : doc
          ),
        })),
    }),
    {
      name: 'doc-storage',
    }
  )
);
