from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib import colors
import markdown

def convert_md_to_pdf_simple(md_file, pdf_file):
    # Read the markdown file
    with open(md_file, 'r', encoding='utf-8') as f:
        md_content = f.read()

    # Convert markdown to HTML then to text with basic formatting
    # We'll use a simple approach: split by lines and handle basic markdown

    # Create PDF document
    doc = SimpleDocTemplate(pdf_file, pagesize=A4,
                          rightMargin=40, leftMargin=40,
                          topMargin=40, bottomMargin=40)

    # Get base style
    styles = getSampleStyleSheet()

    # Create custom styles
    styles.add(ParagraphStyle(name='CustomTitle',
                            fontSize=18,
                            spaceAfter=20,
                            textColor=colors.darkblue,
                            alignment=TA_CENTER))

    styles.add(ParagraphStyle(name='CustomHeading',
                            fontSize=14,
                            spaceAfter=12,
                            spaceBefore=12,
                            textColor=colors.darkblue,
                            leftIndent=0))

    styles.add(ParagraphStyle(name='CustomCode',
                            fontSize=9,
                            fontName='Courier',
                            backColor=colors.lightgrey,
                            spaceAfter=10,
                            spaceBefore=10,
                            leftIndent=10))

    # Build story
    story = []

    # Add title
    story.append(Paragraph("SuperBass Performance Report", styles['CustomTitle']))
    story.append(Spacer(1, 20))

    # Process content line by line
    lines = md_content.split('\n')
    in_code_block = False
    code_lines = []

    for line in lines:
        stripped = line.strip()

        # Handle code blocks
        if stripped.startswith('```'):
            if not in_code_block:
                # Starting code block
                in_code_block = True
                if code_lines:  # If there was text before, add it as paragraph
                    if code_lines:
                        story.append(Paragraph(' '.join(code_lines), styles['Normal']))
                        story.append(Spacer(1, 6))
                        code_lines = []
            else:
                # Ending code block
                in_code_block = False
                if code_lines:
                    story.append(Paragraph('<br/>'.join(code_lines), styles['CustomCode']))
                    story.append(Spacer(1, 10))
                    code_lines = []
            continue

        if in_code_block:
            code_lines.append(line)
            continue

        # Handle empty lines
        if not stripped:
            if code_lines:  # Flush any pending text
                story.append(Paragraph(' '.join(code_lines), styles['Normal']))
                story.append(Spacer(1, 6))
                code_lines = []
            story.append(Spacer(1, 6))
            continue

        # Handle headers
        if stripped.startswith('# '):
            if code_lines:
                story.append(Paragraph(' '.join(code_lines), styles['Normal']))
                story.append(Spacer(1, 6))
                code_lines = []
            story.append(Paragraph(stripped[2:], styles['CustomHeading']))
            story.append(Spacer(1, 12))
        elif stripped.startswith('## '):
            if code_lines:
                story.append(Paragraph(' '.join(code_lines), styles['Normal']))
                story.append(Spacer(1, 6))
                code_lines = []
            story.append(Paragraph(stripped[3:], styles['Heading2']))
            story.append(Spacer(1, 10))
        elif stripped.startswith('### '):
            if code_lines:
                story.append(Paragraph(' '.join(code_lines), styles['Normal']))
                story.append(Spacer(1, 6))
                code_lines = []
            story.append(Paragraph(stripped[4:], styles['Heading3']))
            story.append(Spacer(1, 8))
        # Handle bold and italic
        else:
            # Process inline markdown
            processed = stripped
            processed = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', processed)  # Bold
            processed = re.sub(r'\*(.*?)\*', r'<i>\1</i>', processed)      # Italic
            processed = re.sub(r'`(.*?)`', r'<font name="Courier">\1</font>', processed)  # Code

            code_lines.append(processed)

    # Don't forget any remaining content
    if code_lines:
        story.append(Paragraph(' '.join(code_lines), styles['Normal']))

    # Build PDF
    doc.build(story)
    print(f"Basic PDF created: {pdf_file}")

if __name__ == "__main__":
    import re
    convert_md_to_pdf_simple("PERFORMANCE_REPORT.md", "PERFORMANCE_REPORT.pdf")