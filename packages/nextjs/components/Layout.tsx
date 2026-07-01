import { ReactNode } from "react";
import { Header } from "~~/components/Header";

export interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="yenshia-app-bg flex min-h-screen flex-col">
      <Header />
      <main className="relative flex flex-1 flex-col text-[var(--navy)]">
        <div className="layout-container py-3 md:py-4">{children}</div>
      </main>
    </div>
  );
};
