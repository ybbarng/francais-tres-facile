"use client";

import { Github, Heart, Radio } from "lucide-react";
import Link from "next/link";
import { LogoCompact } from "@/components/Logo";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const navLinks = [
    { href: "/", label: "Accueil" },
    { href: "/exercises", label: "Exercices" },
    { href: "/completed", label: "Terminés" },
    { href: "/playlist", label: "Playlist" },
  ];

  return (
    <footer className="bg-card border-t border-border mt-auto">
      {/* French tricolor accent bar */}
      <div className="french-tricolor h-1" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand & Description */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <LogoCompact size={36} />
              <div>
                <div className="font-bold text-lg">Français Très Facile</div>
                <div className="text-xs text-muted-foreground">
                  Apprenez le français avec plaisir
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Une application web pour faciliter l'apprentissage du français avec les ressources de
              RFI (Radio France Internationale). Écoutez, pratiquez et progressez à votre rythme.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-semibold mb-4">Navigation</h3>
            <ul className="space-y-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Credits & Links */}
          <div>
            <h3 className="font-semibold mb-4">Crédits</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
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
              <li className="flex items-center gap-2">
                <Github className="w-4 h-4" />
                <a
                  href="https://github.com/ybbarng"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  @ybbarng
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            {/* Copyright */}
            <div>© {currentYear} Français Très Facile. Tous droits réservés.</div>

            {/* Made with love */}
            <div className="flex items-center gap-1.5">
              <span>Fait avec</span>
              <Heart className="w-4 h-4 text-[oklch(0.55_0.22_25)] fill-[oklch(0.55_0.22_25)]" />
              <span>par</span>
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
