import Link from "next/link";

const links = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "3D Viewer", href: "#model-showcase" },
  ],
  Account: [
    { label: "Sign In", href: "/login" },
    { label: "Register", href: "/register" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 grid gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <Link href="/" className="mb-3 block text-xl font-bold">
              SwapSpec
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              AI-powered engine swap planning. Know what fits before you build.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <p className="mb-3 text-sm font-semibold">{group}</p>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} SwapSpec. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
