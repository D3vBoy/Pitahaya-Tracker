import { ImageResponse } from "next/og";

export const runtime = "edge";

const ALLOWED_SIZES = new Set([192, 512]);

function getSize(value: string) {
  const parsed = Number.parseInt(value, 10);
  if (!ALLOWED_SIZES.has(parsed)) {
    return 192;
  }
  return parsed;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ size: string }> }
) {
  const { size: rawSize } = await context.params;
  const size = getSize(rawSize);
  const { searchParams } = new URL(request.url);
  const isMaskable = searchParams.get("maskable") === "1";

  const padding = isMaskable ? Math.floor(size * 0.14) : Math.floor(size * 0.08);
  const logoSize = size - padding * 2;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 15% 20%, #2B0A4A 0%, #0A0612 58%, #05040B 100%)",
          color: "#FFFFFF",
          fontFamily: "Arial",
          position: "relative",
        }}
      >
        <div
          style={{
            width: logoSize,
            height: logoSize,
            borderRadius: logoSize * 0.24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #CF3790 0%, #F38D62 100%)",
            boxShadow: "0 0 0 10px rgba(207,55,144,0.18)",
            fontSize: Math.floor(size * 0.34),
            fontWeight: 700,
          }}
        >
          P
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
    }
  );
}
