import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Index() {
  const [_, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to dashboard
    setLocation("/dashboard");
  }, [setLocation]);

  return null;
}
