import { ImageResponse } from "next/og";
import { brand } from "@/config/brand";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 6,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            border: "4px solid white",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
