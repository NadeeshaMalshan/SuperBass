from reportlab.platypus import SimpleDocTemplate, Preformatted, Paragraph, Spacer
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch

def convert_text_to_pdf(text_file, pdf_file):
    # Read the text file
    with open(text_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Create PDF document
    doc = SimpleDocTemplate(pdf_file, pagesize=A4,
                          rightMargin=30, leftMargin=30,
                          topMargin=30, bottomMargin=30)

    # Get styles
    styles = getSampleStyleSheet()

    # Create a style for code/monospaced text
    code_style = ParagraphStyle(
        'Code',
        parent=styles['Code'],
        fontSize=8,
        leading=10,
        fontName='Courier',
        leftIndent=0,
        rightIndent=0,
        spaceBefore=6,
        spaceAfter=6,
        textColor=colors.black
    )

    # Build story
    story = []

    # Add title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=20,
        alignment=1,  # Center
        textColor=colors.darkblue
    )
    story.append(Paragraph("SuperBass Performance Report", title_style))
    story.append(Spacer(1, 20))

    # Process content - split by double newlines for paragraphs
    sections = content.split('\n\n')

    for section in sections:
        if section.strip():
            # Check if this looks like a code block (contains backticks or lots of indentation)
            if '```' in section or (section.count('    ') > len(section.split('\n')) * 0.5):
                # Treat as code block
                story.append(Preformatted(section, code_style))
            else:
                # Treat as regular text
                story.append(Paragraph(section, styles['Normal']))
            story.append(Spacer(1, 12))

    # Build PDF
    doc.build(story)
    print(f"Text-based PDF created: {pdf_file}")

if __name__ == "__main__":
    convert_text_to_pdf("PERFORMANCE_REPORT.md", "PERFORMANCE_REPORT.pdf")