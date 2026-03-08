import { Search, Filter, Download, CheckSquare } from "lucide-react";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  sortBy: string;
  onSortChange: (v: string) => void;
  bulkMode: boolean;
  onBulkToggle: () => void;
  selectedCount: number;
  onBulkAction: (status: string) => void;
  onExport: () => void;
}

const statusOptions = ["all", "new", "reviewed", "shortlisted", "rejected"];
const sortOptions = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "rating-desc", label: "Highest rated" },
  { value: "rating-asc", label: "Lowest rated" },
  { value: "name-asc", label: "Name A-Z" },
];

export default function SubmissionFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortChange,
  bulkMode,
  onBulkToggle,
  selectedCount,
  onBulkAction,
  onExport,
}: Props) {
  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full rounded-lg bg-secondary/50 border border-border/50 pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="rounded-md bg-secondary/50 border border-border/50 px-2 py-1 text-xs text-foreground cursor-pointer"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="rounded-md bg-secondary/50 border border-border/50 px-2 py-1 text-xs text-foreground cursor-pointer"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onBulkToggle}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
              bulkMode
                ? "bg-primary/20 text-primary"
                : "bg-secondary/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Bulk
          </button>
          <button
            onClick={onExport}
            className="flex items-center gap-1 rounded-md bg-secondary/50 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {bulkMode && selectedCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-xs">
          <span className="text-primary font-medium">{selectedCount} selected</span>
          <span className="text-muted-foreground">→</span>
          {["reviewed", "shortlisted", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => onBulkAction(s)}
              className="rounded-md bg-secondary px-2 py-1 text-foreground hover:bg-secondary/80 transition-colors"
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
