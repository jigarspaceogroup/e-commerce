import * as React from "react";
import { cn } from "../lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => (
  <div
    className={cn("animate-pulse rounded-lg bg-gray-200", className)}
    {...props}
  />
);
Skeleton.displayName = "Skeleton";

export { Skeleton };
