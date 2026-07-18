from __future__ import annotations

import csv
import textwrap
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape


APP_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = APP_ROOT / "product-files" / "contractor-review-proof-system"


def pdf_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def wrap_paragraph(value: str, width: int = 88) -> list[str]:
    if not value:
        return [""]
    return textwrap.wrap(value, width=width, break_long_words=False, break_on_hyphens=False) or [""]


def write_pdf(filename: str, title: str, subtitle: str, sections: list[tuple[str, list[str]]]) -> None:
    lines: list[tuple[str, int]] = [(title, 18), (subtitle, 11), ("Version 1.0", 10), ("", 10)]
    for heading, paragraphs in sections:
        lines.append((heading, 14))
        for paragraph in paragraphs:
            for wrapped in wrap_paragraph(paragraph):
                lines.append((wrapped, 10))
            lines.append(("", 10))

    pages: list[list[tuple[str, int]]] = []
    current: list[tuple[str, int]] = []
    y = 742
    for line, size in lines:
        if y < 58:
            pages.append(current)
            current = []
            y = 742
        current.append((line, size))
        y -= 18 if size >= 14 else 13
    if current:
        pages.append(current)

    objects: list[bytes] = []
    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    page_refs = " ".join(f"{4 + index * 2} 0 R" for index in range(len(pages)))
    objects.append(f"<< /Type /Pages /Kids [{page_refs}] /Count {len(pages)} >>".encode())
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    for page_index, page_lines in enumerate(pages):
        content_id = 5 + page_index * 2
        objects.append(
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents {content_id} 0 R >>".encode()
        )
        commands: list[str] = []
        y = 742
        for line, size in page_lines:
            safe = pdf_escape(line)
            commands.append(f"BT /F1 {size} Tf 54 {y} Td ({safe}) Tj ET")
            y -= 18 if size >= 14 else 13
        stream = "\n".join(commands).encode()
        objects.append(b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream")

    data = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for number, obj in enumerate(objects, start=1):
        offsets.append(len(data))
        data.extend(f"{number} 0 obj\n".encode())
        data.extend(obj)
        data.extend(b"\nendobj\n")
    xref_offset = len(data)
    data.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode())
    for offset in offsets[1:]:
        data.extend(f"{offset:010d} 00000 n \n".encode())
    data.extend(f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode())
    (OUTPUT_DIR / filename).write_bytes(data)


def paragraph_xml(text: str, style: str | None = None) -> str:
    style_xml = f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>' if style else ""
    return f"<w:p>{style_xml}<w:r><w:t>{escape(text)}</w:t></w:r></w:p>"


def write_docx(filename: str, title: str, subtitle: str, sections: list[tuple[str, list[str]]]) -> None:
    body: list[str] = [
        paragraph_xml(title, "Title"),
        paragraph_xml(subtitle),
        paragraph_xml("Version 1.0"),
    ]
    for heading, paragraphs in sections:
        body.append(paragraph_xml(heading, "Heading1"))
        for paragraph in paragraphs:
            body.append(paragraph_xml(paragraph))
    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        "<w:body>"
        + "".join(body)
        + '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>'
        "</w:body></w:document>"
    )
    styles_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        '<w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style>'
        '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>'
        '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style>'
        "</w:styles>"
    )
    with zipfile.ZipFile(OUTPUT_DIR / filename, "w", compression=zipfile.ZIP_STORED) as docx:
        docx.writestr("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>')
        docx.writestr("_rels/.rels", '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
        docx.writestr("word/_rels/document.xml.rels", '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')
        docx.writestr("word/document.xml", document_xml)
        docx.writestr("word/styles.xml", styles_xml)


def write_csv(filename: str, rows: list[list[str]]) -> None:
    with (OUTPUT_DIR / filename).open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerows(rows)


CORE_GUIDE = [
    ("Product Overview", [
        "The Contractor Review and Proof System helps a home service contractor turn completed work into honest customer feedback and recent project proof. It is an operating process, not a promise of rankings, calls, or a specific number of reviews.",
        "The process is simple: complete the job, confirm customer readiness, request honest feedback, capture project proof, record the activity, publish appropriate proof, and review weekly performance.",
    ]),
    ("Why Reviews and Project Proof Work Together", [
        "Reviews help homeowners understand customer experience. Project proof helps them see completed work. Used together, they make the business feel current and active without relying on exaggerated claims.",
        "A contractor with good work but old reviews or no recent photos can look less active than a competitor. The fix is a routine that captures proof while the job is still fresh.",
    ]),
    ("Implementation Order", [
        "Start with the review process worksheet. Customize the scripts only after eligibility, timing, owner, and reminder rules are clear. Then create the direct review link, set the photo routine, publish weekly proof, and track execution.",
        "Use the 30-day checklist to avoid doing everything at once. The first month should establish the routine, not perfect every asset.",
    ]),
    ("Review-Process Principles", [
        "Ask for honest customer feedback. Do not offer rewards for positive reviews, ask only customers expected to leave five stars, or tell customers what to write.",
        "Pause the request when there is an unresolved complaint, safety concern, billing dispute, or open callback. Handle the issue first.",
    ]),
    ("Project-Proof Principles", [
        "Capture before, during, and completed-work photos when safe and appropriate. Avoid private customer information and get permission before publishing project proof.",
        "Use general service locations such as city or neighborhood only when the customer has agreed and when it does not expose sensitive information.",
    ]),
    ("Publishing Cadence", [
        "Set one weekly publishing block. Choose one recent review theme, completed job, project photo set, or proof update. Publish where the content fits the platform and the permission is clear.",
        "A steady weekly routine is better than a daily posting plan the team will not maintain.",
    ]),
    ("Tracking Guidance", [
        "Track eligibility, request date, request channel, reminder date, review received, photos collected, permission confirmed, publication dates, responsible team member, status, and notes.",
        "Do not store unnecessary sensitive customer details. Use a customer or project reference that your team understands without putting private information into a marketing tracker.",
    ]),
    ("Troubleshooting", [
        "If requests are low, check whether the handoff is missed. If reviews are low, check timing, friction, and reminder use. If publishing is low, check photo collection and permission.",
        "If a customer gives private praise, thank them and invite honest public feedback. If a customer raises a problem, route it to service recovery before asking for a review.",
    ]),
    ("Maintenance Routine", [
        "Every week, review completed jobs, eligible customers, requests made, reviews received, responses completed, photos collected, proof published, bottleneck, and next corrective action.",
        "Every month, choose the next target: increase request consistency, improve photo capture, publish more recent proof, or tighten review responses.",
    ]),
]


PDF_RESOURCES = {
    "contractor-review-proof-system-guide-v1.pdf": ("Contractor Review and Proof System", "Core Implementation Guide", CORE_GUIDE),
    "direct-review-link-checklist-v1.pdf": ("Direct Review-Link Checklist", "Contractor Review and Proof System", [
        ("Checklist", [
            "Find the current review-sharing option in the business profile interface. Interface labels may change, so look for the option that creates or shares the public review form link.",
            "Confirm the link points to the correct business profile, correct location, and correct brand name.",
            "Test the link on desktop using a browser where you are not signed into the business profile.",
            "Test the link on mobile using the device type most customers use.",
            "Save the approved link with a readable label: Google review link - main profile - tested date.",
            "Share the link with the responsible team member and store it with the approved scripts.",
            "Review the link monthly or after any profile ownership, location, or platform change.",
        ]),
        ("Troubleshooting", [
            "If the link opens the wrong business, stop using it and rebuild the link from the correct profile.",
            "If the link breaks, test from another device and update every saved script or QR-code source after fixing it.",
            "If customers report confusion, simplify the supporting text and confirm that the link is not mixed with payment or ordering actions.",
        ]),
    ]),
    "qr-code-guidance-v1.pdf": ("QR-Code Guidance Sheet", "Contractor Review and Proof System", [
        ("Appropriate Uses", [
            "Use a review QR code on leave-behind cards, invoices where payment is already complete, team reference sheets, event displays, and office signage.",
            "Pair the code with clear copy such as: Scan to share honest feedback about your service experience.",
        ]),
        ("Inappropriate Uses", [
            "Do not place a review QR code where a customer may expect payment, ordering, warranty registration, or safety instructions.",
            "Do not use a QR code to pressure customers, filter unhappy customers, or imply that only positive reviews are wanted.",
        ]),
        ("Print and Testing", [
            "Use a practical minimum print size of about 1 inch by 1 inch for normal hand-held scanning and keep a clean quiet zone around the code.",
            "Use strong contrast, test before printing, and keep a short plain-text instruction near the code.",
        ]),
        ("Privacy and Consent", [
            "Do not pair the code with customer names, addresses, or private job details. For events or leave-behinds, make the action clearly optional.",
        ]),
    ]),
    "job-site-photo-checklist-v1.pdf": ("Job-Site Photo Checklist", "Contractor Review and Proof System", [
        ("Photo Sequence", [
            "Before work: capture the condition, access area, visible problem, and one wide context shot when safe.",
            "During work: capture useful progress, parts, materials, protection, and workmanship details without disrupting the job.",
            "Completed work: capture a clean wide shot, medium shot, detail shot, and any visible improvement that does not reveal private information.",
        ]),
        ("Quality Rules", [
            "Use good light, avoid blurry photos, hold the phone steady, take both horizontal and vertical options when useful, and clean up tools or debris before the final photo.",
            "Avoid addresses, license plates, family photos, children's items, alarm panels, documents, pets, and anything the customer would reasonably consider private.",
        ]),
        ("Trade Examples", [
            "HVAC: equipment before, new unit, clean lines, thermostat, work area after cleanup.",
            "Plumbing: fixture before, repair area, new water heater, drain work, cleaned work area.",
            "Roofing: roof plane, flashing detail, completed shingles, cleanup, gutter detail.",
            "Electrical: panel area, labeled work, fixture install, outlet repair, clean finish.",
            "Landscaping: before area, grading, planting, hardscape detail, finished outdoor space.",
            "Pest control: entry point, exclusion work, treatment area, sealed gap, general exterior.",
        ]),
        ("File Naming", [
            "Use date, general location, service, and job reference. Example: 2026-07-raleigh-water-heater-job142-after.jpg.",
        ]),
    ]),
    "30-day-implementation-checklist-v1.pdf": ("30-Day Implementation Checklist", "Contractor Review and Proof System", [
        ("Week 1: Build the Process", [
            "Confirm the review link. Decide eligibility. Choose timing. Assign responsibility. Customize scripts. Set up tracking.",
        ]),
        ("Week 2: Capture Existing Opportunities", [
            "Identify recent eligible customers. Send requests. Organize current project photos. Confirm permissions. Record activity.",
        ]),
        ("Week 3: Publish Proof", [
            "Upload recent photos. Publish completed-project updates. Respond to reviews. Add proof to the website. Review tracking data.",
        ]),
        ("Week 4: Stabilize the Routine", [
            "Evaluate request rate. Evaluate review conversion. Identify missed handoffs. Adjust timing or ownership. Set the next monthly target. Schedule the weekly maintenance routine.",
        ]),
    ]),
}


DOCX_RESOURCES = {
    "review-process-worksheet-v1.docx": ("Review-Process Worksheet", "Contractor Review and Proof System", [
        ("Job Eligibility", [
            "Completed jobs that qualify: service completed, customer has accepted the work, no unresolved complaint is open, and the responsible team member can contact the customer appropriately.",
            "Jobs that pause the request: callback open, billing dispute, safety concern, unresolved service complaint, or customer asked not to be contacted.",
        ]),
        ("Request Standard Operating Procedure", [
            "When the request happens: ____________________",
            "Responsible team member: ____________________",
            "Primary channel: ____________________",
            "Reminder timing: ____________________",
            "Where the activity is recorded: ____________________",
        ]),
        ("Private Feedback and Complaints", [
            "When a customer gives private praise, thank them and invite honest public feedback without telling them what to write.",
            "When there is an unresolved complaint, route it to the owner or service manager before any review request is made.",
        ]),
    ]),
    "review-request-script-pack-v1.docx": ("Review-Request Script Pack", "Contractor Review and Proof System", [
        ("Customization Rules", [
            "Replace bracketed fields with your service, team member, and review link. Keep the tone normal and short.",
            "Every script asks for honest feedback. None should ask for a positive review, five-star review, or specific wording.",
        ]),
        ("Core Scripts", [
            "In person: Thanks for choosing us for [service]. If the work met your expectations, would you be willing to share honest feedback about your experience? It helps other homeowners understand what working with us is like.",
            "SMS: Hi [Name], this is [Team Member] from [Business]. Thanks again for choosing us for [service]. If you have a minute, would you share honest feedback here: [review link]",
            "Email: Thank you for trusting us with [service]. Honest customer feedback helps homeowners compare local contractors. If you are willing, you can leave feedback here: [review link]",
            "Invoice follow-up: Your invoice is attached. If the completed work and service experience met your expectations, we would appreciate honest feedback here: [review link]",
            "Completed-job follow-up: We are glad the [service] is complete. If everything looks good after the visit, would you share honest feedback about the experience?",
            "Reminder: Quick reminder from [Business]. If you still want to share feedback about [service], here is the link: [review link]. No pressure if now is not a good time.",
            "Repeat customer: We appreciate you choosing us again. Your honest feedback helps newer homeowners know what to expect from our team.",
            "Private praise: Thank you for saying that. If you are comfortable sharing that feedback publicly in your own words, here is the link.",
            "Tagged-photo customer: Thanks for sharing the project photo. If you are also willing to leave honest feedback about the service experience, here is the link.",
            "Too busy: No problem. I appreciate you letting me know. If it is easier later, the link will still work.",
            "Team handoff: [Customer] is eligible for a review request. Service: [service]. Request channel: [channel]. Notes: [notes].",
        ]),
        ("Trade Examples", [
            "HVAC: Thanks for choosing us for your new system install. If the installation and walkthrough met your expectations, would you share honest feedback?",
            "Plumbing: Thanks for calling us for the water-heater replacement. If everything is working well, we would appreciate honest feedback about the service.",
            "Roofing: Thanks for trusting us with the roof repair. If the cleanup and finished work met your expectations, your feedback would help other homeowners.",
        ]),
    ]),
    "customer-permission-scripts-v1.docx": ("Customer-Permission Scripts", "Contractor Review and Proof System", [
        ("Permission Language", [
            "Verbal on-site: Would it be okay if we take a few photos of the completed work for our project records? We will avoid personal details and private areas.",
            "SMS: Hi [Name], may we use a photo of the completed [service] as general project proof? We will not include your address or private details.",
            "Email: We would like permission to photograph and, if appropriate, publish a general project example from the completed work. We can avoid names, exact addresses, and private details.",
            "General city: Is it okay if we mention the general city or service area, such as [City], without using your address?",
            "Testimonial: If you provide a testimonial, we will use only the wording and attribution you approve.",
            "Declined permission: No problem. We will not publish photos or details from this job.",
        ]),
        ("Legal Review Note", [
            "Permission and release requirements may vary by location and situation. These scripts are practical starting language, not legal advice, and final release language may require legal review.",
        ]),
    ]),
    "publishing-templates-v1.docx": ("Publishing Templates", "Contractor Review and Proof System", [
        ("Google Business Profile Project Update", [
            "Fields: service, project type, general location, problem solved, visible outcome, approved photo, call to action.",
            "Recommended length: 75-125 words. Example: Completed a [service] project in [general location]. The homeowner needed [problem]. Our team [work performed]. The finished result was [visible outcome].",
            "Avoid: unsupported savings claims, ranking claims, private address details, medical claims, or safety claims that cannot be supported.",
        ]),
        ("Before-and-After Post", [
            "Fields: before condition, work completed, after condition, permission status. Recommended length: 50-100 words.",
            "Example: Before: [condition]. After: [completed work]. This [service] project in [general area] shows how regular maintenance and clean installation details can improve the finished result.",
        ]),
        ("Other Templates", [
            "Completed-job post: service, challenge, work completed, outcome, general city.",
            "Review-highlight post: short review theme, service context, thank-you, no private customer details.",
            "Website project summary: project type, general location, problem, process, visible result, proof image.",
            "Facebook post: conversational service update with approved photo.",
            "LinkedIn post: team/process-focused completed-work note.",
            "Short caption: Completed [service] in [general location]. Clear work, clean finish, and a documented result.",
            "Monthly proof roundup: list three to five completed-work themes and one review theme from the month.",
        ]),
    ]),
    "review-response-templates-v1.docx": ("Review-Response Templates", "Contractor Review and Proof System", [
        ("Response Rules", [
            "Respond promptly, sound human, personalize the response, and protect private customer details.",
            "Do not argue publicly, share private information, repeat the same template word for word, or promise outcomes you cannot support.",
        ]),
        ("Frameworks and Examples", [
            "Positive with details: Thank you, [Name]. We are glad the [service] went smoothly and appreciate you mentioning [detail].",
            "Short positive: Thank you for choosing [Business]. We appreciate your feedback.",
            "Five-star without text: Thank you for the rating and for choosing our team.",
            "Neutral: Thank you for the feedback. We appreciate the chance to review your experience and will use it to improve.",
            "Mixed: Thank you for sharing both what worked and what did not. Please contact [owner/manager] so we can review the concern directly.",
            "Negative: We are sorry to hear this. Please contact [name] at [phone/email] so we can review the situation offline.",
            "Complaint requiring offline follow-up: Thank you for bringing this to our attention. We will not discuss private job details here, but we want to review this directly with you.",
            "Inaccurate information: We do not recognize every detail described here. Please contact [name] so we can verify the job record and respond appropriately.",
            "Unrecognized customer: We cannot match this review to a completed job from the information shown. Please contact us directly so we can look into it.",
            "Updated after service recovery: Thank you for giving us the chance to follow up. We appreciate the updated feedback.",
        ]),
    ]),
}


def build_tracker_rows() -> list[list[str]]:
    headers = [
        "Customer or project reference",
        "Trade or service",
        "General service location",
        "Job completion date",
        "Review request eligibility",
        "Request date",
        "Request channel",
        "Reminder date",
        "Review received",
        "Review date",
        "Response completed",
        "Before photos collected",
        "After photos collected",
        "Permission confirmed",
        "Google profile publication date",
        "Website publication date",
        "Social publication date",
        "Responsible team member",
        "Status",
        "Notes",
    ]
    instructions = [
        ["Review and Proof Tracker", "Version 1.0"],
        [],
        ["Instructions"],
        ["Use one row per eligible completed job. Store a customer or project reference, not unnecessary private details."],
        ["Status choices: Not eligible, Ready to request, Requested, Reminder due, Review received, Proof published, Paused - service issue."],
        ["Example rows below are clearly marked and should be replaced before live use."],
        [],
        headers,
        [
            "EXAMPLE - Job 1042",
            "HVAC install",
            "Raleigh",
            "2026-07-01",
            "Eligible",
            "2026-07-02",
            "SMS",
            "2026-07-09",
            "No",
            "",
            "No",
            "Yes",
            "Yes",
            "Yes",
            "",
            "",
            "",
            "Office Manager",
            "Requested",
            "Example row - replace before use",
        ],
        [
            "EXAMPLE - Job 1043",
            "Plumbing repair",
            "Cary",
            "2026-07-03",
            "Paused - service issue",
            "",
            "",
            "",
            "No",
            "",
            "No",
            "No",
            "Yes",
            "No",
            "",
            "",
            "",
            "Owner",
            "Paused - service issue",
            "Example row - callback open",
        ],
    ]
    return instructions


def build_scorecard_rows() -> list[list[str]]:
    return [
        ["Weekly Scorecard", "Version 1.0"],
        ["Instructions", "Enter weekly counts. Calculate rates using the formulas shown in the Calculation column."],
        [],
        ["Metric", "Value", "Calculation"],
        ["Jobs completed", "", "Count completed jobs for the week."],
        ["Eligible customers", "", "Count jobs that meet the eligibility rule."],
        ["Requests made", "", "Count review requests sent or made in person."],
        ["Request rate", "", "Requests made / eligible customers. If eligible customers is 0, show 0%."],
        ["Reviews received", "", "Count reviews received this week."],
        ["Review conversion rate", "", "Reviews received / requests made. If requests made is 0, show 0%."],
        ["Review responses completed", "", "Count public responses completed."],
        ["Projects photographed", "", "Count jobs with usable project photos collected."],
        ["Projects published", "", "Count approved proof updates published."],
        ["Weekly target", "", "Write the practical target for next week."],
        ["Bottleneck", "", "Choose the biggest constraint: handoff, timing, link, photos, permission, publishing, response."],
        ["Next corrective action", "", "Write one action the responsible team member will take next week."],
    ]


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for filename, (title, subtitle, sections) in PDF_RESOURCES.items():
        write_pdf(filename, title, subtitle, sections)
    for filename, (title, subtitle, sections) in DOCX_RESOURCES.items():
        write_docx(filename, title, subtitle, sections)
    write_csv("review-proof-tracker-v1.csv", build_tracker_rows())
    write_csv("weekly-scorecard-v1.csv", build_scorecard_rows())


if __name__ == "__main__":
    main()
