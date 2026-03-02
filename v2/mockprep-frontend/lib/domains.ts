import { colors } from "./colors";
import type { CategoryGroup, Difficulty, Duration } from "./types";

export const CATEGORIES: Record<string, CategoryGroup> = {
  domain: {
    label: "By Domain",
    items: {
      frontend: { label: "Frontend Engineering", icon: "◧", topics: [
        { id: "react", label: "React" }, { id: "typescript", label: "TypeScript" },
        { id: "css", label: "CSS & Layout" }, { id: "performance", label: "Performance" },
        { id: "accessibility", label: "Accessibility" }, { id: "testing", label: "Testing" },
        { id: "state", label: "State Management" }, { id: "system-design", label: "System Design" },
      ]},
      backend: { label: "Backend Engineering", icon: "⬡", topics: [
        { id: "apis", label: "API Design" }, { id: "databases", label: "Databases" },
        { id: "system-design", label: "System Design" }, { id: "microservices", label: "Microservices" },
        { id: "security", label: "Security & Auth" }, { id: "caching", label: "Caching" },
        { id: "messaging", label: "Message Queues" },
      ]},
      fullstack: { label: "Full Stack", icon: "◉", topics: [
        { id: "architecture", label: "Architecture" }, { id: "devops", label: "DevOps & CI/CD" },
        { id: "testing", label: "Testing Strategy" }, { id: "api-integration", label: "API Integration" },
        { id: "performance", label: "E2E Performance" },
      ]},
      infrastructure: { label: "Infrastructure & DevOps", icon: "△", topics: [
        { id: "cloud", label: "Cloud Platforms" }, { id: "kubernetes", label: "Kubernetes" },
        { id: "networking", label: "Networking" }, { id: "monitoring", label: "Monitoring" },
        { id: "iac", label: "Infra as Code" }, { id: "cicd", label: "CI/CD" },
      ]},
      hvac: { label: "HVAC Technician", icon: "🌡️", topics: [
        { id: "refrigeration", label: "Refrigeration Cycle" },
        { id: "electrical", label: "Electrical Systems" },
        { id: "airflow", label: "Airflow & Ductwork" },
        { id: "troubleshooting", label: "Troubleshooting & Diagnostics" },
        { id: "controls", label: "Controls & Thermostats" },
        { id: "codes", label: "Building Codes & EPA Regulations" },
        { id: "heat-pumps", label: "Heat Pumps" },
        { id: "commercial", label: "Commercial HVAC Systems" },
      ]},
    },
  },
  language: {
    label: "By Language",
    items: {
      python: { label: "Python", icon: "◆", topics: [
        { id: "core", label: "Core Python" }, { id: "async", label: "Async / Concurrency" },
        { id: "data-structures", label: "Data Structures" }, { id: "testing", label: "Testing" },
        { id: "frameworks", label: "Django / FastAPI" }, { id: "packaging", label: "Packaging" },
      ]},
      javascript: { label: "JavaScript / Node.js", icon: "⬢", topics: [
        { id: "core", label: "Core JS" }, { id: "async", label: "Event Loop & Async" },
        { id: "node", label: "Node.js" }, { id: "typescript", label: "TypeScript" },
        { id: "testing", label: "Testing" }, { id: "tooling", label: "Build Tools" },
      ]},
      java: { label: "Java", icon: "☕", topics: [
        { id: "core", label: "Core Java & JVM" }, { id: "concurrency", label: "Concurrency" },
        { id: "spring", label: "Spring Framework" }, { id: "design-patterns", label: "Design Patterns" },
        { id: "testing", label: "Testing" }, { id: "performance", label: "JVM Tuning" },
      ]},
      go: { label: "Go", icon: "⊞", topics: [
        { id: "core", label: "Core Go" }, { id: "concurrency", label: "Goroutines & Channels" },
        { id: "interfaces", label: "Interfaces" }, { id: "networking", label: "Networking" },
        { id: "testing", label: "Testing" },
      ]},
      rust: { label: "Rust", icon: "⚙", topics: [
        { id: "ownership", label: "Ownership & Borrowing" }, { id: "traits", label: "Traits & Generics" },
        { id: "concurrency", label: "Concurrency" }, { id: "error-handling", label: "Error Handling" },
        { id: "async", label: "Async Rust" }, { id: "unsafe", label: "Unsafe & FFI" },
      ]},
    },
  },
};

export const DIFFICULTIES: Difficulty[] = [
  { id: "intern", label: "Intern", desc: "CS fundamentals & basics", color: colors.lime },
  { id: "junior", label: "Junior", desc: "Practical application (0-2 yrs)", color: colors.green },
  { id: "mid", label: "Mid-Level", desc: "Trade-offs & design (2-5 yrs)", color: colors.accent },
  { id: "senior", label: "Senior", desc: "Architecture & leadership (5-8 yrs)", color: colors.amber },
  { id: "staff", label: "Staff+", desc: "Strategic impact (8+ yrs)", color: colors.orange },
];

export const DURATIONS: Duration[] = [
  { value: 15, label: "15 min", desc: "Quick round" },
  { value: 30, label: "30 min", desc: "Standard" },
  { value: 45, label: "45 min", desc: "In-depth" },
];

/** Flatten all domain items from both categories into one lookup */
export function getAllDomainItems() {
  return {
    ...CATEGORIES.domain.items,
    ...CATEGORIES.language.items,
  };
}

export function getDifficultyById(id: string) {
  return DIFFICULTIES.find((d) => d.id === id);
}
