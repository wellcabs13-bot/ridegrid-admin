"use client";
import Image from "next/image";
import { useState, type ComponentProps, type ReactNode } from "react";
export default function ResilientImage({ fallback = null, alt, onError, ...props }: ComponentProps<typeof Image> & { fallback?: ReactNode }) {
  const [failed,setFailed] = useState<string | null>(null);
  if (failed === String(props.src)) return <>{fallback}</>;
  return <Image {...props} alt={alt} onError={event => { setFailed(String(props.src)); onError?.(event); }} />;
}
