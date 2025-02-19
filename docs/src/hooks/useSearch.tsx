import FlexSearch from 'flexsearch';

import { createContext, useContext, useEffect, useState } from 'react';

import { DocPage } from '../data/docs';
import { useDocStore } from './useDocContent';

interface SearchResult extends DocPage {}

interface SearchContextType {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  results: SearchResult[];
  isSearching: boolean;
}

const SearchContext = createContext<SearchContextType>({
  searchTerm: '',
  setSearchTerm: () => {},
  results: [],
  isSearching: false,
});

export const useSearch = () => useContext(SearchContext);

interface SearchProviderProps {
  children: React.ReactNode;
}

export const SearchProvider: React.FC<SearchProviderProps> = ({ children }) => {
  const [searchIndex, setSearchIndex] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const docs = useDocStore(state => state.docs);

  // Initialize FlexSearch index
  useEffect(() => {
    const index = new FlexSearch.Document({
      document: {
        id: 'id',
        index: ['title', 'content'],
        store: true,
      },
      tokenize: 'forward',
      resolution: 9,
      cache: true,
      worker: true,
      threshold: 0,
      depth: 3,
      language: 'en',
    });

    // Add documents to the index
    docs.forEach(doc => {
      index.add({
        id: doc.id,
        title: doc.title.toLowerCase(),
        content: doc.content.toLowerCase(),
        url: doc.url,
      });
    });

    setSearchIndex(index);
  }, [docs]); // Rebuild index when docs change

  // Perform search when searchTerm changes
  useEffect(() => {
    const performSearch = async () => {
      if (!searchIndex || !searchTerm.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const searchQuery = searchTerm.toLowerCase().trim();

        // Search in both title and content fields
        const titleResults = await searchIndex.search(searchQuery, {
          index: ['title'],
          limit: 5,
          suggest: true,
          bool: 'or',
        });

        const contentResults = await searchIndex.search(searchQuery, {
          index: ['content'],
          limit: 5,
          suggest: true,
          bool: 'or',
        });

        // Combine and deduplicate results
        const allResults = [...titleResults, ...contentResults];
        const uniqueIds = new Set<string>();
        const uniqueResults: SearchResult[] = [];

        allResults.forEach(result => {
          const id = result.id;
          if (!uniqueIds.has(id)) {
            uniqueIds.add(id);
            const doc = docs.find(d => d.id === id);
            if (doc) {
              uniqueResults.push(doc);
            }
          }
        });

        setResults(uniqueResults.slice(0, 5));
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [searchTerm, searchIndex, docs]); // Include docs in dependencies

  return (
    <SearchContext.Provider value={{ searchTerm, setSearchTerm, results, isSearching }}>
      {children}
    </SearchContext.Provider>
  );
};
