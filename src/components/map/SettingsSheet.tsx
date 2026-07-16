import { Settings as SettingsIcon, Moon, Sun, Monitor } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Settings, Theme } from "@/hooks/useSettings";

interface Props {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const THEMES: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function SettingsSheet({ settings, update }: Props) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="glass-panel rounded-xl border-glass-border h-10 w-10"
          aria-label="Open settings"
        >
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[360px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="font-display">Settings</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6 px-4">
          <section className="space-y-2">
            <Label>Theme</Label>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((t) => {
                const Icon = t.icon;
                const active = settings.theme === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => update({ theme: t.value })}
                    className={`rounded-lg border p-3 text-xs flex flex-col items-center gap-1.5 transition ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted/60"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-2">
            <Label>Map style</Label>
            <Select
              value={settings.mapStyle}
              onValueChange={(v) => update({ mapStyle: v as Settings["mapStyle"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
              </SelectContent>
            </Select>
          </section>

          <section className="space-y-2">
            <Label>Units</Label>
            <Select
              value={settings.units}
              onValueChange={(v) => update({ units: v as Settings["units"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="metric">Metric (m, km/h)</SelectItem>
                <SelectItem value="imperial">Imperial (ft, kt)</SelectItem>
              </SelectContent>
            </Select>
          </section>

          <section className="space-y-2">
            <Label>Refresh interval</Label>
            <Select
              value={String(settings.refreshIntervalMs)}
              onValueChange={(v) => update({ refreshIntervalMs: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10000">10 seconds</SelectItem>
                <SelectItem value="15000">15 seconds</SelectItem>
                <SelectItem value="30000">30 seconds</SelectItem>
                <SelectItem value="60000">1 minute</SelectItem>
              </SelectContent>
            </Select>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Marker size</Label>
              <span className="text-xs text-muted-foreground tabular-nums">
                {settings.markerSize.toFixed(1)}×
              </span>
            </div>
            <Slider
              value={[settings.markerSize]}
              min={0.7}
              max={1.5}
              step={0.1}
              onValueChange={([v]) => update({ markerSize: v })}
            />
          </section>

          <section className="flex items-center justify-between">
            <Label htmlFor="animations">Animations</Label>
            <Switch
              id="animations"
              checked={settings.animations}
              onCheckedChange={(v) => update({ animations: v })}
            />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
