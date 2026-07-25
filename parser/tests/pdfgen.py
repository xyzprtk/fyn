"""Generate tiny table PDFs for parser tests.

Draws a bordered grid (so pdfplumber's ruling-line strategy detects it)
with short cell text that stays inside its column. Cell text is truncated
to keep the layout deterministic — keep fixture strings short.
"""

from fpdf import FPDF


def make_table_pdf(rows: list[list[str]], title: str = "") -> bytes:
    pdf = FPDF(format="A4")
    pdf.add_page()
    pdf.set_font("helvetica", size=6)
    if title:
        pdf.cell(0, 5, title, new_x="LMARGIN", new_y="NEXT")
    n_cols = len(rows[0])
    col_width = (pdf.w - pdf.l_margin - pdf.r_margin) / n_cols
    for row in rows:
        assert len(row) == n_cols, "ragged fixture rows"
        for cell in row:
            pdf.cell(col_width, 4.5, str(cell)[:24], border=1)
        pdf.ln()
    return bytes(pdf.output())
