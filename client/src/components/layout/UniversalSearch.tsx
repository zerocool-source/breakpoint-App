import { useState, useRef, useEffect } from "react";
import { Search, Building2, Users, FileText, Receipt, Wrench, AlertTriangle, X } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: "property" | "customer" | "technician" | "estimate" | "invoice" | "service_repair" | "emergency";
  title: string;
  subtitle?: string;
  meta?: string;
}

const typeConfig = {
  property: { icon: Building2, label: "Customers", color: "text-blue-500", route: "/customers" },
  customer: { icon: Building2, label: "Customers", color: "text-blue-500", route: "/customers" },
  technician: { icon: Users, label: "Technicians", color: "text-green-500", route: "/tech-services" },
  estimate: { icon: FileText, label: "Estimates", color: "text-purple-500", route: "/estimates" },
  invoice: { icon: Receipt, label: "Invoices", color: "text-amber-500", route: "/invoices" },
  service_repair: { icon: Wrench, label: "Service Repairs", color: "text-orange-500", route: "/service-repairs" },
  emergency: { icon: AlertTriangle, label: "Emergencies", color: "text-red-500", route: "/emergencies" },
};

export function UniversalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const debounce = setTimeout(async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setResults(data.results || []);
        setSelectedIndex(-1);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [query]);

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const flatResults = Object.entries(groupedResults).flatMap(([, items]) => items);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleResultClick(flatResults[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleResultClick = (result: SearchResult) => {
    const config = typeConfig[result.type];
    navigate(`${config.route}/${result.id}`);
    setIsOpen(false);
    setQuery("");
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md" data-testid="universal-search">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search properties, technicians, estimates..."
          className="w-full pl-10 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
          data-testid="search-input"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            data-testid="search-clear"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (query.length >= 2 || results.length > 0) && (
        <div className="absolute top-full mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[400px] overflow-y-auto" data-testid="search-results">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500 text-sm">Searching...</div>
          ) : results.length === 0 && query.length >= 2 ? (
            <div className="p-4 text-center text-gray-500 text-sm">No results found for "{query}"</div>
          ) : (
            Object.entries(groupedResults).map(([type, items]) => {
              const config = typeConfig[type as keyof typeof typeConfig];
              const Icon = config.icon;
              
              return (
                <div key={type} className="border-b border-gray-100 last:border-b-0">
                  <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-2">
                    <Icon className={cn("h-3.5 w-3.5", config.color)} />
                    {config.label}
                  </div>
                  {items.map((result, idx) => {
                    const globalIndex = flatResults.indexOf(result);
                    return (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className={cn(
                          "w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors flex items-center justify-between",
                          globalIndex === selectedIndex && "bg-blue-50"
                        )}
                        data-testid={`search-result-${type}-${idx}`}
                      >
                        <div>
                          <div className="text-sm font-medium text-gray-900">{result.title}</div>
                          {result.subtitle && (
                            <div className="text-xs text-gray-500">{result.subtitle}</div>
                          )}
                        </div>
                        {result.meta && (
                          <span className="text-xs text-gray-400 capitalize">{result.meta}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
