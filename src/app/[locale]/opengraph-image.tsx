import { ImageResponse } from "next/og";
import { brand } from "@/config/brand";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = brand.name;

export default async function OgImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const tagline = locale === "fr" ? brand.tagline.fr : brand.tagline.en;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #1a2233 0%, #0f1420 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 40 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: brand.themeColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                border: "7px solid white",
              }}
            />
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, display: "flex" }}>{brand.name}</div>
        </div>
        <div style={{ fontSize: 54, fontWeight: 700, lineHeight: 1.15, maxWidth: 950, display: "flex" }}>
          {tagline}
        </div>
        <div style={{ fontSize: 26, color: "#9aa4b8", marginTop: 30, display: "flex" }}>
          {locale === "fr" ? "Anglais & Français · Multi-entreprise · Mobile" : "English & French · Multi-tenant · Mobile-first"}
        </div>
      </div>
    ),
    { ...size },
  );
}
