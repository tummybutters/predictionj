"use client";

import * as React from "react";

import Link from "next/link";

import { PageHeader } from "@/components/app/page-header";
import { Section } from "@/components/app/section";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InsetPanel, Panel } from "@/components/ui/panel";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export function UiKitClient() {
  const [enabled, setEnabled] = React.useState(true);
  const [done, setDone] = React.useState(false);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <PageHeader
        title="UI Kit"
        subtitle="Signed-in components preview."
        actions={
          <Link href="/">
            <Button variant="secondary" size="sm">
              Home
            </Button>
          </Link>
        }
      />

      <Section title="Surfaces">
        <div className="grid gap-4 sm:grid-cols-2">
          <Panel className="p-5">
            <div className="text-sm font-semibold text-text/85">Panel</div>
            <div className="mt-1 text-sm text-muted">Raised surface for primary containers.</div>
          </Panel>
          <InsetPanel className="p-5">
            <div className="text-sm font-semibold text-text/85">InsetPanel</div>
            <div className="mt-1 text-sm text-muted">
              Sunken surface for controls and embedded blocks.
            </div>
          </InsetPanel>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button size="sm">Small</Button>
        </div>
      </Section>

      <Section title="Inputs">
        <div className="grid gap-4 sm:grid-cols-2">
          <InsetPanel className="p-4">
            <div className="text-xs font-medium text-muted">Text</div>
            <Input className="mt-2" placeholder="Type something…" />
          </InsetPanel>
          <InsetPanel className="p-4">
            <div className="text-xs font-medium text-muted">Textarea</div>
            <Textarea className="mt-2 min-h-[110px]" placeholder="Write a note…" />
          </InsetPanel>
        </div>
      </Section>

      <Section title="Toggles">
        <div className="flex flex-wrap items-center gap-6">
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted">Switch</div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted">Checkbox</div>
            <Checkbox
              checked={done}
              onChange={(e) => setDone(e.target.checked)}
              label="Complete this awesome task"
              description="Pop + ripple animation with tactile container."
            />
          </div>
        </div>
      </Section>
    </main>
  );
}
