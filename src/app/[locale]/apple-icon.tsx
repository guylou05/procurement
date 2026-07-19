import { ImageResponse } from "next/og";
import { brand } from "@/config/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: brand.themeColor,
        }}
      >
        <div
          style={{
            width: 90,
            height: 90,
            borderRadius: "50%",
            border: "20px solid white",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
