from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
import io
import os
import re
from typing import List, Optional

from ..database.db import get_db
from ..models.students_model import Student
from ..models.subjects_model import Subject
from ..models.grade_model import Grade
from ..repository import student_repo

try:
    from PIL import Image
except ImportError:
    Image = None

try:
    import pytesseract
except ImportError:
    pytesseract = None

try:
    import pypdfium2 as pdfium
except ImportError:
    pdfium = None

router = APIRouter()

COMMON_TESSERACT_PATHS = [
    r'C:\Program Files\Tesseract-OCR\tesseract.exe',
    r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
    r'C:\Program Files\Tesseract\tesseract.exe',
    r'C:\Program Files (x86)\Tesseract\tesseract.exe',
]


def ensure_ocr_environment():
    if pdfium is None:
        raise RuntimeError('Missing dependency: pypdfium2')
    if pytesseract is None:
        raise RuntimeError('Missing dependency: pytesseract')
    if Image is None:
        raise RuntimeError('Missing dependency: pillow (PIL)')
    if not is_tesseract_available():
        raise RuntimeError('Tesseract OCR is not installed or not found on PATH')


def is_tesseract_available() -> bool:
    try:
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        for path in COMMON_TESSERACT_PATHS:
            if os.path.isfile(path):
                pytesseract.pytesseract.tesseract_cmd = path
                try:
                    pytesseract.get_tesseract_version()
                    return True
                except Exception:
                    continue
    return False


def ocr_pdf_bytes(data: bytes) -> str:
    document = pdfium.PdfDocument(io.BytesIO(data))
    pages: List[str] = []
    for page_index in range(len(document)):
        page = document.get_page(page_index)
        rendered = page.render(scale=2)
        image = rendered.to_pil()
        page.close()
        pages.append(pytesseract.image_to_string(image, lang='eng', config='--psm 6'))
    return '\n'.join(pages)


def ocr_image_bytes(data: bytes) -> str:
    image = Image.open(io.BytesIO(data))
    return pytesseract.image_to_string(image, lang='eng', config='--psm 6')


def normalize_name(text: str) -> str:
    return text.strip().replace('  ', ' ')


def parse_name_field(raw_name: str) -> tuple[str, Optional[str], str]:
    raw_name = raw_name.strip()
    if ',' in raw_name:
        parts = [p.strip() for p in raw_name.split(',', 1)]
        last = parts[0]
        rest = parts[1] if len(parts) > 1 else ''
        tokens = rest.split()
        first = tokens[0] if tokens else ''
        middle = ' '.join(tokens[1:]) if len(tokens) > 1 else None
        return first, middle, last
    tokens = raw_name.split()
    if len(tokens) >= 2:
        return tokens[0], ' '.join(tokens[1:-1]) if len(tokens) > 2 else None, tokens[-1]
    return raw_name, None, raw_name


def normalize_student_id(first: str, last: str) -> str:
    candidate = f'{last}{first}'.strip()
    candidate = re.sub(r'[^A-Za-z0-9]', '', candidate)
    return candidate.upper() or 'UNKNOWN'


def find_field(text: str, label: str) -> Optional[str]:
    regex = re.compile(rf'{re.escape(label)}\s*[:\-]?\s*(.+)', re.IGNORECASE)
    for line in text.splitlines():
        match = regex.match(line.strip())
        if match:
            value = match.group(1).strip()
            # stop before the next known label if they are on the same line
            return re.split(r'\s+(Home Address|Major|Course|College|Instructor|Subject|Period|Date)', value, flags=re.IGNORECASE)[0].strip()
    return None


def extract_grade_report_data(text: str) -> dict:
    """Extracts data specifically from the Grade Report - College format."""
    lines = [l.strip() for l in text.splitlines() if l.strip()]

    # Metadata - try multiple label variants to handle OCR noise
    data = {
        'institution': find_field(text, "University") or "University of Northern Philippines",
        'campus': find_field(text, "Campus") or "",
        'instructor': find_field(text, "Instructor") or "",
        'subject_code': find_field(text, "Subject Code") or "",
        'subject_description': find_field(text, "Description") or find_field(text, "Subject Description") or "",
        'academic_period': find_field(text, "Period") or "",
        'report_date': find_field(text, "Date") or "",
        'class_section': find_field(text, "Class/Section") or "",
        'students': []
    }

    # Patterns
    id_pattern = re.compile(r'\b(\d{2}-\d{4,6})\b')
    date_pattern = re.compile(r'(\d{2}/\d{2}/\d{2,4})')
    grade_pattern = re.compile(r'\b(\d+\.\d{1,2})\b')

    for line in lines:
        id_match = id_pattern.search(line)
        if not id_match:
            continue

        student_number = id_match.group(1)

        # Clean table-drawing characters so we can work with plain text
        clean = re.sub(r'[\[\]_|{}]', ' ', line)
        clean = re.sub(r'\s+', ' ', clean).strip()

        # --- Determine enrollment status & remark ---
        remark = ''
        enrollment_status = 'Active'
        if re.search(r'unofficially\s*dropped', clean, re.IGNORECASE):
            remark = 'Unofficially Dropped'
            enrollment_status = 'Unofficially Dropped'
        elif re.search(r'officially\s*dropped', clean, re.IGNORECASE):
            remark = 'Officially Dropped'
            enrollment_status = 'Officially Dropped'
        elif re.search(r'\bUD\b', clean):
            remark = 'Unofficially Dropped'
            enrollment_status = 'Unofficially Dropped'
        elif re.search(r'\bdropped\b', clean, re.IGNORECASE):
            remark = 'Dropped'
            enrollment_status = 'Dropped'
        elif re.search(r'\bfailed\b', clean, re.IGNORECASE):
            remark = 'Failed'
        elif re.search(r'\bpassed\b', clean, re.IGNORECASE):
            remark = 'Passed'

        # --- Grades: find all decimal numbers in the line ---
        all_grades = grade_pattern.findall(clean)
        midterm_grade = parse_grade_token(all_grades[0]) if len(all_grades) >= 1 else None
        final_grade = parse_grade_token(all_grades[-1]) if len(all_grades) >= 1 else None
        # If there are at least 2 grades, last one is the final grade
        if len(all_grades) >= 2:
            final_grade = parse_grade_token(all_grades[-1])

        # --- Extract text after the student ID ---
        after_id = clean[id_match.end():].strip()

        # Find where the first grade starts — everything before it is name + course
        first_grade_match = grade_pattern.search(after_id)
        if first_grade_match:
            name_course_block = after_id[:first_grade_match.start()].strip()
        else:
            name_course_block = after_id[:40].strip()

        # Remove any leading row number (1-3 digits at start)
        name_course_block = re.sub(r'^\d{1,3}\s+', '', name_course_block).strip()

        # The course code is usually the last whitespace-separated token before grades
        # It's typically 3-8 uppercase/alnum characters with no lowercase run longer than 2
        tokens = name_course_block.split()
        course = ''
        name_tokens = tokens
        for i in range(len(tokens) - 1, -1, -1):
            tok = tokens[i]
            # A course code: short (2-10 chars), mostly uppercase or digits
            upper_ratio = sum(1 for c in tok if c.isupper()) / max(len(tok), 1)
            if 2 <= len(tok) <= 10 and upper_ratio >= 0.5:
                course = tok.upper()
                name_tokens = tokens[:i]
                break

        student_name = ' '.join(name_tokens).strip()
        # Remove any residual row-number prefix
        student_name = re.sub(r'^\d{1,3}\s+', '', student_name).strip()

        # Skip header/garbage lines
        if not student_name or len(student_name) < 3:
            continue
        # Skip lines that look like table headers
        if re.match(r'^(No|ID|Name|Course|Mid|Final|Remark|Date)', student_name, re.IGNORECASE):
            continue

        date_match = date_pattern.search(clean)
        date_posted = date_match.group(1) if date_match else ''

        data['students'].append({
            'student_number': student_number,
            'student_name': student_name,
            'course': course or 'N/A',
            'midterm_grade': midterm_grade,
            'final_percentage': None,
            'final_grade': final_grade,
            'remark': remark,
            'enrollment_status': enrollment_status,
            'date_posted': date_posted
        })

    return data


def extract_student_info(text: str) -> dict:
    student_name = find_field(text, 'Name')
    student_address = find_field(text, 'Home Address')
    student_major = find_field(text, 'Major') or find_field(text, 'Course')

    first_name, middle_name, last_name = parse_name_field(student_name or '')
    student_id = normalize_student_id(first_name, last_name)

    return {
        'student_id': student_id,
        'first_name': first_name or 'Unknown',
        'middle_name': middle_name,
        'last_name': last_name or 'Student',
        'address': student_address,
        'course': student_major,
        'major': student_major,
    }


def parse_semester(token: str) -> Optional[int]:
    if not token:
        return None
    token = token.lower()
    if '1st' in token or 'first' in token or '1' == token.strip():
        return 1
    if '2nd' in token or 'second' in token or '2' == token.strip():
        return 2
    return None


def parse_grade_token(token: str) -> Optional[float]:
    if not token:
        return None
    token = token.strip().replace('O', '0').replace('o', '0').replace('l', '1').replace('I', '1')
    token = re.sub(r'(?<=\d)[,-](?=\d)', '.', token)
    token = token.replace('—', '.').replace('_', '')
    token = re.sub(r'[^0-9\.]', '', token)
    if not token:
        return None
    try:
        return float(token)
    except ValueError:
        return None


def line_is_subject_line(line: str) -> bool:
    clean = line.lstrip('| ').strip()
    return bool(re.match(r'^[A-Za-z]{2,6}(?:\s+[A-Za-z]{2,6})?\s*\d{3}', clean))


def split_line_cells(line: str) -> List[str]:
    if '|' in line:
        items = [seg.strip() for seg in line.replace('[', '|').replace(']', '|').split('|') if seg.strip()]
        if len(items) > 1:
            return items
    return [seg.strip() for seg in re.split(r'\s{2,}', line) if seg.strip()]


def parse_subject_line(line: str) -> Optional[dict]:
    # Strategy matched from import_appraisal.py for better reliability
    line = re.sub(r'\s{2,}', ' | ', line.strip())
    parts = [part.strip() for part in line.split('|') if part.strip()]
    
    if len(parts) >= 6:
        midterm = parse_grade_token(parts[3])
        final = parse_grade_token(parts[4])
        if midterm is None and final is None:
            return None
        return {
            'subject_code': parts[0].replace(' ', '').upper(),
            'subject_name': parts[1],
            'units': int(parse_grade_token(parts[2])) if parse_grade_token(parts[2]) else 3,
            'midterm_grade': midterm,
            'final_grade': final,
            'semester': parse_semester(parts[5]),
            'instructor': ' '.join(parts[6:]) if len(parts) > 6 else '',
        }

    # Fallback to token based parsing
    tokens = re.split(r'\s+', line.strip())
    code_end = next((idx for idx, tok in enumerate(tokens) if re.fullmatch(r'\d{3}', tok)), None)
    if code_end is None or code_end == 0:
        return None
        
    remaining = tokens[code_end + 1 :]
    numeric_indexes = [idx for idx, tok in enumerate(remaining) if re.fullmatch(r'\d+(?:\.\d+)?', tok)]
    if len(numeric_indexes) < 2:
        return None
        
    final_idx = numeric_indexes[-1]
    midterm_idx = numeric_indexes[-2]
    units_idx = next((idx for idx in range(final_idx) if re.fullmatch(r'\d+', remaining[idx]) and int(remaining[idx]) <= 6), None)
    
    if units_idx is None or units_idx >= midterm_idx:
        return None

    midterm = parse_grade_token(remaining[midterm_idx])
    final = parse_grade_token(remaining[final_idx])
    
    return {
        'subject_code': ' '.join(tokens[: code_end + 1]).replace(' ', '').upper(),
        'subject_name': ' '.join(remaining[:units_idx]) or 'Unknown',
        'units': int(remaining[units_idx]),
        'midterm_grade': midterm,
        'final_grade': final,
        'semester': 1,
        'instructor': ' '.join(remaining[final_idx + 1 :]),
    }


def extract_subject_rows(text: str) -> List[dict]:
    rows: List[dict] = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or not line_is_subject_line(line):
            continue
        parsed = parse_subject_line(line)
        if parsed:
            rows.append(parsed)

    return rows


def compute_final(midterm: Optional[float], finals: Optional[float]) -> Optional[float]:
    if midterm is not None and finals is not None:
        return round((midterm + finals) / 2, 2)
    if midterm is not None:
        return midterm
    if finals is not None:
        return finals
    return None


def remarks_for_grade(final: Optional[float]) -> str:
    if final is None:
        return 'INC'
    return 'Passed' if final <= 3.0 else 'Failed'


def find_student_by_name(db: Session, first_name: str, last_name: str) -> Optional[Student]:
    if not first_name or not last_name:
        return None
    return db.query(Student).filter(
        Student.first_name.ilike(f'%{first_name}%'),
        Student.last_name.ilike(f'%{last_name}%'),
    ).first()


def create_or_find_student(db: Session, student_data: dict) -> Student:
    existing = find_student_by_name(db, student_data['first_name'], student_data['last_name'])
    if existing:
        return existing
    return student_repo.create(db, student_data)


def find_or_create_subject(db: Session, subject_code: str, subject_name: str, units: Optional[int]) -> Subject:
    code = subject_code.strip().upper()
    if not code:
        raise ValueError('Subject code is required')
    subject = db.query(Subject).filter(Subject.subject_code == code).first()
    if subject:
        return subject
    subject = Subject(subject_code=code, subject_name=subject_name or code, unit=units or 3)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


def create_grade_record(db: Session, student_id: str, row: dict) -> Grade:
    subject = find_or_create_subject(db, row['subject_code'], row.get('subject_name', ''), row.get('units'))
    final_value = compute_final(row.get('midterm_grade'), row.get('final_grade'))
    entry = Grade(
        student_id=student_id,
        subject_id=subject.subject_id,
        semester=row.get('semester') or 1,
        school_year=None,
        midterm=row.get('midterm_grade'),
        finals=row.get('final_grade'),
        grade=final_value if final_value is not None else 0.0,
        remarks=remarks_for_grade(final_value),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def student_to_dict(student: Student) -> dict:
    return {
        'student_number': student.student_number,
        'student_id': student.student_id,
        'first_name': student.first_name,
        'middle_name': student.middle_name,
        'last_name': student.last_name,
        'birthday': student.birthday,
        'gender': student.gender,
        'address': student.address,
        'contact_number': student.contact_number,
        'email': student.email,
        'year_level': student.year_level,
        'course': student.course,
        'section': student.section,
        'status': student.status,
        'major': student.major,
    }


@router.post('/appraisal')
def import_appraisal(file: UploadFile = File(...), commit: bool = False, db: Session = Depends(get_db)):
    try:
        ensure_ocr_environment()
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    try:
        data = file.file.read()
    except Exception as exc:
        raise HTTPException(status_code=400, detail='Failed to read uploaded file') from exc

    try:
        extracted_text = ocr_pdf_bytes(data)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f'PDF OCR failed: {exc}') from exc

    student_info = extract_student_info(extracted_text)
    subject_rows = extract_subject_rows(extracted_text)

    if not subject_rows:
        raise HTTPException(status_code=400, detail='No subject rows could be extracted from the uploaded PDF.')

    result = {
        'student': student_info,
        'rows': subject_rows,
        'commit': commit,
        'created_student': None,
        'created_grades': 0,
    }

    if commit:
        student = create_or_find_student(db, student_info)
        for row in subject_rows:
            create_grade_record(db, student.student_id, row)
            result['created_grades'] += 1
        result['created_student'] = student_to_dict(student)

    return result


@router.post('/grade-report')
def import_grade_report(file: UploadFile = File(...), commit: bool = False, db: Session = Depends(get_db)):
    try:
        ensure_ocr_environment()
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    data_bytes = file.file.read()
    filename = file.filename.lower()

    if filename.endswith('.pdf'):
        extracted_text = ocr_pdf_bytes(data_bytes)
    elif filename.endswith(('.jpg', '.jpeg', '.png', '.bmp', '.tiff')):
        extracted_text = ocr_image_bytes(data_bytes)
    else:
        raise HTTPException(status_code=400, detail='Unsupported file format. Use PDF or Image.')

    report_data = extract_grade_report_data(extracted_text)

    if not report_data['students']:
        raise HTTPException(status_code=400, detail='No student records detected in the grade report.')

    result = {
        'metadata': {k: v for k, v in report_data.items() if k != 'students'},
        'rows': report_data['students'],
        'commit': commit,
        'created_grades': 0
    }

    if commit:
        # Find or create the subject first
        subject = find_or_create_subject(db, report_data['subject_code'], report_data['subject_description'], None)
        
        for s in report_data['students']:
            last_name, first_name = s['student_name'].split(',', 1) if ',' in s['student_name'] else (s['student_name'], "")
            student_payload = {
                'student_id': s['student_number'],
                'first_name': first_name.strip(),
                'last_name': last_name.strip(),
                'course': s['course'],
                'status': s['enrollment_status']
            }
            student_obj = create_or_find_student(db, student_payload)
            
            # Pass minimal SubjectRow compatible dict
            grade_row = {'subject_code': subject.subject_code, 'midterm_grade': s['midterm_grade'], 'final_grade': s['final_grade']}
            create_grade_record(db, student_obj.student_id, grade_row)
            result['created_grades'] += 1

    return result
