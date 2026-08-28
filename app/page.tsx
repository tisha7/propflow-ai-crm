import { redirect } from "next/navigation";

// Checkpoint 1 has no auth yet, so the root route sends visitors straight
// to the application shell. This will become an auth-aware redirect
// (dashboard if signed in, login if not) in Checkpoint 2.
export default function RootPage() {
  redirect("/dashboard");
}
