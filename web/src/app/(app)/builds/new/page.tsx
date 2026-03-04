"use client";

import { BuildCreateWizard } from "@/components/builds/build-create-wizard";

export default function NewBuildPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">New Build</h1>
      <BuildCreateWizard />
    </div>
  );
}
