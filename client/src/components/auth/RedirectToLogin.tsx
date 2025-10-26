import { useLocation } from "wouter";
import { useEffect } from "react";

interface RedirectToLoginProps {
  path?: string;
}

export function RedirectToLogin({ path = "/login" }: RedirectToLoginProps) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation(path);
  }, [setLocation, path]);

  return null; // Don't render anything
}