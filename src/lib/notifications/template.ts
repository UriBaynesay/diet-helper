import type { Macros } from "./summary";
import { buildVerdict } from "./summary";
import { strings } from "@/lib/strings";

const COLORS = {
  bg: "#f6f5f2",
  card: "#ffffff",
  text: "#1f2430",
  muted: "#6b7280",
  accent: "#16a34a",
  accentSoft: "#dcfce7",
  track: "#eef0f4",
  border: "#e7e5e0",
  warn: "#b45309",
  warnSoft: "#fef3c7",
};

function clampPct(consumed: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((consumed / target) * 100)));
}

function macroBar(label: string, consumed: number, target: number, unit: string): string {
  const pct = clampPct(consumed, target);
  return `
    <tr>
      <td style="padding:10px 0 2px;" dir="rtl">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="rtl">
          <tr>
            <td style="text-align:right;font-size:13px;font-weight:600;color:${COLORS.text};" dir="rtl">${label}</td>
            <td style="text-align:left;font-size:13px;color:${COLORS.muted};" dir="rtl">
              <span dir="ltr" style="unicode-bidi:embed;">${Math.round(consumed)} / ${Math.round(target)} ${unit}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:2px 0 6px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.track};border-radius:6px;">
          <tr>
            <td align="right" style="padding:0;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="${pct}%" style="background:${COLORS.accent};border-radius:6px;">
                <tr><td style="height:8px;line-height:8px;font-size:1px;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export function renderDailySummaryEmail(params: {
  consumed: Macros;
  target: Macros;
  appUrl: string;
  isCatchUp: boolean;
  coversDate: string;
}): string {
  const { consumed, target, appUrl, isCatchUp, coversDate } = params;
  const verdict = buildVerdict(consumed, target);
  const kcalPct = clampPct(consumed.kcal, target.kcal);

  const catchUpBanner = isCatchUp
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.warnSoft};border-radius:8px;margin-bottom:16px;">
        <tr><td style="padding:10px 14px;text-align:right;font-size:13px;color:${COLORS.warn};" dir="rtl">
          ⏰ סיכום זה עבור ${coversDate} — נשלח באיחור, כנראה שהמחשב היה כבוי בשעה הרגילה.
        </td></tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html dir="rtl" lang="he" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
</head>
<body dir="rtl" style="margin:0;padding:0;background:${COLORS.bg};font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">${verdict}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};padding:24px 0;">
<tr>
<td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:${COLORS.card};border-radius:16px;overflow:hidden;border:1px solid ${COLORS.border};">

  <tr>
    <td style="padding:22px 24px 4px;text-align:right;" dir="rtl">
      <div style="font-size:15px;font-weight:700;color:${COLORS.accent};letter-spacing:0.2px;">${strings.common.appName}</div>
    </td>
  </tr>

  <tr>
    <td style="padding:8px 24px 0;">
      ${catchUpBanner}
    </td>
  </tr>

  <tr>
    <td style="padding:4px 24px 18px;text-align:right;" dir="rtl">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding-bottom:6px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="120" style="width:120px;">
              <tr>
                <td style="border-radius:50%;background:conic-gradient(${COLORS.accent} ${kcalPct}%, ${COLORS.track} 0);width:120px;height:120px;text-align:center;vertical-align:middle;">
                  <table role="presentation" width="96" cellpadding="0" cellspacing="0" style="width:96px;height:96px;background:${COLORS.card};border-radius:50%;margin:12px auto;">
                    <tr><td align="center" style="font-size:22px;font-weight:800;color:${COLORS.text};">${kcalPct}%</td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:${COLORS.text};text-align:center;">${verdict}</p>
    </td>
  </tr>

  <tr>
    <td style="padding:0 24px 6px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${COLORS.border};padding-top:4px;">
        ${macroBar("קלוריות", consumed.kcal, target.kcal, "קק׳ל")}
        ${macroBar("חלבון", consumed.proteinG, target.proteinG, "גרם")}
        ${macroBar("פחמימות", consumed.carbsG, target.carbsG, "גרם")}
        ${macroBar("שומן", consumed.fatG, target.fatG, "גרם")}
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:20px 24px 26px;text-align:center;">
      <a href="${appUrl}" style="display:inline-block;background:${COLORS.accent};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 28px;border-radius:999px;">
        פתיחת יומן תזונה
      </a>
    </td>
  </tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;
}
