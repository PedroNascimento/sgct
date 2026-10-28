"use client";

import { useId } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ListPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  itemLabel: "estacas" | "administradores";
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function ListPagination({ page, pageSize, total, itemLabel, onPageChange, onPageSizeChange }: ListPaginationProps) {
  const selectId = useId();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const label = itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1);

  return (
    <div className="platform-pagination">
      <p className="platform-pagination-summary" aria-live="polite" aria-atomic="true">
        Mostrando <strong>{total === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> a{" "}
        <strong>{Math.min(currentPage * pageSize, total)}</strong> de <strong>{total}</strong> {itemLabel}
      </p>
      <div className="platform-pagination-controls">
        <label htmlFor={selectId} className="platform-page-size">
          <span className="sr-only">{label} por página</span>
          <span aria-hidden="true">Exibir</span>
          <select id={selectId} value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
            {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <nav aria-label={`Paginação de ${itemLabel}`} className="platform-page-navigation">
          <button type="button" aria-label="Página anterior" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <span aria-label={`Página ${currentPage} de ${totalPages}`}>{currentPage} / {totalPages}</span>
          <button type="button" aria-label="Próxima página" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </nav>
      </div>
    </div>
  );
}
