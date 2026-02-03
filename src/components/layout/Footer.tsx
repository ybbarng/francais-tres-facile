"use client";

import { Code2, Github, Radio, Wrench } from "lucide-react";
import { LogoCompact } from "@/components/Logo";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-border mt-auto">
      {/* French tricolor accent bar */}
      <div className="french-tricolor h-1" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Brand & Description */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <LogoCompact size={36} />
              <div>
                <div className="font-bold text-lg">Français Très Facile</div>
                <div className="text-xs text-muted-foreground">
                  Apprendre le français facile avec RFI, mais{" "}
                  <span className="font-semibold text-primary italic">très</span> facile.
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              Le meilleur contenu de RFI, en plus pratique. Navigation mobile fluide, suivi de votre
              progression, playlists audio — tout ce qui manquait au site original.
            </p>
          </div>

          {/* Credits & Tech */}
          <div className="space-y-4 md:text-right">
            <h3 className="font-semibold">Crédits & Technologies</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2 md:justify-end">
                <Radio className="w-4 h-4 text-primary" />
                <span>
                  Contenu par{" "}
                  <a
                    href="https://francaisfacile.rfi.fr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    RFI Français Facile
                  </a>
                </span>
              </li>
              <li className="flex items-center gap-2 md:justify-end">
                <Code2 className="w-4 h-4" />
                <span>Next.js, TypeScript, Tailwind CSS, shadcn/ui</span>
              </li>
              <li className="flex items-center gap-2 md:justify-end">
                <Github className="w-4 h-4" />
                <a
                  href="https://github.com/ybbarng"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  github.com/ybbarng
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            {/* Copyright */}
            <div>© {currentYear} Français Très Facile</div>

            {/* Implemented by */}
            <div className="flex items-center gap-1.5">
              <Wrench className="w-4 h-4" />
              <span>Implémenté par</span>
              <a
                href="https://github.com/ybbarng"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:text-primary transition-colors"
              >
                ybbarng
              </a>
              <span>&</span>
              <a
                href="https://claude.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:text-primary transition-colors"
              >
                Claude
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
