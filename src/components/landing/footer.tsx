import Link from "next/link";
import { Shield } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background/50 backdrop-blur-sm py-12 md:py-16">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12 mb-12">
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="bg-primary/10 p-1.5 rounded-lg">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <span className="font-bold tracking-tight text-lg">Clou Auth</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-xs mb-6">
              One secure identity for every CloudBurst service, with support for third-party applications.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-sm mb-4">Platform</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="#features" className="hover:text-foreground transition-colors">Features</Link></li>
              <li><Link href="#security" className="hover:text-foreground transition-colors">Security</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Status</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Pricing</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-4">Developers</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-foreground transition-colors">Documentation</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">OAuth 2.0</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">OpenID Connect</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">API Reference</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-4">Company</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-foreground transition-colors">CloudBurstLab</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Support</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {currentYear} CloudBurstLab. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="#" className="hover:text-foreground transition-colors">GitHub</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Twitter</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
