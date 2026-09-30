import { redirect } from "next/navigation";

// The test lives at /personal-definition, the same route as in the team repo,
// so the subpage folder stays an unmodified copy.
export default function Home() {
  redirect("/personal-definition");
}
