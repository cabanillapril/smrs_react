#!/usr/bin/env python3
"""Import appraisal PDF data into the SMRS backend.

The script renders pages from an image-based PDF, runs OCR, extracts student info and
subjects with midterm/final grades, and optionally posts them to the backend.

Usage:
  python scripts/import_appraisal.py --input appraisal.pdf --base http://127.0.0.1:8000 --dry-run --scan
  python scripts/import_appraisal.py --input appraisal.pdf --base http://127.0.0.1:8000 --commit

Requirements:
  pip install -r scripts/requirements.txt
  Install the Tesseract OCR engine in the operating system.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from dataclasses import dataclass
from typing import List, Optional

import requests
from PIL import Image

try:
    import pytesseract
except ImportError:  # pragma: no cover
    pytesseract = None

try:
    import pypdfium2 as pdfium
except ImportError:  # pragma: no cover
    pdfium = None

class DocumentType:
    APPRAISAL = "appraisal"
    GRADE_REPORT = "grade_report"

@dataclass
class GradeReportRow:
    student_number: str
    student_name: str
    course: str
    midterm_grade: Optional[float]
    final_percentage: str
    final_grade: Optional[float]
    remark: str
    enrollment_status: str
    date_posted: str

@dataclass
class GradeReportData:
    institution: str
    campus: str
    document_type: str
    instructor: str
    subject_code: str
    subject_description: str
    academic_period: str
    report_date: str
    class_section: str
    students: List[GradeReportRow]


@dataclass
class SubjectRow:
    subject_code: str
    subject_name: str
    units: Optional[int]
    midterm_grade: Optional[float]
    final_grade: Optional[float]
    semester: str
    instructor: str


@dataclass
class StudentInfo:
    student_id: str
    first_name: str
    middle_name: Optional[str]
    last_name: str
    address: Optional[str]
    course: Optional[str]
    major: Optional[str]


def ensure_environment() -> None:
    if pdfium is None:
        print('Missing dependency: pypdfium2 is required. Install it with: pip install pypdfium2')
        sys.exit(1)
    if pytesseract is None:
        print('Missing dependency: pytesseract is required. Install it with: pip install pytesseract')
        sys.exit(1)

    common_paths = [
        r'C:\Program Files\Tesseract-OCR\tesseract.exe',
        r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
        r'C:\Program Files\Tesseract\tesseract.exe',
        r'C:\Program Files (x86)\Tesseract\tesseract.exe',
    ]

    def validate_tesseract() -> bool:
        try:
            pytesseract.get_tesseract_version()
            return True
        except Exception:
            return False

    if validate_tesseract():
        return

    for candidate in common_paths:
        if os.path.isfile(candidate):
            pytesseract.pytesseract.tesseract_cmd = candidate
            if validate_tesseract():
                return

    print('Tesseract OCR is not available. Install it on your system and ensure it is on PATH.')
    print('Tesseract search paths tried:', common_paths)
    sys.exit(1)


def render_pdf_images(pdf_path: str) -> List[Image.Image]:
    doc = pdfium.PdfDocument(pdf_path)
    images: List[Image.Image] = []
    for page_index in range(len(doc)):
        page = doc.get_page(page_index)
        rendered = page.render(scale=2)
        image = rendered.to_pil()
        images.append(image)
        page.close()
    return images


def normalize_text(value: str) -> str:
    return re.sub(r'[^A-Z0-9]', '', value.upper())


def parse_name_field(raw_name: str) -> tuple[str, Optional[str], str]:
    raw_name = raw_name.strip()
    if ',' in raw_name:
        last, rest = [p.strip() for p in raw_name.split(',', 1)]
        parts = rest.split()
        first = parts[0] if parts else ''
        middle = ' '.join(parts[1:]) if len(parts) > 1 else None
        return first, middle, last
    parts = raw_name.split()
    if len(parts) >= 2:
        return parts[0], ' '.join(parts[1:-1]) if len(parts) > 2 else None, parts[-1]
    return raw_name, None, raw_name


def find_field(text: str, label: str) -> Optional[str]:
    regex = re.compile(rf'{re.escape(label)}\s*[:\-]?\s*(.+)', re.IGNORECASE)
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        match = regex.match(line)
        if match:
            value = match.group(1).strip()
            # stop before the next known label if they are on the same line
            value = re.split(r'\s+(Home Address|Major|Course|College|Instructor|Subject|Period|Date)', value, flags=re.IGNORECASE)[0].strip()
            return value
    return None


def extract_student_info(text: str) -> StudentInfo:
    name_text = find_field(text, 'Name') or ''
    address = find_field(text, 'Home Address')
    major = find_field(text, 'Major')
    if not major:
        major = find_field(text, 'Course')
    first_name, middle_name, last_name = parse_name_field(name_text)
    student_id = normalize_text(f'{last_name}{first_name}') or 'UNKNOWN'
    return StudentInfo(
        student_id=student_id,
        first_name=first_name or 'Unknown',
        middle_name=middle_name,
        last_name=last_name or 'Student',
        address=address,
        course=major,
        major=major,
    )


def extract_grade_report_data(text: str) -> GradeReportData:
    """Extracts data specifically from the Grade Report - College format."""
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    
    # Metadata Extraction
    institution = find_field(text, "Institution") or "University of Northern Philippines"
    campus = find_field(text, "Campus") or ""
    instructor = find_field(text, "Instructor") or ""
    sub_code = find_field(text, "Subject Code") or ""
    sub_desc = find_field(text, "Subject Description") or ""
    period = find_field(text, "Period") or ""
    report_date = find_field(text, "Date Generated") or ""
    section = find_field(text, "Class/Section") or ""

    students: List[GradeReportRow] = []
    
    # Table Parsing Logic
    # Pattern looks for: ID (YY-XXXXX) Name (Letters/Comma) Course (Letters) Grades...
    # Example: 25-16287 ALUDINO, CHRISTOPHER A. ELECTRO 2.50 2.25 Passed 04/20/26
    row_regex = re.compile(
        r'(\d{2}-\d{5})\s+'                # student_number
        r'([A-Z,\s\.]+?)\s+'                # student_name
        r'([A-Z\d]{2,})\s+'                 # course
        r'([\d\.]*)\s+'                     # midterm
        r'([\d\.]*)\s+'                     # percentage (optional)
        r'([\d\.]*)\s+'                     # final
        r'([A-Za-z\s]+?)\s+'                # remark
        r'(\d{2}/\d{2}/\d{2})',             # date_posted
        re.IGNORECASE
    )

    for line in lines:
        match = row_regex.search(line)
        if match:
            s_num, s_name, s_course, mid, perc, final, remark, dt = match.groups()
            
            # Enrollment Status Logic
            status = "Active"
            if "(DROPPED)" in s_name.upper():
                status = "Dropped"
            elif "OFFICIALLY DROPPED" in remark.upper():
                status = "Officially Dropped"
            elif "UNOFFICIALLY DROPPED" in remark.upper():
                status = "Unofficially Dropped"

            students.append(GradeReportRow(
                student_number=s_num,
                student_name=s_name.strip(),
                course=s_course,
                midterm_grade=try_float(mid),
                final_percentage=perc,
                final_grade=try_float(final),
                remark=remark.strip(),
                enrollment_status=status,
                date_posted=dt
            ))

    return GradeReportData(
        institution=institution,
        campus=campus,
        document_type="Grade Report - College",
        instructor=instructor,
        subject_code=sub_code,
        subject_description=sub_desc,
        academic_period=period,
        report_date=report_date,
        class_section=section,
        students=students
    )


def find_table_start(lines: List[str]) -> int:
    for index, line in enumerate(lines):
        if 'subject code' in line.lower() and 'descriptive title' in line.lower():
            return index + 1
    return 0


def line_has_subject_code(line: str) -> bool:
    return bool(re.match(r'^[A-Za-z]{2,}(?:\s+[A-Za-z]{2,})*\s+\d{3}', line.strip()))


def parse_subject_line(line: str) -> Optional[SubjectRow]:
    line = re.sub(r'\s{2,}', ' | ', line.strip())
    parts = [part.strip() for part in line.split('|') if part.strip()]
    if len(parts) >= 6:
        subject_code = parts[0]
        subject_name = parts[1]
        units = try_int(parts[2])
        midterm_grade = try_float(parts[3])
        final_grade = try_float(parts[4])
        semester = parts[5]
        instructor = ' '.join(parts[6:]) if len(parts) > 6 else ''
        if midterm_grade is None and final_grade is None:
            return None
        return SubjectRow(subject_code, subject_name, units, midterm_grade, final_grade, semester, instructor)

    tokens = re.split(r'\s+', line.strip())
    code_end = next((idx for idx, tok in enumerate(tokens) if re.fullmatch(r'\d{3}', tok)), None)
    if code_end is None or code_end == 0:
        return None
    subject_code = ' '.join(tokens[: code_end + 1])
    remaining = tokens[code_end + 1 :]
    numeric_indexes = [idx for idx, tok in enumerate(remaining) if re.fullmatch(r'\d+(?:\.\d+)?', tok)]
    if len(numeric_indexes) < 2:
        return None
    final_idx = numeric_indexes[-1]
    midterm_idx = numeric_indexes[-2]
    units_idx = next((idx for idx in range(final_idx) if re.fullmatch(r'\d+', remaining[idx]) and int(remaining[idx]) <= 6), None)
    if units_idx is None or units_idx >= midterm_idx:
        return None
    subject_name = ' '.join(remaining[:units_idx])
    units = try_int(remaining[units_idx])
    midterm_grade = try_float(remaining[midterm_idx])
    final_grade = try_float(remaining[final_idx])
    suffix = remaining[final_idx + 1 :]
    semester, instructor = split_semester_instructor(suffix)
    if not subject_name:
        subject_name = subject_code
    return SubjectRow(subject_code, subject_name, units, midterm_grade, final_grade, semester, instructor)


def split_semester_instructor(tokens: List[str]) -> tuple[str, str]:
    if not tokens:
        return '', ''
    joined = ' '.join(tokens)
    sem_match = re.search(r'\b(1st|2nd|first|second)\s*sem\b', joined, re.IGNORECASE)
    if sem_match:
        sem_text = sem_match.group(0)
        instructor = joined[sem_match.end() :].strip()
        return sem_text, instructor
    if len(tokens) >= 2 and re.match(r'^[A-Za-z]\.?$', tokens[0]):
        return '', ' '.join(tokens)
    return '', joined


def try_int(value: str) -> Optional[int]:
    try:
        return int(value)
    except Exception:
        return None


def try_float(value: str) -> Optional[float]:
    try:
        return float(value)
    except Exception:
        return None


def extract_subject_rows(text: str) -> List[SubjectRow]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    start_index = find_table_start(lines)
    rows: List[SubjectRow] = []
    for line in lines[start_index:]:
        if re.search(r'\bTOTAL\b', line, re.IGNORECASE):
            break
        if 'descriptive title' in line.lower() or 'units' in line.lower() and 'mid-term' in line.lower():
            continue
        if not line_has_subject_code(line):
            continue
        subject = parse_subject_line(line)
        if subject is not None:
            rows.append(subject)
    return rows


def ocr_page(image: Image.Image) -> str:
    return pytesseract.image_to_string(image, lang='eng', config='--psm 6')


def scan_file(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    page_text = []
    if ext == '.pdf':
        pages = render_pdf_images(file_path)
        for image in pages:
            page_text.append(ocr_page(image))
    elif ext in ('.jpg', '.jpeg', '.png', '.bmp', '.tiff'):
        image = Image.open(file_path)
        page_text.append(ocr_page(image))
    else:
        print(f"Unsupported file extension: {ext}")
        sys.exit(1)
    return '\n'.join(page_text)


def preview_result(student: StudentInfo, rows: List[SubjectRow]) -> None:
    print(f'Student: {student.first_name} {student.middle_name or ""} {student.last_name}'.strip())
    print(f'  student_id: {student.student_id}')
    print(f'  major: {student.major}')
    print(f'  address: {student.address}')
    print('Extracted subjects:')
    for row in rows:
        print(f'  {row.subject_code} | {row.subject_name} | units={row.units} | mid={row.midterm_grade} | final={row.final_grade} | sem={row.semester} | instructor={row.instructor}')


def get_backend_students(base_url: str) -> List[dict]:
    response = requests.get(f'{base_url.rstrip("/")}/students/getall')
    response.raise_for_status()
    return response.json()


def find_student(existing: List[dict], student: StudentInfo) -> Optional[dict]:
    for candidate in existing:
        if candidate.get('student_id') == student.student_id:
            return candidate
        if candidate.get('first_name', '').lower() == student.first_name.lower() and candidate.get('last_name', '').lower() == student.last_name.lower():
            return candidate
    return None


def create_student(base_url: str, student: StudentInfo) -> dict:
    payload = {
        'student_id': student.student_id,
        'first_name': student.first_name,
        'middle_name': student.middle_name,
        'last_name': student.last_name,
        'birthday': None,
        'gender': None,
        'address': student.address,
        'contact_number': None,
        'email': None,
        'year_level': None,
        'course': student.course,
        'section': None,
        'status': 'Regular',
        'major': student.major,
    }
    response = requests.post(f'{base_url.rstrip("/")}/students/', json=payload)
    response.raise_for_status()
    return response.json()


def create_grade(base_url: str, student_id: str, row: SubjectRow) -> dict:
    payload = {
        'student_id': student_id,
        'subject_code': row.subject_code,
        'midterm_grade': row.midterm_grade,
        'final_grade': row.final_grade,
        'semester': row.semester or None,
        'school_year': None,
    }
    response = requests.post(f'{base_url.rstrip("/")}/grades/', json=payload)
    response.raise_for_status()
    return response.json()


def run_import(file_path: str, base_url: str, dry_run: bool, doc_type: str) -> None:
    ensure_environment()
    full_text = scan_file(file_path)
    
    if doc_type == DocumentType.GRADE_REPORT:
        data = extract_grade_report_data(full_text)
        if not data.students:
            print("No students detected in grade report.")
            return
        process_grade_report_import(data, base_url, dry_run)
    else:
        student = extract_student_info(full_text)
        rows = extract_subject_rows(full_text)
        if not rows:
            print('No subject rows were detected. Import aborted.')
            return
        preview_result(student, rows)
        process_appraisal_import(student, rows, base_url, dry_run)


def process_appraisal_import(student: StudentInfo, rows: List[SubjectRow], base_url: str, dry_run: bool) -> None:
    existing_students = get_backend_students(base_url)
    matched = find_student(existing_students, student)
    if matched:
        print('Found existing student record, using student_id:', matched.get('student_id'))
        created = matched
    elif dry_run:
        print('DRY RUN: would create student with payload from parsed fields.')
        created = {'student_id': student.student_id}
    else:
        created = create_student(base_url, student)
        print('Created student:', created.get('student_id'))

    for row in rows:
        if dry_run:
            print(f'DRY RUN: would create grade for {created.get("student_id")} -> {row.subject_code}')
            continue
        created_grade = create_grade(base_url, created.get('student_id'), row)
        print('Created grade for', row.subject_code, '-> grade_id', created_grade.get('grade_id'))

    print('Import finished; dry_run=' + str(dry_run))


def process_grade_report_import(data: GradeReportData, base_url: str, dry_run: bool) -> None:
    print(f"Importing Grade Report for {data.subject_code} - {data.subject_description}")
    existing_students = get_backend_students(base_url)
    
    for s in data.students:
        # Map GradeReportRow to StudentInfo for compatibility
        last_name, first_name = s.student_name.split(',', 1) if ',' in s.student_name else (s.student_name, "")
        info = StudentInfo(
            student_id=s.student_number,
            first_name=first_name.strip(),
            middle_name=None,
            last_name=last_name.strip(),
            address=None,
            course=s.course,
            major=None
        )
        
        matched = find_student(existing_students, info)
        if not matched and not dry_run:
            matched = create_student(base_url, info)
            print(f"Created student: {info.student_id}")
        
        if not dry_run:
            # Map to SubjectRow for create_grade function
            row = SubjectRow(
                subject_code=data.subject_code,
                subject_name=data.subject_description,
                units=None,
                midterm_grade=s.midterm_grade,
                final_grade=s.final_grade,
                semester=data.academic_period,
                instructor=data.instructor
            )
            create_grade(base_url, s.student_number, row)
            print(f"  Posted grade for {s.student_number}")

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Scan appraisal PDF and import student grades into SMRS backend.')
    parser.add_argument('--input', '-i', required=True, help='Path to the file (PDF or Image).')
    parser.add_argument('--type', '-t', choices=[DocumentType.APPRAISAL, DocumentType.GRADE_REPORT], default=DocumentType.APPRAISAL, help='Type of document.')
    parser.add_argument('--base', '-b', default='http://127.0.0.1:8000', help='Backend base URL.')
    parser.add_argument('--dry-run', action='store_true', help='Do not post data to the backend.')
    parser.add_argument('--scan', action='store_true', help='Only scan and preview extracted data.')
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not os.path.isfile(args.input):
        print('Input file not found:', args.input)
        sys.exit(1)
    ensure_environment()
    if args.scan:
        full_text = scan_file(args.input)
        print("--- OCR RESULT ---")
        print(full_text)
        print('Scan completed. Use --commit to push extracted data to the backend.')
        return

    if args.dry_run:
        print('Dry-run mode enabled. No data will be posted to the backend.')
    run_import(args.input, args.base, args.dry_run, args.type)


if __name__ == '__main__':
    main()
