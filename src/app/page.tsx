import { AppShell } from "@/components/AppShell";
import { llmAvailable } from "@/lib/parsing/llmParser";

// Read the env at request time so adding a key on Vercel flips the mode without a rebuild.
export const dynamic = "force-dynamic";

export default function Home() {
  return <AppShell aiEnabled={llmAvailable()} />;
}
