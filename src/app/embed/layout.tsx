import type { Metadata } from "next";
import "./embed.css";

export const metadata: Metadata = {
    title: "بحث كاظمة",
};

export default function EmbedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>>;
}</>
