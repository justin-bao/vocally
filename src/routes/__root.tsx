import { Outlet, Link, createRootRoute, HeadContent, Scripts, useRouterState } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth";
import { LoadingScreen } from "@/components/loading-screen";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page wandered off-key.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground btn-pop"
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Vocally — Learn to sing, one lesson at a time" },
      { name: "description", content: "Duolingo-style singing lessons with real-time pitch feedback and AI vocal coaching." },
      { name: "theme-color", content: "#FFB627" },
      { property: "og:title", content: "Vocally — Learn to sing" },
      { property: "og:description", content: "Bite-sized singing lessons with live pitch feedback and AI coaching." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700;9..144,900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { pathname, isNavigating } = useRouterState({
    select: (s) => ({
      pathname: s.location.pathname,
      isNavigating: s.isLoading && !!s.resolvedLocation && s.location.href !== s.resolvedLocation.href,
    }),
  });

  return (
    <AuthProvider>
      <div key={pathname} className="page-enter">
        {isNavigating ? <LoadingScreen label="Loading next lesson…" /> : <Outlet />}
      </div>
      <Toaster richColors position="top-center" />
    </AuthProvider>
  );
}
