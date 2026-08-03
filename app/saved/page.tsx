import type { Metadata } from "next";

import { SavedPageClient } from "../components/SavedPageClient";

export const metadata: Metadata = {
  title: "Saved — Walnur",
  description: "The pieces you have saved.",
};

export default function SavedPage() {
  return <SavedPageClient />;
}
