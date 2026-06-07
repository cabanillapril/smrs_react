from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
import io
import os
import re
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from ..database.db import get_db
from ..models.students_model import Student
from ..models.subjects_model import Subject
from ..models.grade_model import Grade
from ..schemas.student_schema import StudentCreate
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

# --- Pydantic Models for Commit Features ---

class AppraisalSubject(BaseModel):
    subject_code: str
    subject_name: Optional[str] = None
    units: Optional[int] = 3
    midterm_grade: Optional[float] = None
    final_grade: Optional[float] = None
    semester: Optional[int] = 1
    instructor: Optional[str] = ""

class AppraisalCommitIn(BaseModel):
    student: Dict[str, Any]
    rows: List[AppraisalSubject]

class GradeReportStudentRow(BaseModel):
    student_number: str
    student_name: str
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    course: str
    midterm_grade: Optional[float] = None
    final_grade: Optional[float] = None
    enrollment_status: str

class GradeReportMetadata(BaseModel):
    subject_code: str
    subject_description: str
    instructor: str
    academic_period: str
    institution: Optional[str] = None
    campus: Optional[str] = None
    report_date: Optional[str] = None
    class_section: Optional[str] = None

class GradeReportCommitIn(BaseModel):
    metadata: GradeReportMetadata
    rows: List[GradeReportStudentRow]

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
    # Fix merged names like "AdolfoJamesRabe" -> "Adolfo James Rabe"
    fixed = re.sub(r'([a-z])([A-Z])', r'\1 \2', text.strip())
    # Also handle lowercase followed by digits if merged
    fixed = re.sub(r'([a-zA-Z])(\d)', r'\1 \2', fixed)
    return fixed.replace('  ', ' ')


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
    # Use search to handle noise/indentation before labels
    regex = re.compile(rf'{re.escape(label)}\s*[:\-]?\s*([^ \t\n\r\f\v].*)', re.IGNORECASE)
    lines = text.splitlines()
    for i, line in enumerate(lines):
        match = regex.search(line)
        if match:
            value = match.group(1).strip()
            # Handle case where value is on the next line (OCR line break)
            if not value and i + 1 < len(lines):
                next_line = lines[i+1].strip()
                # Ensure next line isn't another metadata label
                if not re.search(r'^(Major|Course|College|Instructor|Subject|Period|Date|Campus|Description)', next_line, re.IGNORECASE):
                    value = next_line

            # Better label terminators to handle multi-field lines
            return re.split(r'\s+(Home Address|Major|Course|College|Instructor|Subject|Period|Date|Campus|Description|Generated|Descriptive|Remarks)', value, flags=re.IGNORECASE)[0].strip()
    return None


# ---------------------------------------------------------------------------
# Grade Report extraction
# ---------------------------------------------------------------------------

def extract_grade_report_data(text: str) -> dict:
    """Extracts data from the Grade Report - College format."""

    data = {
        'institution': find_field(text, "Institution") or find_field(text, "University") or "University of Northern Philippines",
        'campus': find_field(text, "Campus") or "",
        'instructor': find_field(text, "Instructor") or "",
        'subject_code': find_field(text, "Subject Code") or "",
        'subject_description': find_field(text, "Descriptive Title") or find_field(text, "Description") or find_field(text, "Subject Description") or "",
        'academic_period': find_field(text, "Period") or "",
        'report_date': find_field(text, "Date") or "",
        'class_section': find_field(text, "Class/Section") or "",
        'students': []
    }

    id_pattern = re.compile(r'\b(\d{2}-\d{4,6})\b')
    date_pattern = re.compile(r'(\d{2}/\d{2}/\d{2,4})')
    # Catch standard grades, 3-digit merged grades (275), and INC
    grade_pattern = re.compile(r'\b(\d\.\d{1,2}|\b[1-5]00\b|\b\d{3}\b|INC)\b', re.IGNORECASE)
    remark_pattern = re.compile(r'\b(Passed|Failed|INC|Unofficially\s*Dropped|Officially\s*Dropped|Dropped|UD)\b', re.IGNORECASE)

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
            
        id_match = id_pattern.search(line)
        if not id_match:
            continue

        student_number = id_match.group(1)
        
        # Normalize noise and markers (OCR often produces symbols for table borders)
        clean = re.sub(r'[\[\]_|{}\t]', ' ', line)
        clean = re.sub(r'\s+', ' ', clean).strip()

        # 1. Identify Remark, Date, and Grades
        enrollment_status = 'Active'
        remark_found = remark_pattern.search(clean)
        if remark_found:
            rem_keyword = remark_found.group(1).upper()
            if 'DROPPED' in rem_keyword or rem_keyword == 'UD':
                enrollment_status = 'Unofficially Dropped' if ('UNOFFICIALLY' in rem_keyword or rem_keyword == 'UD') else \
                                   ('Officially Dropped' if 'OFFICIALLY' in rem_keyword else 'Dropped')
        
        date_found = date_pattern.search(clean)
        date_posted = date_found.group(1) if date_found else ''

        # Extract all potential grade tokens
        all_grades = [m.group(0) for m in grade_pattern.finditer(clean) if m.group(0).upper() != student_number]
        midterm_grade = parse_grade_token(all_grades[0]) if len(all_grades) >= 1 else None
        final_grade = parse_grade_token(all_grades[-1]) if len(all_grades) >= 1 else None

        # 2. Isolate Name and Course by stripping identified IDs, Grades, Dates, and Remarks
        temp = clean
        temp = temp.replace(student_number, ' ')
        if date_found: temp = temp.replace(date_found.group(1), ' ')
        for g in all_grades: temp = temp.replace(g, ' ')
        temp = remark_pattern.sub(' ', temp)
        
        tokens = [t.strip() for t in temp.split() if t.strip()]

        # Safely remove leading row sequence number (only if it matches the actual line start)
        if tokens and tokens[0].isdigit() and len(tokens[0]) <= 3:
            if clean.startswith(tokens[0]):
                tokens.pop(0)
            
        if not tokens: continue

        course = ''
        name_parts = tokens
        _PARTICLES = {'DE', 'LA', 'LOS', 'LAS', 'DEL', 'SAN', 'SANTA', 'SANTO', 'NG', 'NGA'}
        _NAME_SUFFIXES = {'JR', 'SR', 'II', 'III', 'IV', 'V'}
        
        # Improved Course detection
        if len(tokens) >= 2:
            last = tokens[-1]
            # Check if last token is likely a code (lots of uppercase/digits)
            upper_count = sum(1 for c in last if c.isupper() or c.isdigit())
            is_likely_code = upper_count / len(last) > 0.6 if len(last) > 0 else False
            
            if (is_likely_code and 
                2 <= len(last) <= 10 and 
                last.upper() not in _PARTICLES and 
                last.upper() not in _NAME_SUFFIXES and
                not last.endswith(',')):
                course = last.upper()
                name_parts = tokens[:-1]

        # Apply CamelCase splitting to fix merged names
        raw_name = ' '.join(name_parts).strip()
        student_name = normalize_name(raw_name)

        if not student_name or len(student_name) < 3: continue
        if re.match(r'^(No|ID|Name|Course|Mid|Final|Remark|Date|Posted)', student_name, re.IGNORECASE): continue

        # Pre-split the name to allow the UI to show separate editable fields
        fn, mn, ln = parse_name_field(student_name)

        data['students'].append({
            'student_number': student_number,
            'student_name': student_name,
            'first_name': fn,
            'middle_name': mn,
            'last_name': ln,
            'course': course or 'N/A',
            'midterm_grade': midterm_grade,
            'final_percentage': None,
            'final_grade': final_grade,
            'remark': remark_found.group(1) if remark_found else '',
            'enrollment_status': enrollment_status,
            'date_posted': date_posted
        })

    return data


def parse_academic_period(period_str: str) -> tuple[Optional[int], Optional[str]]:
    """Helper to extract semester and school year from strings like '2nd Semester, 2024-2025'"""
    if not period_str:
        return 1, None
    
    sem = 1
    if '2nd' in period_str.lower() or 'second' in period_str.lower():
        sem = 2
    elif 'summer' in period_str.lower():
        sem = 3
        
    year_match = re.search(r'(\d{4}(?:-\d{4,})?)', period_str)
    school_year = year_match.group(1) if year_match else None
    
    return sem, school_year


# ---------------------------------------------------------------------------
# Appraisal (student appraisal / grades-per-student) extraction
# ---------------------------------------------------------------------------

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
    if '1st' in token or 'first' in token or token.strip() == '1':
        return 1
    if '2nd' in token or 'second' in token or token.strip() == '2':
        return 2
    return None


def parse_grade_token(token: str) -> Optional[float]:
    if not token: return None
    token = token.strip().upper().replace('O', '0').replace('L', '1').replace('I', '1').replace('S', '5')
    if token == 'INC': return None

    # Aggressively handle 3-digit scores from OCR (e.g., 275 -> 2.75)
    if re.fullmatch(r'[1-5]\d{2}', token):
        token = token[0] + '.' + token[1:]

    token = re.sub(r'(?<=\d)[,-](?=\d)', '.', token)
    token = token.replace('—', '.').replace('_', '')
    token = re.sub(r'[^0-9\.]', '', token)
    if not token: return None
    try:
        val = float(token)
        # Validate range for college grades (typically 1.0 to 5.0)
        if 1.0 <= val <= 5.0:
            return val
        # If OCR gave us something like 27.5, fix it
        if 10.0 <= val <= 50.0:
            return val / 10.0
        return val
    except: return None


_SUBJECT_LINE_STOP = re.compile(
    r'^(TOTAL|SUM|GRAND|SUBTOTAL|NO\b|ID\b|NAME\b)', re.IGNORECASE
)


def line_is_subject_line(line: str) -> bool:
    """Return True if the line looks like it starts with a subject code.

    Subject codes at CTech follow patterns such as:
        MATH 101        (letter run + space + 3 digits)
        ELX201          (letters immediately followed by 3 digits)
        IT 101
        GE-ELEC 1       (hyphenated)

    The original regex was too restrictive (max 6 letters per word).  We now
    accept 2-8 letter runs so that codes like BSIT or PELEC also match.
    Lines that start with summary words like TOTAL are explicitly excluded.
    """
    clean = line.lstrip('| ').strip()
    if _SUBJECT_LINE_STOP.match(clean):
        return False
    return bool(re.match(r'^[A-Za-z]{2,8}(?:[-\s][A-Za-z]{1,8})?\s*\d{1,3}', clean))


def split_line_cells(line: str) -> List[str]:
    if '|' in line:
        items = [seg.strip() for seg in line.replace('[', '|').replace(']', '|').split('|') if seg.strip()]
        if len(items) > 1:
            return items
    return [seg.strip() for seg in re.split(r'\s{2,}', line) if seg.strip()]


def parse_subject_line(line: str) -> Optional[dict]:
    """Parse a single subject row from an appraisal document.

    Strategy 1: pipe/multi-space delimited columns.
    Strategy 2: token-based fallback that is more tolerant of OCR noise and
                subject codes that contain digits directly (e.g. ELX201).
    """
    # --- Strategy 1: column-split ---
    normalised = re.sub(r'\s{2,}', ' | ', line.strip())
    parts = [p.strip() for p in normalised.split('|') if p.strip()]

    if len(parts) >= 6:
        midterm = parse_grade_token(parts[3])
        final   = parse_grade_token(parts[4])
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

    # --- Strategy 2: token-based ---
    tokens = re.split(r'\s+', line.strip())

    # Find where the subject code ends.  A subject code is one or two tokens
    # where the last token is purely digits (e.g. "MATH 101" → idx=1, or
    # "ELX201" already contains digits so idx=0).
    code_end = None
    for idx, tok in enumerate(tokens):
        # Token that is all-digits and ≤ 4 digits → course number
        if re.fullmatch(r'\d{1,4}', tok):
            code_end = idx
            break
        # Token that ends with 3 digits (e.g. ELX201)
        if re.search(r'\d{3}$', tok) and idx == 0:
            code_end = idx
            break

    if code_end is None:
        return None

    subject_code = ''.join(tokens[: code_end + 1]).upper()
    remaining = tokens[code_end + 1:]

    # Find all numeric tokens in remaining
    numeric_indexes = [i for i, t in enumerate(remaining) if re.fullmatch(r'\d+(?:\.\d+)?', t)]
    if len(numeric_indexes) < 2:
        # Only one numeric — treat it as the final grade (INC midterm)
        if len(numeric_indexes) == 1:
            fi = numeric_indexes[0]
            # units candidate: small integer before the grade
            units_idx = next(
                (i for i in range(fi) if re.fullmatch(r'\d', remaining[i])), None
            )
            final = parse_grade_token(remaining[fi])
            units = int(remaining[units_idx]) if units_idx is not None else 3
            subject_name = ' '.join(remaining[: units_idx if units_idx is not None else fi]) or subject_code
            return {
                'subject_code': subject_code,
                'subject_name': subject_name,
                'units': units,
                'midterm_grade': None,
                'final_grade': final,
                'semester': 1,
                'instructor': '',
            }
        return None

    final_idx   = numeric_indexes[-1]
    midterm_idx = numeric_indexes[-2]

    # Units: small integer (≤ 6) before midterm
    units_idx = next(
        (i for i in range(midterm_idx)
         if re.fullmatch(r'\d+', remaining[i]) and int(remaining[i]) <= 6),
        None,
    )

    if units_idx is None or units_idx >= midterm_idx:
        # Still try — maybe there's no explicit units column
        units_idx = None

    name_end = units_idx if units_idx is not None else midterm_idx
    subject_name = ' '.join(remaining[:name_end]) or 'Unknown'
    units = int(remaining[units_idx]) if units_idx is not None else 3
    midterm = parse_grade_token(remaining[midterm_idx])
    final   = parse_grade_token(remaining[final_idx])

    return {
        'subject_code': subject_code,
        'subject_name': subject_name,
        'units': units,
        'midterm_grade': midterm,
        'final_grade': final,
        'semester': 1,
        'instructor': ' '.join(remaining[final_idx + 1:]),
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


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

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
    """Find an existing student or create a new one.

    Lookup order:
      1. Match by student_id (the OCR-scanned number like '23-1234') — fastest
         and most reliable.  If a student with that ID already exists we reuse
         them and skip creation entirely.
      2. Fall back to a fuzzy first+last name match for cases where the
         student_id was not captured / is empty.
      3. Create a brand-new student record if neither lookup succeeds.
    """
    raw_sid = (student_data.get('student_id') or '').strip()

    # 1. Look up by student_id first (unique column)
    if raw_sid:
        existing = db.query(Student).filter(Student.student_id == raw_sid).first()
        if existing:
            return existing

    # 2. Fall back to name-based lookup
    existing = find_student_by_name(
        db,
        student_data.get('first_name', ''),
        student_data.get('last_name', ''),
    )
    if existing:
        return existing

    # 3. Build a proper StudentCreate schema so Pydantic validation passes
    schema = StudentCreate(
        student_id=raw_sid or None,
        first_name=student_data.get('first_name') or 'Unknown',
        middle_name=student_data.get('middle_name') or None,
        last_name=student_data.get('last_name') or 'Student',
        birthday=None,
        gender=None,
        address=student_data.get('address') or None,
        contact_number=None,
        email=None,
        year_level=student_data.get('year_level') or 1,
        course=student_data.get('course') or None,
        section=None,
        status=student_data.get('status') or 'Regular',
        major=student_data.get('major') or None,
    )
    return student_repo.create(db, schema)


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
    subject = find_or_create_subject(
        db,
        row['subject_code'],
        row.get('subject_name', ''),
        row.get('units'),
    )
    final_value = compute_final(row.get('midterm_grade'), row.get('final_grade'))
    semester    = row.get('semester') or 1
    school_year = row.get('school_year')

    # Upsert: if a grade already exists for this student + subject + semester,
    # overwrite it with the fresh data instead of inserting a duplicate.
    existing = db.query(Grade).filter(
        Grade.student_id  == student_id,
        Grade.subject_id  == subject.subject_id,
        Grade.semester    == semester,
        Grade.school_year == school_year,
    ).first()

    if existing:
        existing.midterm    = row.get('midterm_grade')
        existing.finals     = row.get('final_grade')
        existing.grade      = final_value if final_value is not None else 0.0
        existing.remarks    = remarks_for_grade(final_value)
        db.commit()
        db.refresh(existing)
        return existing

    entry = Grade(
        student_id  = student_id,
        subject_id  = subject.subject_id,
        semester    = semester,
        school_year = school_year,
        midterm     = row.get('midterm_grade'),
        finals      = row.get('final_grade'),
        grade       = final_value if final_value is not None else 0.0,
        remarks     = remarks_for_grade(final_value),
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


# ---------------------------------------------------------------------------
# Route handlers
# ---------------------------------------------------------------------------

@router.post('/appraisal')
def import_appraisal(
    file: UploadFile = File(...),
    commit: bool = False,
    db: Session = Depends(get_db),
):
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
        raise HTTPException(
            status_code=400,
            detail='No subject rows could be extracted from the uploaded PDF.',
        )

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
def import_grade_report(
    file: UploadFile = File(...),
    commit: bool = False,
    db: Session = Depends(get_db),
):
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
        raise HTTPException(
            status_code=400,
            detail='No student records detected in the grade report.',
        )

    result = {
        'metadata': {k: v for k, v in report_data.items() if k != 'students'},
        'rows': report_data['students'],
        'commit': commit,
        'created_grades': 0,
    }

    if commit:
        # Ensure the subject exists first
        subject = find_or_create_subject(
            db,
            report_data['subject_code'] or 'UNKNOWN',
            report_data['subject_description'],
            None,
        )
        
        sem, sy = parse_academic_period(report_data['academic_period'])

        for s in report_data['students']:
            # Use the unified parser to separate names correctly
            fn, mn, ln = parse_name_field(s['student_name'])
            
            student_payload = {
                'student_id': s['student_number'],
                'first_name': fn,
                'middle_name': mn,
                'last_name': ln,
                'course': s['course'],
                'status': s['enrollment_status'],
            }
            student_obj = create_or_find_student(db, student_payload)

            grade_row = {
                'subject_code': subject.subject_code,
                'midterm_grade': s['midterm_grade'],
                'final_grade': s['final_grade'],
                'semester': sem,
                'school_year': sy
            }
            create_grade_record(db, student_obj.student_id, grade_row)
            result['created_grades'] += 1

    return result

@router.post('/appraisal/commit')
def commit_appraisal(data: AppraisalCommitIn, db: Session = Depends(get_db)):
    """Saves edited appraisal data (student info and subjects) to the database."""
    student = create_or_find_student(db, data.student)
    count = 0
    for row in data.rows:
        # Handle both Pydantic v1 and v2
        row_dict = row.dict() if hasattr(row, 'dict') else row.model_dump()
        create_grade_record(db, student.student_id, row_dict)
        count += 1
    return {
        "status": "success",
        "created_student": student_to_dict(student),
        "created_grades": count
    }

@router.post('/grade-report/commit')
def commit_grade_report(data: GradeReportCommitIn, db: Session = Depends(get_db)):
    """Saves edited grade report data to the database."""
    subject = find_or_create_subject(
        db,
        data.metadata.subject_code or 'UNKNOWN',
        data.metadata.subject_description,
        None,
    )

    sem, sy = parse_academic_period(data.metadata.academic_period)

    count = 0
    for s in data.rows:
        # Use provided separate fields if UI sends them, else fallback to splitting student_name
        fn = s.first_name
        mn = s.middle_name
        ln = s.last_name
        if not fn and not ln:
            fn, mn, ln = parse_name_field(s.student_name)
            
        student_payload = {
            'student_id': s.student_number,
            'first_name': fn,
            'middle_name': mn,
            'last_name': ln,
            'course': s.course,
            'status': s.enrollment_status,
        }
        student_obj = create_or_find_student(db, student_payload)
        grade_row = {
            'subject_code': subject.subject_code,
            'midterm_grade': s.midterm_grade,
            'final_grade': s.final_grade,
            'semester': sem,
            'school_year': sy
        }
        create_grade_record(db, student_obj.student_id, grade_row)
        count += 1
    
    return {
        "status": "success",
        "created_grades": count
    }