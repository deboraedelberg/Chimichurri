"use client";

import { useEffect, useState } from "react";
import { Loader2, Share2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ShareDTO } from "@/lib/types";

export function ShareDialog({ recipeId }: { recipeId: string }) {
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState<ShareDTO[]>([]);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/recipes/${recipeId}/share`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setShares)
      .catch(() => setShares([]));
  }, [open, recipeId]);

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, permission }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo compartir la receta");
      setShares((prev) => [
        data,
        ...prev.filter((s) => s.shared_with.id !== data.shared_with.id),
      ]);
      setSuccess(`Compartida con ${data.shared_with.email}`);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo compartir la receta");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(userId: string) {
    setShares((prev) => prev.filter((s) => s.shared_with.id !== userId));
    await fetch(`/api/recipes/${recipeId}/share/${userId}`, { method: "DELETE" });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 />
          Compartir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compartir esta receta</DialogTitle>
          <DialogDescription>
            Comparte con tu familia por email. Necesitan una cuenta de Chimichurri con ese
            email.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleShare} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="share-email">Email</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="share-email"
                type="email"
                required
                placeholder="abuela@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Select
                value={permission}
                onValueChange={(v) => setPermission(v as "view" | "edit")}
              >
                <SelectTrigger className="w-full sm:w-32" aria-label="Permiso">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">Puede ver</SelectItem>
                  <SelectItem value="edit">Puede editar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-primary">{success}</p>}
          <Button type="submit" disabled={busy || !email.trim()} className="w-full">
            {busy && <Loader2 className="animate-spin" />}
            Compartir receta
          </Button>
        </form>

        {shares.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">Compartida con</p>
              <ul className="space-y-2">
                {shares.map((share) => (
                  <li
                    key={share.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {share.shared_with.name ?? share.shared_with.email}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <Badge variant="secondary">
                        {share.permission === "edit" ? "editar" : "ver"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive"
                        onClick={() => handleRevoke(share.shared_with.id)}
                        aria-label={`Revocar el acceso de ${share.shared_with.email}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
