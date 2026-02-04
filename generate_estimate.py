#!/usr/bin/env python3
from reportlab.lib.pagesizes import letter
from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfgen import canvas
import os

DARK_BLUE = HexColor('#2c4a6e')
MEDIUM_BLUE = HexColor('#3b6a96')
LIGHT_CYAN = HexColor('#7dd8f0')
ORANGE = HexColor('#f47920')

estimate_data = {
    "estimate_number": "8571",
    "date": "12/09/2025",
    "bill_to": {"name": "CHARDONNAY HILLS HOA-REC 2", "company": "Chardonnay Hills HOA", "address": "PO BOX 4579 DEPT. 104", "city_state_zip": "Houston, TX 77210-4579 US"},
    "ship_to": {"name": "CHARDONNAY HILLS HOA-REC 2", "address": "41067 Promenade Chardonnay Hills", "city_state_zip": "Temecula, CA 92591 US"},
    "subtotal": "1,561.11",
    "tax": "0.00",
    "total": "$1,561.11"
}

def generate_estimate(output_path, logo_path="breakpoint_logo.png"):
    c = canvas.Canvas(output_path, pagesize=letter)
    width, height = letter
    
    # Company info
    c.setFont('Helvetica-Bold', 9)
    c.drawString(50, height-50, 'Breakpoint Commercial Pool')
    c.drawString(50, height-60, 'Systems, Inc.')
    c.setFont('Helvetica', 8)
    c.drawString(50, height-72, '6236 River Crest Drive, Suite C')
    c.drawString(50, height-84, 'Riverside, CA 92507')
    c.drawString(50, height-96, '9516533333')
    c.drawString(50, height-108, 'info@breakpointpools.com')
    c.drawString(50, height-120, 'www.BreakpointPools.com')
    
    # Logo
    if os.path.exists(logo_path):
        c.drawImage(logo_path, 350, height-130, width=200, height=80, preserveAspectRatio=True, mask='auto')
    
    # Estimate/Date boxes
    c.setFillColor(MEDIUM_BLUE)
    c.rect(480, height-160, 90, 20, fill=1)
    c.setFillColor(white)
    c.setFont('Helvetica-Bold', 10)
    c.drawString(483, height-154, f"ESTIMATE {estimate_data['estimate_number']}")
    
    c.setFillColor(MEDIUM_BLUE)
    c.rect(480, height-185, 90, 20, fill=1)
    c.setFillColor(white)
    c.setFont('Helvetica-Bold', 9)
    c.drawString(483, height-179, f"DATE {estimate_data['date']}")
    
    # Addresses
    c.setFillColor(black)
    c.setFont('Helvetica-Bold', 9)
    c.drawString(50, height-175, 'ADDRESS')
    c.drawString(220, height-175, 'SHIP TO')
    c.setFont('Helvetica', 8)
    c.drawString(50, height-190, estimate_data['bill_to']['name'])
    c.drawString(50, height-215, estimate_data['bill_to']['company'])
    c.drawString(50, height-227, estimate_data['bill_to']['address'])
    c.drawString(50, height-239, estimate_data['bill_to']['city_state_zip'])
    c.drawString(220, height-190, estimate_data['ship_to']['name'])
    c.drawString(220, height-215, estimate_data['ship_to']['address'])
    c.drawString(220, height-227, estimate_data['ship_to']['city_state_zip'])
    
    # Table header
    c.setFillColor(MEDIUM_BLUE)
    c.rect(50, height-280, 510, 18, fill=1)
    c.setFillColor(white)
    c.setFont('Helvetica-Bold', 9)
    c.drawString(55, height-275, 'DESCRIPTION')
    c.drawString(420, height-275, 'QTY')
    c.drawString(465, height-275, 'RATE')
    c.drawString(515, height-275, 'AMOUNT')
    
    # Sample line item
    y = height - 300
    c.setFillColor(black)
    c.setFont('Helvetica', 7)
    c.drawString(55, y, 'Motor 2 hp 1 ph VS Century')
    c.drawString(428, y, '1')
    c.drawString(463, y, '873.59')
    c.drawString(515, y, '873.59T')
    
    # Footer
    c.setFont('Helvetica', 8)
    c.drawCentredString(width/2, 50, 'Phone: (951) 653-3333 | Questions regarding estimates: Info@BreakpointPools.com')
    c.drawCentredString(width/2, 38, 'www.BreakpointPools.com')
    
    c.save()
    print(f"PDF created: {output_path}")

if __name__ == "__main__":
    generate_estimate("Estimate_8571.pdf")
