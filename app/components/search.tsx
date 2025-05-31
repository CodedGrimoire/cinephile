import React from "react";

interface SearchBarProps {
  handleInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  search: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export default function SearchBar({ handleInput, search }: SearchBarProps) {
  return (
    <div className="relative w-full max-w-2xl">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-white/40 via-blue-200/40 to-purple-200/40 rounded-full blur-sm group-hover:blur-md transition-all duration-300 group-focus-within:blur-md"></div>

        <div className="relative flex items-center bg-white/10 backdrop-blur-md border border-white/30 rounded-full px-6 py-4 group-hover:bg-white/15 group-focus-within:bg-white/15 transition-all duration-300">
          <svg
            className="w-5 h-5 text-white/70 mr-4 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>

          <input
            type="text"
            placeholder="Search movies..."
            onChange={handleInput}
            onKeyDown={search}
            className="flex-1 bg-transparent text-white placeholder-white/60 focus:outline-none focus:placeholder-white/40 transition-all duration-300 text-lg"
          />

          <button
            type="button"
            className="ml-4 p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5-5 5M6 12h12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
