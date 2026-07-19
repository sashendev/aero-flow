import { Monitor, Moon, Settings as SettingsIcon, Sun } from "lucide-react";
import type { Settings, Theme } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

interface Props {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const THEMES: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] =
  [
    { value: "dark", label: "Dark", icon: Moon },
    { value: "light", label: "Light", icon: Sun },
    { value: "system", label: "System", icon: Monitor },
  ];

export function SettingsSheet({ settings, update }: Props) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="radar-button h-11 w-11"
          aria-label="Open settings"
        >
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[360px] border-white/10 bg-background/92 backdrop-blur-xl sm:w-[400px]"
      >
        <SheetHeader>
          <SheetTitle className="tracking-normal">Radar settings</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6 px-4">
          <section className="space-y-2">
            <Label>Theme</Label>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((theme) => {
                const Icon = theme.icon;
                const active = settings.theme === theme.value;
                return (
                  <button
                    key={theme.value}
                    onClick={() =>
                      update({
                        theme: theme.value,
                        mapStyle:
                          theme.value === "light"
                            ? "light"
                            : theme.value === "dark"
                              ? "dark"
                              : settings.mapStyle,
                      })
                    }
                    className={`rounded-md border p-3 text-xs transition ${
                      active
                        ? "border-yellow-300/50 bg-yellow-300/12 text-yellow-200"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <Icon className="mx-auto mb-1.5 h-4 w-4" />
                    {theme.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-2">
            <Label>Map style</Label>
            <Select
              value={settings.mapStyle}
              onValueChange={(value) => update({ mapStyle: value as Settings["mapStyle"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark radar</SelectItem>
                <SelectItem value="light">Light radar</SelectItem>
              </SelectContent>
            </Select>
          </section>

          <section className="space-y-2">
            <Label>Units</Label>
            <Select
              value={settings.units}
              onValueChange={(value) => update({ units: value as Settings["units"] })}
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
              onValueChange={(value) => update({ refreshIntervalMs: Number(value) })}
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
              <Label>Aircraft size</Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {settings.markerSize.toFixed(1)}x
              </span>
            </div>
            <Slider
              value={[settings.markerSize]}
              min={0.7}
              max={1.5}
              step={0.1}
              onValueChange={([markerSize]) => update({ markerSize })}
            />
          </section>

          <section className="flex items-center justify-between">
            <Label htmlFor="animations">Smooth aircraft motion</Label>
            <Switch
              id="animations"
              checked={settings.animations}
              onCheckedChange={(animations) => update({ animations })}
            />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
