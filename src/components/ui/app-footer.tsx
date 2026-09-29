export function AppFooter() {
  return (
    <footer className="sgct-footer border-t border-[#e0e2e2] bg-white py-4 text-xs text-[#53575b]">
      <div className="sgct-container flex flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
        <span>SGCT · Sistema de Gestão de Caravanas ao Templo</span>
        <span>
          Desenvolvimento realizado por{" "}
          <a
            href="https://www.n8flow.com.br?utm_source=sgct&utm_medium=referral&utm_campaign=sistema-sgct"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand-700 hover:text-brand-900 hover:underline transition-colors"
          >
            N8FLOW TECNOLOGIA
          </a>
        </span>
      </div>
    </footer>
  );
}
