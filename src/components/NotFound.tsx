import { Heart, ArrowRight, BookOpen, Calculator } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <Heart size={18} className="text-[#8a6d3b] fill-[#c9a96e]" />
            <span className="font-serif text-2xl text-[#2a1f15]">Vow</span>
          </a>
          <a href="/" className="flex items-center gap-2 bg-[#8a6d3b] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#7a6030] transition-colors">
            Back to home <ArrowRight size={15} />
          </a>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="font-serif text-7xl text-[#c9a96e] mb-4">404</div>
          <h1 className="font-serif text-3xl text-[#2a1f15] mb-3">Page not found</h1>
          <p className="text-[#5d4e3e] mb-8">
            We couldn't find the page you were looking for. It may have moved or no longer exists.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/" className="inline-flex items-center justify-center gap-2 bg-[#8a6d3b] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-[#7a6030] transition-colors">
              Go to homepage <ArrowRight size={14} />
            </a>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/blog" className="inline-flex items-center justify-center gap-2 text-[#5d4e3e] text-sm border border-stone-200 px-4 py-2 rounded-lg hover:border-[#c9a96e]/40 transition-colors">
              <BookOpen size={14} /> Wedding Planning Blog
            </a>
            <a href="/tools/wedding-budget-calculator" className="inline-flex items-center justify-center gap-2 text-[#5d4e3e] text-sm border border-stone-200 px-4 py-2 rounded-lg hover:border-[#c9a96e]/40 transition-colors">
              <Calculator size={14} /> Budget Calculator
            </a>
          </div>
        </div>
      </div>

      <footer className="border-t border-stone-200 py-6 text-center text-[#8a7a6a] text-xs">
        <a href="/" className="text-[#8a6d3b] hover:underline">Vow</a> — All-in-one wedding planner, free to start
      </footer>
    </div>
  );
}
