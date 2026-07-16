"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ListChecks, Pause, Play, RotateCcw, X } from "@/components/icons";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { StepPhotos } from "@/components/StepPhotos";
import { formatQuantity, formatSeconds, cn } from "@/lib/utils";
import { stepPhotos, type RecipeDTO } from "@/lib/types";

/**
 * Full-screen, dark, step-by-step cooking mode:
 * - ingredient checklist screen first
 * - one step per screen with Prev/Next
 * - a countdown timer on steps that have a `time`
 * - keeps the screen awake where the Wake Lock API is available
 */
export function CookingMode({ recipe }: { recipe: RecipeDTO }) {
  const router = useRouter();
  // -1 = ingredients checklist, 0..n-1 = steps
  const [index, setIndex] = useState(-1);
  const [finishing, setFinishing] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState<Record<number, boolean>>({});

  // Timer state for the current step
  const [remaining, setRemaining] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Los títulos ("Masa", "Relleno") no son pantallas: se muestran como
  // etiqueta de sección sobre el paso y la navegación los salta.
  const navSteps = useMemo(() => {
    const list: { step: RecipeDTO["steps"][number]; section: string | null }[] = [];
    let section: string | null = null;
    for (const s of recipe.steps) {
      if (s.heading) section = s.content;
      else list.push({ step: s, section });
    }
    return list;
  }, [recipe.steps]);

  const current = index >= 0 ? navSteps[index] : null;
  const step = current?.step ?? null;
  const isLastStep = index === navSteps.length - 1;

  // Keep the screen awake while cooking
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
    };
    nav.wakeLock
      ?.request("screen")
      .then((l) => (lock = l))
      .catch(() => {});
    return () => {
      lock?.release().catch(() => {});
    };
  }, []);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
  }, []);

  // Reset the timer whenever the step changes
  useEffect(() => {
    stopTimer();
    setRemaining(step?.time ?? null);
  }, [index, step?.time, stopTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  function startTimer() {
    if (remaining === null || remaining <= 0 || intervalRef.current) return;
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev === null || prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setRunning(false);
          if ("vibrate" in navigator) navigator.vibrate?.([300, 100, 300, 100, 300]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function goTo(next: number) {
    if (index >= 0) setDone((d) => ({ ...d, [index]: true }));
    setIndex(next);
  }

  // ¡Terminamos! Confetti y de vuelta a la receta
  async function finish() {
    if (finishing) return;
    setFinishing(true);
    try {
      const confetti = (await import("canvas-confetti")).default;
      // Dos ráfagas desde abajo, por encima del modo cocina (z-50)
      confetti({ particleCount: 90, spread: 70, origin: { x: 0.5, y: 0.9 }, zIndex: 100 });
      setTimeout(() => {
        confetti({ particleCount: 45, spread: 100, origin: { x: 0.2, y: 0.95 }, zIndex: 100 });
        confetti({ particleCount: 45, spread: 100, origin: { x: 0.8, y: 0.95 }, zIndex: 100 });
      }, 200);
    } catch {
      // sin confetti no se frena la fiesta
    }
    setTimeout(() => router.push(`/recipes/${recipe.id}`), 900);
  }

  const progress =
    index < 0 ? 0 : Math.round(((index + 1) / navSteps.length) * 100);

  return (
    <div className="dark fixed inset-0 z-50 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{recipe.name}</p>
          <p className="text-xs text-muted-foreground">
            {index < 0
              ? "Ingredientes"
              : `Paso ${index + 1} de ${navSteps.length}`}
          </p>
        </div>
        <Button variant="ghost" size="icon" asChild aria-label="Salir del modo cocina">
          <Link href={`/recipes/${recipe.id}`}>
            <X className="h-5 w-5" />
          </Link>
        </Button>
      </header>

      {/* Progress bar */}
      <div className="h-1 w-full bg-muted">
        <div
          className="h-1 bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Body */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-lg">
          {index < 0 ? (
            <Card className="border-border/50">
              <CardContent className="space-y-4 p-6">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <ListChecks className="h-5 w-5 text-primary" />
                  Prepara todo
                </h2>
                <ul className="space-y-4">
                  {recipe.ingredients.map((ing) => ing.heading ? (
                    <li
                      key={ing.id}
                      className="pt-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground first:pt-0"
                    >
                      {ing.item}
                    </li>
                  ) : (
                    <li key={ing.id} className="flex items-center gap-3">
                      <Checkbox
                        id={`cook-ing-${ing.id}`}
                        checked={!!checked[ing.id]}
                        onCheckedChange={(v) =>
                          setChecked((c) => ({ ...c, [ing.id]: v === true }))
                        }
                        className="h-6 w-6"
                      />
                      <label
                        htmlFor={`cook-ing-${ing.id}`}
                        className={cn(
                          "flex-1 cursor-pointer text-base leading-tight",
                          checked[ing.id] && "text-muted-foreground line-through"
                        )}
                      >
                        {ing.unit === "cn" ? (
                          <>
                            {ing.item}{" "}
                            <span className="text-muted-foreground">· c/n</span>
                          </>
                        ) : (
                          <>
                            <span className="font-medium tabular-nums">
                              {formatQuantity(ing.amount, ing.unit)}
                            </span>{" "}
                            {ing.item}
                          </>
                        )}
                      </label>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {current?.section && (
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                  {current.section}
                </p>
              )}
              <p className="text-2xl font-medium leading-relaxed sm:text-3xl">
                {step?.content}
              </p>

              {step && (
                <StepPhotos
                  photos={stepPhotos(step)}
                  alt="Foto del paso"
                  heightClass="h-48 sm:h-64"
                />
              )}

              {step?.time != null && remaining !== null && (
                <Card className="border-border/50">
                  <CardContent className="flex flex-col items-center gap-4 p-6">
                    <p
                      className={cn(
                        "font-mono text-6xl font-bold tabular-nums",
                        remaining === 0 && "animate-pulse text-primary"
                      )}
                    >
                      {formatSeconds(remaining)}
                    </p>
                    {remaining === 0 ? (
                      <p className="text-lg font-semibold text-primary">¡Se acabó el tiempo!</p>
                    ) : (
                      <div className="flex gap-3">
                        {running ? (
                          <Button variant="outline" size="lg" onClick={stopTimer}>
                            <Pause />
                            Pausa
                          </Button>
                        ) : (
                          <Button size="lg" onClick={startTimer}>
                            <Play />
                            {remaining === step.time ? "Iniciar temporizador" : "Reanudar"}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="lg"
                          onClick={() => {
                            stopTimer();
                            setRemaining(step.time);
                          }}
                          aria-label="Reiniciar temporizador"
                        >
                          <RotateCcw />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer navigation */}
      <footer className="border-t border-border/50 px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            disabled={index < 0}
            onClick={() => goTo(index - 1)}
          >
            <ChevronLeft />
            {index === 0 ? "Ingredientes" : "Atrás"}
          </Button>
          {index < 0 ? (
            <Button size="lg" className="flex-1" onClick={() => goTo(0)}>
              Empezar a cocinar
              <ChevronRight />
            </Button>
          ) : isLastStep ? (
            <Button size="lg" className="flex-1" onClick={finish} disabled={finishing}>
              Terminar 🎉
            </Button>
          ) : (
            <Button size="lg" className="flex-1" onClick={() => goTo(index + 1)}>
              Siguiente
              <ChevronRight />
            </Button>
          )}
        </div>
        {/* Step dots */}
        {navSteps.length > 1 && (
          <div className="mt-3 flex justify-center gap-1.5">
            {navSteps.map(({ step: s }, i) => (
              <button
                key={s.id}
                onClick={() => setIndex(i)}
                aria-label={`Ir al paso ${i + 1}`}
                className={cn(
                  "h-2 w-2 rounded-full transition-colors",
                  i === index ? "bg-primary" : done[i] ? "bg-primary/40" : "bg-muted"
                )}
              />
            ))}
          </div>
        )}
      </footer>
    </div>
  );
}
