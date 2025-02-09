import { ThemeProvider } from "@/providers/theme-provider";
import { ThemeToggle } from "./theme-toggle";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <ThemeProvider defaultTheme="light" storageKey="price-consensus-theme">
      <div className="min-h-screen bg-background text-foreground transition-colors">
        <ThemeToggle />
        {children}
      </div>
    </ThemeProvider>
  );
} 