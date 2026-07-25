"""Generate tiny table PDFs for parser tests.

Draws a bordered grid (so pdfplumber's ruling-line strategy detects it) and
wraps long cell text across lines like real bank statements do. Keep
fixture narrations short enough to fit one line: wrapped fragments get a
space when re-joined downstream, which can corrupt long tokens.
"""

from fpdf import FPDF

_LINE_HEIGHT = 4.5


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
        wrapped = [_wrap(pdf, str(cell), col_width) for cell in row]
        height = _LINE_HEIGHT * max(len(lines) for lines in wrapped)
        x0, y0 = pdf.get_x(), pdf.get_y()
        for i, lines in enumerate(wrapped):
            pdf.set_xy(x0 + i * col_width, y0)
            pdf.multi_cell(col_width, _LINE_HEIGHT, "\n".join(lines), border=1)
        pdf.set_xy(x0, y0 + height)
    return bytes(pdf.output())


def _wrap(pdf: FPDF, text: str, width: float) -> list[str]:
    if pdf.get_string_width(text) <= width - 1:
        return [text]
    lines: list[str] = []
    current = ""
    for char in text:
        if current and pdf.get_string_width(current + char) > width - 1:
            lines.append(current)
            current = char
        else:
            current += char
    lines.append(current)
    return lines
