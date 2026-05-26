import starlight from "@astrojs/starlight";
// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: "Salary Management — Technical Docs",
      description:
        "Architecture, data model, API, and engineering decisions for the salary management system.",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/withastro/starlight",
        },
      ],
      // Organized with the Diátaxis framework (https://diataxis.fr):
      // Tutorials, How-to guides, Reference, Explanation.
      sidebar: [
        {
          label: "Tutorials",
          items: [
            { label: "Getting Started", slug: "tutorials/getting-started" },
          ],
        },
        {
          label: "How-to Guides",
          items: [
            { label: "Seed 10,000 employees", slug: "how-to/seed" },
            { label: "Manage employees", slug: "how-to/manage-employees" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "Data Model", slug: "reference/data-model" },
            { label: "API", slug: "reference/api" },
            { label: "Salary Metrics", slug: "reference/salary-metrics" },
            {
              label: "Configuration & Scripts",
              slug: "reference/configuration",
            },
          ],
        },
        {
          label: "Explanation",
          items: [
            { label: "Problem & Goals", slug: "explanation/problem-and-goals" },
            { label: "Architecture (C4)", slug: "explanation/architecture" },
            { label: "Frontend & UX", slug: "explanation/frontend" },
            { label: "Testing Strategy", slug: "explanation/testing" },
            { label: "Decisions (ADRs)", slug: "explanation/decisions" },
          ],
        },
      ],
    }),
  ],
});
