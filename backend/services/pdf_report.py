import io
import datetime as dt
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
)

LEVEL_COLOR = {
    "Low": colors.HexColor("#16a34a"),
    "Medium": colors.HexColor("#ca8a04"),
    "High": colors.HexColor("#ea580c"),
    "Critical": colors.HexColor("#dc2626"),
}


def build_report(company: dict, breakdown: dict, insight: dict, news: list[dict]) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, topMargin=50, bottomMargin=50)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleX", parent=styles["Title"], fontSize=22)
    level_style = ParagraphStyle(
        "Level", parent=styles["Heading2"],
        textColor=LEVEL_COLOR.get(breakdown["risk_level"], colors.black),
    )

    story = []
    story.append(Paragraph("Vendor Risk Assessment Report", title_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph(f"Company: {company['name']}", styles["Heading2"]))
    story.append(Paragraph(
        f"Generated: {dt.datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", styles["Normal"]
    ))
    story.append(Spacer(1, 12))
    story.append(Paragraph(f"Overall Risk Level: {breakdown['risk_level']}", level_style))
    story.append(Paragraph(f"Overall Score: {breakdown['overall']} / 100", styles["Normal"]))
    story.append(Spacer(1, 16))

    story.append(Paragraph("Risk Breakdown", styles["Heading2"]))
    table_data = [["Category", "Score (0-100, higher = riskier)"]]
    for key in ["compliance", "cyber", "news", "financial", "esg", "domain", "social"]:
        table_data.append([key.capitalize(), str(breakdown.get(key, "-"))])
    t = Table(table_data, colWidths=[250, 220])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 16))

    story.append(Paragraph("AI Insight", styles["Heading2"]))
    story.append(Paragraph(insight["summary"], styles["Normal"]))
    story.append(Spacer(1, 6))
    story.append(Paragraph(f"<b>Recommendation:</b> {insight['recommendation']}", styles["Normal"]))
    story.append(Spacer(1, 16))

    story.append(Paragraph("Recent News", styles["Heading2"]))
    if news:
        news_data = [["Date", "Title", "Sentiment"]]
        for n in news[:10]:
            news_data.append([
                n["published_at"].strftime("%Y-%m-%d") if isinstance(n["published_at"], dt.datetime) else str(n["published_at"]),
                Paragraph(n["title"], styles["Normal"]),
                n["sentiment_label"],
            ])
        nt = Table(news_data, colWidths=[70, 320, 80])
        nt.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(nt)
    else:
        story.append(Paragraph("No recent news found.", styles["Normal"]))

    doc.build(story)
    buf.seek(0)
    return buf.read()
