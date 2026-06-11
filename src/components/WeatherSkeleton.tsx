import React from 'react';
import { cn } from '../lib/utils';

interface SkeletonProps {
  className?: string;
  key?: React.Key;
}

const Skeleton = ({ className }: SkeletonProps) => (
  <div className={cn("animate-pulse bg-white/[0.04] rounded-lg", className)} />
);

export default function WeatherSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-[390px] mx-auto px-1 py-4">
      {/* Search Bar Skeleton */}
      <div className="h-14 rounded-[28px] w-full bg-app-surface border border-app-border backdrop-blur-3xl flex items-center px-5 gap-3">
        <Skeleton className="w-4.5 h-4.5 rounded-full bg-white/[0.06]" />
        <Skeleton className="w-32 h-4 rounded-md bg-white/[0.06]" />
      </div>

      {/* Hero Section Skeleton */}
      <div className="flex flex-col items-center pt-8 pb-4">
        <Skeleton className="w-32 h-4 mb-4 rounded-full bg-white/[0.06]" />
        <Skeleton className="w-36 h-18 mb-2 rounded-2xl bg-white/[0.06]" />
        <Skeleton className="w-48 h-5 mb-8 rounded-full bg-white/[0.06]" />
        
        <div className="flex gap-3 w-full justify-center">
          <div className="px-[14px] py-2 bg-app-surface border border-app-border rounded-full flex items-center gap-2">
            <Skeleton className="w-3.5 h-3.5 rounded-full bg-white/[0.06]" />
            <Skeleton className="w-12 h-3.5 rounded" />
          </div>
          <div className="px-[14px] py-2 bg-app-surface border border-app-border rounded-full flex items-center gap-2">
            <Skeleton className="w-3.5 h-3.5 rounded-full bg-white/[0.06]" />
            <Skeleton className="w-12 h-3.5 rounded" />
          </div>
        </div>
      </div>

      {/* Hourly Forecast Section */}
      <div className="flex flex-col gap-4">
        <Skeleton className="w-28 h-3.5 ml-2 rounded bg-white/[0.06]" />
        <div className="flex gap-3 overflow-hidden pb-4 -mx-6 px-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div 
              key={i} 
              className="min-w-[70px] h-[130px] rounded-[24px] bg-app-surface backdrop-blur-3xl border border-app-border p-3 flex flex-col items-center justify-between shadow-md"
            >
              <Skeleton className="w-10 h-3 rounded" />
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="w-12 h-4 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* 7-Day Forecast Section */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between px-2">
          <Skeleton className="w-28 h-3.5 rounded bg-white/[0.06]" />
          <Skeleton className="w-4 h-4 rounded bg-white/[0.06]" />
        </div>
        <div className="bg-app-surface backdrop-blur-3xl rounded-[32px] p-2 border border-app-border shadow-lg">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 border-b border-app-border/40 last:border-none">
              <Skeleton className="w-16 h-3.5 rounded" />
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="w-24 h-3.5 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* AQI Section */}
      <div className="bg-app-surface border border-app-border backdrop-blur-3xl rounded-[32px] p-6 h-[280px] flex flex-col justify-between shadow-lg">
        <div className="flex justify-between">
          <Skeleton className="w-36 h-5 rounded bg-white/[0.06]" />
          <Skeleton className="w-12 h-5 rounded-full bg-white/[0.06]" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="w-20 h-12 rounded-xl" />
          <Skeleton className="w-48 h-4 rounded" />
          <Skeleton className="w-full h-2 rounded-full my-1" />
        </div>
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="flex-1 h-12 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Details Grid Section */}
      <div className="grid grid-cols-2 gap-5 w-full">
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i} 
            className="px-[14px] py-5 flex flex-col justify-between bg-app-surface backdrop-blur-[32px] border border-app-border rounded-[28px] h-[132px] shadow-lg"
          >
            <div className="flex items-center gap-1.5">
              <Skeleton className="w-4 h-4 rounded-full bg-white/[0.06]" />
              <Skeleton className="w-16 h-3.5 rounded" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Skeleton className="w-20 h-7 rounded-lg" />
              <Skeleton className="w-12 h-3.5 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
