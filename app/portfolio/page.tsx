import { redirect } from "next/navigation";

export default async function PortfolioRedirectPage() {
  redirect("/overview/portfolio");
}

