export default function PublicFormPlaceholder() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-6">
      <div className="max-w-md w-full text-center space-y-4 bg-white p-8 rounded-xl shadow-sm border border-neutral-200">
        <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-neutral-900">
          Coming Soon (Sprint 3)
        </h1>
        <p className="text-neutral-600 text-body">
          This is where your live, public-facing form will appear for users to fill out. 
          The form viewer and submission collection will be built on Monday during Sprint 3!
        </p>
      </div>
    </div>
  );
}
