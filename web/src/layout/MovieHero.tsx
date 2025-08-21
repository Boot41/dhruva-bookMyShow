import React from "react";

interface MovieHeroProps {
  posterUrl?: string;
  title?: string;
  pills?: string[];
  description?: string;
  children?: React.ReactNode;
}

export default function MovieHero({ posterUrl, title, pills = [], description, children }: MovieHeroProps) {
  return (
    <div className="flex flex-col md:flex-row items-stretch gap-5">
      {/* Poster */}
      <div className="w-full md:w-64">
        <div
          className="rounded-xl overflow-hidden aspect-[2/3] bg-gray-200 bg-center bg-cover"
          style={posterUrl ? { backgroundImage: `url(${posterUrl})` } : undefined}
        />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col">
        {title && <h1 className="text-2xl md:text-3xl font-semibold">{title}</h1>}

        {Array.isArray(pills) && pills.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {pills.map((label, i) => (
              <span
                key={i}
                className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 border border-gray-200"
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {description && (
          <p className="mt-3 text-gray-800 whitespace-pre-wrap">{description}</p>
        )}

        {children && <div className="mt-auto pt-4 flex gap-2 justify-center">{children}</div>}
      </div>
    </div>
  );
}
