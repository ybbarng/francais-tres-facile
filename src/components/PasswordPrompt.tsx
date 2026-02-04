"use client";

import { KeyRound, Lock, Unlock } from "lucide-react";
import { useEffect, useState } from "react";
import { clearStoredPassword, getStoredPassword, setStoredPassword } from "@/lib/password";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export default function PasswordPrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(!!getStoredPassword());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      setStoredPassword(password.trim());
      setIsAuthenticated(true);
      setPassword("");
      setIsOpen(false);
    }
  };

  const handleLogout = () => {
    clearStoredPassword();
    setIsAuthenticated(false);
  };

  if (isAuthenticated) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="text-white/80 hover:text-white hover:bg-white/10"
        title="Se déconnecter"
      >
        <Unlock className="h-4 w-4" />
      </Button>
    );
  }

  if (isOpen) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
          className="h-8 w-32 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/50"
          autoFocus
        />
        <Button type="submit" size="sm" variant="secondary" className="h-8">
          <KeyRound className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setIsOpen(false)}
          className="h-8 text-white/80 hover:text-white hover:bg-white/10"
        >
          &times;
        </Button>
      </form>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setIsOpen(true)}
      className="text-white/80 hover:text-white hover:bg-white/10"
      title="Entrer le mot de passe"
    >
      <Lock className="h-4 w-4" />
    </Button>
  );
}
