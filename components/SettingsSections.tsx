"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";

import {
  AlertTriangle,
  Loader2,
  LogOut,
  Moon,
  Settings,
  Sun,
  Trash2,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { cn } from "@/lib/utils";

export const DEFAULT_SERVINGS_KEY = "chimichurri:defaultServings";
export const UNIT_SYSTEM_KEY = "chimichurri:unitSystem";

export type UnitSystem = "metric" | "imperial";

/** Unidad inicial para ingredientes nuevos según el sistema elegido. */
export function defaultUnitFor(system: string | null): string {
  return system === "imperial" ? "oz" : "g";
}

const THEME_OPTIONS = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Settings },
] as const;

interface SettingsSectionsProps {
  name: string;
  email: string;
  provider: string | null;
}

export function SettingsSections({ name: initialName, email, provider }: SettingsSectionsProps) {
  const router = useRouter();
  const { update } = useSession();
  const { theme, setTheme } = useTheme();

  // Evita mismatch de hidratación: el tema real solo se conoce en el cliente
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Perfil
  const [name, setName] = useState(initialName);
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Preferencias de cocina
  const [defaultServings, setDefaultServings] = useState("4");
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");
  useEffect(() => {
    const storedServings = localStorage.getItem(DEFAULT_SERVINGS_KEY);
    if (storedServings) setDefaultServings(storedServings);
    const storedUnits = localStorage.getItem(UNIT_SYSTEM_KEY);
    if (storedUnits === "metric" || storedUnits === "imperial") {
      setUnitSystem(storedUnits);
    }
  }, []);

  // Eliminar cuenta
  const [deleting, setDeleting] = useState(false);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setNameMessage(null);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");
      await update(); // refresca el JWT con el nombre nuevo
      router.refresh();
      setNameMessage({ ok: true, text: "Nombre actualizado" });
    } catch (err) {
      setNameMessage({
        ok: false,
        text: err instanceof Error ? err.message : "No se pudo guardar",
      });
    } finally {
      setSavingName(false);
    }
  }

  function saveDefaultServings(value: string) {
    setDefaultServings(value);
    localStorage.setItem(DEFAULT_SERVINGS_KEY, value);
  }

  function saveUnitSystem(value: UnitSystem) {
    setUnitSystem(value);
    localStorage.setItem(UNIT_SYSTEM_KEY, value);
  }

  async function deleteAccount() {
    setDeleting(true);
    const res = await fetch("/api/user", { method: "DELETE" });
    if (res.ok) {
      await signOut({ callbackUrl: "/auth/signin" });
    } else {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Apariencia */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Apariencia</CardTitle>
          <CardDescription>
            Elige el tema de la app. “Sistema” sigue el modo de tu dispositivo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                type="button"
                variant={mounted && theme === value ? "default" : "outline"}
                className={cn(
                  "h-auto flex-col gap-2 py-4",
                  mounted && theme === value && "ring-2 ring-ring ring-offset-2 ring-offset-background"
                )}
                onClick={() => setTheme(value)}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Perfil</CardTitle>
          <CardDescription>
            {email} · acceso con {provider === "google" ? "Google" : "email y contraseña"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveName} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="settings-name">Nombre</Label>
              <div className="flex gap-2">
                <Input
                  id="settings-name"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={savingName || !name.trim()}>
                  {savingName && <Loader2 className="animate-spin" />}
                  Guardar
                </Button>
              </div>
            </div>
            {nameMessage && (
              <p className={cn("text-sm", nameMessage.ok ? "text-primary" : "text-destructive")}>
                {nameMessage.text}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Preferencias de cocina */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preferencias de cocina</CardTitle>
          <CardDescription>Se guardan en este navegador.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Porciones por defecto</p>
              <p className="text-sm text-muted-foreground">
                Con cuántas porciones arranca una receta nueva.
              </p>
            </div>
            <Select value={defaultServings} onValueChange={saveDefaultServings}>
              <SelectTrigger className="w-24" aria-label="Porciones por defecto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Unidades por defecto</p>
              <p className="text-sm text-muted-foreground">
                Sistema con el que arrancan los ingredientes nuevos.
              </p>
            </div>
            <Select
              value={unitSystem}
              onValueChange={(v) => saveUnitSystem(v as UnitSystem)}
            >
              <SelectTrigger className="w-44" aria-label="Unidades por defecto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="metric">Métricas (g, ml)</SelectItem>
                <SelectItem value="imperial">Imperiales (oz, tazas)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cuenta */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-lg">Cuenta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          >
            <LogOut />
            Cerrar sesión
          </Button>

          <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-medium">Eliminar cuenta</p>
                <p className="text-sm text-muted-foreground">
                  Borra tu cuenta, tus recetas y los accesos compartidos. Permanente.
                </p>
              </div>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" className="shrink-0">
                  <Trash2 />
                  Eliminar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>¿Eliminar tu cuenta?</DialogTitle>
                  <DialogDescription>
                    Se borrarán tu cuenta, todas tus recetas y los accesos que compartiste.
                    Esta acción no se puede deshacer.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="destructive" onClick={deleteAccount} disabled={deleting}>
                    {deleting && <Loader2 className="animate-spin" />}
                    Sí, eliminar todo
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
