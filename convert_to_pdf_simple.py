import markdown
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Preformatted
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
import re

def convert_md_to_pdf(md_file, pdf_file):
    # Read the markdown file
    with open(md_file, 'r', encoding='utf-8') as f:
        md_content = f.read()

    # Create the PDF document
    doc = SimpleDocTemplate(pdf_file, pagesize=A4,
                          rightMargin=72, leftMargin=72,
                          topMargin=72, bottomMargin=18)

    # Get styles
    styles = getSampleStyleSheet()

    # Create custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30,
        textColor=colors.darkblue
    )

    heading2_style = ParagraphStyle(
        'CustomHeading2',
        parent=styles['Heading2'],
        fontSize=18,
        spaceAfter=12,
        textColor=colors.darkblue
    )

    heading3_style = ParagraphStyle(
        'CustomHeading3',
        parent=styles['Heading3'],
        fontSize=16,
        spaceAfter=10,
        textColor=colors.darkblue
    )

    # Build the story (content)
    story = []

    # Split content by lines and process
    lines = md_content.split('\n')
    i = 0

    while i < len(lines):
        line = lines[i].strip()

        # Skip empty lines but add space
        if not line:
            story.append(Spacer(1, 6))
            i += 1
            continue

        # Handle headers
        if line.startswith('# '):
            story.append(Paragraph(line[2:], title_style))
            story.append(Spacer(1, 12))
        elif line.startswith('## '):
            story.append(Paragraph(line[3:], heading2_style))
            story.append(Spacer(1, 10))
        elif line.startswith('### '):
            story.append(Paragraph(line[4:], heading3_style))
            story.append(Spacer(1, 8))
        elif line.startswith('#### '):
            story.append(Paragraph(line[5:], styles['Heading4']))
            story.append(Spacer(1, 6))
        # Handle code blocks
        elif line.startswith('```'):
            # Find the end of the code block
            i += 1
            code_lines = []
            while i < len(lines) and not lines[i].strip().startswith('```'):
                code_lines.append(lines[i])
                i += 1
            # Skip the closing ```
            i += 1

            code_text = '\n'.join(code_lines)
            story.append(Preformatted(code_text, styles['Code']))
            story.append(Spacer(1, 6))
        # Handle blockquotes
        elif line.startswith('> '):
            quote_text = line[2:]
            story.append(Paragraph(f'<i>{quote_text}</i>', styles['Italic']))
            story.append(Spacer(1, 6))
        # Handle horizontal rules
        elif line in ['---', '***', '___']:
            story.append(Spacer(1, 12))
        # Handle lists
        elif re.match(r'^\s*[-*+]\s+', line):
            # Simple bullet point handling
            story.append(Paragraph(f'• {line.lstrip("-*)+ ").strip()}', styles['Normal']))
            story.append(Spacer(1, 3))
        elif re.match(r'^\s*\d+\.\s+', line):
            # Simple numbered list handling
            story.append(Paragraph(f'{line.split(".", 1)[0]}. {line.split(".", 1)[1].strip()}', styles['Normal']))
            story.append(Spacer(1, 3))
        # Handle regular paragraphs
        else:
            # Collect consecutive non-empty lines as a paragraph
            para_lines = []
            while i < len(lines) and lines[i].strip() and not lines[i].strip().startswith('#') and not lines[i].strip().startswith('```') and not lines[i].strip().startswith('>') and lines[i].strip() not in ['---', '***', '___'] and not re.match(r'^\s*[-*+]\s+', lines[i]) and not re.match(r'^\s*\d+\.\s+', lines[i]):
                para_lines.append(lines[i])
                i += 1

            if para_lines:
                para_text = ' '.join(para_lines)
                # Handle basic markdown formatting
                para_text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', para_text)  # Bold
                para_text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', para_text)      # Italic
                para_text = re.sub(r'`(.*?)`', r'<font name="Courier">\1</font>', para_text)  # Inline code
                story.append(Paragraph(para_text, styles['Normal']))
                story.append(Spacer(1, 6))
            # If we didn't process any lines, move forward
            if not para_lines and i < len(lines):
                i += 1

    # Build the PDF
    doc.build(story)
    print(f"PDF successfully created: {pdf_file}")

if __name__ == "__main__":
    md_file = "PERFORMANCE_REPORT.md"
    pdf_file = "PERFORMANCE_REPORT.pdf"

    try:
        convert_md_to_pdf(md_file, pdf_file)
    except Exception as e:
        print(f"Error creating PDF: {e}")
        # Fallback: try a simpler approach
        try:
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.lib.pagesizes import A4

            doc = SimpleDocTemplate(pdf_file, pagesize=A4)
            styles = getSampleStyleSheet()
            story = []

            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()

            # Split by double newlines for paragraphs
            paragraphs = content.split('\n\n')
            for para in paragraphs:
                if para.strip():
                    story.append(Paragraph(para.strip(), styles['Normal']))
                    story.append(Spacer(1, 12))

            doc.build(story)
            print(f"PDF created with fallback method: {pdf_file}")
        except Exception as e2:
            print(f"Fallback also failed: {e2}")