import Link from "next/link";
import { Header } from "@/components/header";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-md text-center space-y-4">
          <p className="text-xs uppercase tracking-[0.25em] muted-text">404</p>
          <h1 className="font-serif text-4xl font-medium tracking-tight">
            Ce skill n&apos;existe pas
          </h1>
          <p className="muted-text">
            Il a peut-être été supprimé ou renommé. Relance un scan pour
            régénérer le catalogue.
          </p>
          <Link
            href="/"
            className="inline-flex items-center rounded-full bg-terracotta-500 text-white px-5 py-2 text-sm font-medium hover:bg-terracotta-600 transition"
          >
            Retour au catalogue
          </Link>
        </div>
      </div>
    </main>
  );
}
