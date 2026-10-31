import LayoutWrapper from "@/components/layout/layout-wrapper";
import { locales } from "@/lib/i18n/config";
import { resolveLocale } from "@/lib/i18n/server";

export function generateStaticParams() {
    return locales.map((lang) => ({ lang }));
}

interface LangLayoutProps {
    children: React.ReactNode;
    params: Promise<{ lang: string }>;
}

export default async function Layout({ children, params }: LangLayoutProps) {
    const locale = resolveLocale((await params).lang);

    return (
        <LayoutWrapper locale={locale}>
            {children}
        </LayoutWrapper>
    );
}