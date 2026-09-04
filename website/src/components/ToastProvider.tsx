import React from "react";
import { ToastProvider as RadixToastProvider } from "@/components/ui/toast";
import { Toaster } from "@/components/ui/toaster";

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <RadixToastProvider>
      {children}
      <Toaster />
    </RadixToastProvider>
  );
};
