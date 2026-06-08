from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import text, or_
import io, sqlalchemy
import os
import re
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from ..database.db import get_db
from ..models.students_model import Student
from ..models.subjects_model import Subject
from ..models.grade_model import Grade
from ..models.deficiencies_model import Deficiency
from ..models.import_log_model import ImportLog
from ..models.enrollment_model import Enrollment
from ..schemas.student_schema import StudentCreate
from ..repository import student_repo
from datetime import date, datetime

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
    year_level: Optional[int] = 1
    school_year: Optional[str] = ""
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
    remark: Optional[str] = None
    enrollment_status: str
    student_status: str

class GradeReportMetadata(BaseModel):
    subject_code: str
    subject_description: str
    instructor: str
    academic_period: str
    school_year: Optional[str] = ""
    semester: Optional[int] = 1
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


def extract_pdf_native_text(data: bytes) -> str:
    """Extract embedded text from a PDF using pypdfium2 (no OCR needed for text-based PDFs)."""
    document = pdfium.PdfDocument(io.BytesIO(data))
    pages: List[str] = []
    for page_index in range(len(document)):
        page = document.get_page(page_index)
        textpage = page.get_textpage()
        text = textpage.get_text_range()
        page.close()
        pages.append(text)
    return '\n'.join(pages)


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


def is_text_pdf(data: bytes) -> bool:
    """Return True if the PDF has embedded/selectable text (not just scanned images)."""
    try:
        text = extract_pdf_native_text(data)
        # Consider it a text PDF if we can extract at least 100 meaningful characters
        return len(text.strip()) > 100
    except Exception:
        return False


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
        last = parts[0].title()
        rest = parts[1] if len(parts) > 1 else ''
        tokens = rest.split()
        if len(tokens) > 1:
            first = ' '.join(tokens[:-1]).title()
            middle = tokens[-1].title()
        else:
            first = tokens[0].title() if tokens else ''
            middle = None
        return first, middle, last
    tokens = raw_name.split()
    if len(tokens) >= 2:
        if len(tokens) > 2:
            first = ' '.join(tokens[:-2]).title()
            middle = tokens[-2].title()
            last = tokens[-1].title()
        else:
            first = tokens[0].title()
            last = tokens[-1].title()
            middle = None
        return first, middle, last
    return raw_name.title(), None, raw_name.title()


def normalize_student_id(first: str, last: str) -> str:
    candidate = f'{last}{first}'.strip()
    candidate = re.sub(r'[^A-Za-z0-9]', '', candidate)
    return candidate.upper() or 'UNKNOWN'



# ---------------------------------------------------------------------------
# Course code normalization
# ---------------------------------------------------------------------------

# Maps shorthand course codes (upper-cased, stripped) to canonical full names
# used by the dashboard charts and student records.
_COURSE_NORM_MAP = {
    # 2-Year Technical Courses
    'ELECTRO':           'Two-Year Technical Course',
    'ELECTRONICS':       'Two-Year Technical Course',
    'ELECTRI':           'Two-Year Technical Course',
    'ELECTRICAL':        'Two-Year Technical Course',
    'AUTO':              'Two-Year Technical Course',
    'AUTOMOTIVE':        'Two-Year Technical Course',
    'AMAT':              'Two-Year Technical Course',  # Associate in Mechatronics

    # Bachelor of Science in Industrial Technology (BSIT variants)
    'BSIT':              'Bachelor of Science in Industrial Technology',
    'BSIT-ELECTRI':      'Bachelor of Science in Industrial Technology',
    'BSIT-ELECTRICAL':   'Bachelor of Science in Industrial Technology',
    'BSIT-ELECTRO':      'Bachelor of Science in Industrial Technology',
    'BSIT-ELECTRONICS':  'Bachelor of Science in Industrial Technology',
    'BSIT-AUTO':         'Bachelor of Science in Industrial Technology',
    'BSIT-AUTOMOTIVE':   'Bachelor of Science in Industrial Technology',

    # Bachelor of Science in Mechatronics and Automation Technology
    'BSMAT':             'Bachelor of Science in Mechatronics and Automation Technology',
    'BS MAT':            'Bachelor of Science in Mechatronics and Automation Technology',
    'BS-MAT':            'Bachelor of Science in Mechatronics and Automation Technology',
}

# Major mapping for shorthand codes (used to populate the major field)
_COURSE_MAJOR_MAP = {
    'ELECTRO':           'Electronics Technology',
    'ELECTRONICS':       'Electronics Technology',
    'BSIT-ELECTRO':      'Electronics Technology',
    'BSIT-ELECTRONICS':  'Electronics Technology',
    'ELECTRI':           'Electrical Technology',
    'ELECTRICAL':        'Electrical Technology',
    'BSIT-ELECTRI':      'Electrical Technology',
    'BSIT-ELECTRICAL':   'Electrical Technology',
    'AUTO':              'Automotive Technology',
    'AUTOMOTIVE':        'Automotive Technology',
    'BSIT-AUTO':         'Automotive Technology',
    'BSIT-AUTOMOTIVE':   'Automotive Technology',
    'AMAT':              'Associate in Mechatronics and Automation Technology',
}


def normalize_course(raw_course: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    """Normalize a raw course string from OCR/import into a canonical program name.

    Returns a (course, major) tuple.  If no normalization rule matches, the
    original value is returned unchanged (so manually-entered full names are
    preserved).
    """
    if not raw_course:
        return raw_course, None

    key = raw_course.strip().upper().replace(' ', '-')
    # Try exact match first, then try the base prefix (e.g. 'BSIT-ELECTRI-2' → 'BSIT-ELECTRI')
    full_name = _COURSE_NORM_MAP.get(key)
    if full_name is None:
        # Try progressively shorter prefixes for hyphenated codes
        parts = key.split('-')
        for end in range(len(parts), 0, -1):
            candidate = '-'.join(parts[:end])
            if candidate in _COURSE_NORM_MAP:
                full_name = _COURSE_NORM_MAP[candidate]
                key = candidate
                break

    if full_name:
        major = _COURSE_MAJOR_MAP.get(key)
        return full_name, major

    # Not a known shorthand — return original to preserve manually-entered full names
    return raw_course, None


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
            return re.split(r'\s+(Home Address|Major|Course|College|Instructor|Subject|Period|Date|Campus|Description|Generated|Descriptive|Remarks|Class|Section|Institution|University)', value, flags=re.IGNORECASE)[0].strip()
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
    
    # Pre-parse period to fill school_year and semester fields for the UI
    p_sem, p_sy = parse_academic_period(data['academic_period'])
    data['school_year'] = p_sy or ""
    data['semester'] = p_sem or 1

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
        student_status = 'Regular'
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
            'student_status': student_status,
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

# ---------------------------------------------------------------------------
# UNP Appraisal-specific extraction helpers
# ---------------------------------------------------------------------------

# Maps ordinal words to year numbers
_YEAR_ORDINAL = {'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5}
# Maps semester labels to integers
_SEM_MAP = {'first': 1, '1st': 1, 'second': 2, '2nd': 2, 'summer': 3}

# Section header pattern
_SECTION_HEADER = re.compile(
    r'(First|Second|Third|Fourth|Fifth)\s+Year\s*[-\u2013\u2014\s:]+\s*(First|Second|Summer|3rd)\s+Semester',
    re.IGNORECASE,
)

def _match_subject_line(line: str):
    """Try both subject-line patterns; return the first match or None."""
    m = _SUBJECT_WITH_GRADES_NUMBERED.match(line)
    if m:
        return m
    return _SUBJECT_WITH_GRADES_PLAIN.match(line)


def _normalize_units(raw: str) -> int:
    """Convert units string (e.g. '(3)' or '6') to integer."""
    cleaned = re.sub(r'[^\d]', '', raw)
    return int(cleaned) if cleaned else 3


def preprocess_appraisal_text(raw: str) -> List[str]:
    text = raw.replace('\r\r\n', '\n').replace('\r\n', '\n').replace('\r', '\n')
    return [line.strip() for line in text.splitlines() if line.strip()]

def _parse_appraisal_chunk(lines: List[str], current_year: int, current_sem: int) -> Optional[dict]:
    """Parses a list of lines representing a single subject entry."""
    full_text = " ".join(lines)
    
    # 1. Identify Subject Code (Anchored by letters followed by numbers, or specific plain codes)
    # We use re.search because noise like student names might precede the code on the same line.
    code_pattern = re.compile(r'\b([A-Za-z]{2,}(?:\s+[A-Za-z0-9]+)?\s+\d+|ETHICS|RIZAL|STS|OJT|PCOM|PATHFIT|NSTP\s*\d|GE\s+[A-Z0-9]+)\b', re.IGNORECASE)
    m_code = code_pattern.search(full_text)
    if not m_code:
        return None
    
    subject_code = m_code.group(1).upper().strip()
    # Text after the subject code contains the title, units, grades, and instructor
    remaining_text = full_text[m_code.end():].strip()

    # 2. Extract Numbers (Units, Midterm, Final)
    # Look for tokens that are grades (1.0-5.0) or units (integers)
    # We exclude the code from this search by using the remaining_text
    num_pattern = re.compile(r'\b(\d+(?:\.\d+)?|INC)\b', re.IGNORECASE)
    tokens = [t.group(1) for t in num_pattern.finditer(remaining_text)]
    
    if len(tokens) < 1:
        return None # No grades found

    # Vertical layout adjustment: 
    # Sometimes the semester digit (1 or 2) appears as the first number.
    # If we have 4+ numbers and the first is 1 or 2, and the second is a likely unit (e.g. 3, 6), 
    # we shift the mapping to skip the semester digit.
    offset = 0
    if len(tokens) >= 3 and tokens[0] in ('1', '2') and tokens[1] in ('1', '2', '3', '6', '12'):
        # Likely: [Semester, Units, Grade, ...]
        offset = 1

    units = 3
    mid = None
    fin = None

    relevant_tokens = tokens[offset:]
    if len(relevant_tokens) >= 3:
        units = _normalize_units(relevant_tokens[0])
        mid = parse_grade_token(relevant_tokens[1])
        fin = parse_grade_token(relevant_tokens[2])
    elif len(relevant_tokens) == 2:
        mid = parse_grade_token(relevant_tokens[0])
        fin = parse_grade_token(relevant_tokens[1])
    elif len(relevant_tokens) == 1:
        fin = parse_grade_token(relevant_tokens[0])

    # 3. Description & Instructor
    # Description is between the Code and the first Grade/Unit token
    first_num_match = num_pattern.search(remaining_text)
    subject_name = remaining_text[:first_num_match.start()].strip() if first_num_match else remaining_text
    
    # Instructor is after the last Grade token
    last_num_match = list(num_pattern.finditer(remaining_text))[-1]
    instructor_raw = remaining_text[last_num_match.end():].strip()
    # Clean instructor from noise like "st sem"
    instructor = re.sub(r'^(?:st|nd|rd|th)?\s*sem(?:ester)?\s*', '', instructor_raw, flags=re.IGNORECASE).strip()
    # Truncate at known "stop" keywords that signal the end of a subject row or start of metadata
    instructor = re.split(r'\b(TOTAL|Adviser|Republic|University|College|Tamag|Ilocos|Bachelor|Major|Name|Home)\b', instructor, flags=re.IGNORECASE)[0].strip()
    if instructor == "—": instructor = ""

    return {
        'subject_code': subject_code,
        'subject_name': subject_name or subject_code,
        'units': units,
        'midterm_grade': mid,
        'final_grade': fin,
        'semester': current_sem,
        'year_level': current_year,
        'school_year': '',
        'instructor': instructor
    }


def extract_student_info_from_appraisal(text: str) -> dict:
    """
    Extract student information from the UNP Curriculum Appraisal native text.
    The header block looks like:
        Name: April Anne Cabanilla  Home Address: Rivadavia Narvacan Ilocos Sur
        Major: Electronics Technology
        BACHELOR OF SCIENCE IN INDUSTRIAL TECHNOLOGY
    """
    # Name field – may be followed by 'Home Address' on the same line
    name_match = re.search(r'Name\s*:\s*([^\n]+)', text, re.IGNORECASE)
    raw_name = ''
    raw_address = ''
    if name_match:
        name_line = name_match.group(1).strip()
        # Split off 'Home Address:' portion if on the same line
        addr_split = re.split(r'Home\s+Address\s*:', name_line, flags=re.IGNORECASE)
        raw_name = addr_split[0].strip()
        if len(addr_split) > 1:
            raw_address = addr_split[1].strip()

    # Home Address on its own line if not found above
    if not raw_address:
        addr_match = re.search(r'Home\s+Address\s*:\s*([^\n]+)', text, re.IGNORECASE)
        if addr_match:
            raw_address = addr_match.group(1).strip()

    # Major
    major_match = re.search(r'Major\s*:\s*([^\n]+)', text, re.IGNORECASE)
    raw_major = major_match.group(1).strip() if major_match else ''

    # Course – look for "BACHELOR OF ..." or "BS ..." line
    course_match = re.search(
        r'(BACHELOR\s+OF\s+[A-Z ]+|BS[A-Z ]+|AB\s+[A-Z ]+)',
        text, re.IGNORECASE
    )
    raw_course = course_match.group(1).strip() if course_match else raw_major

    first_name, middle_name, last_name = parse_name_field(raw_name)
    
    # Extract student ID (format like 20-00000) if present in the text, else None
    id_match = re.search(r'\b(\d{2}-\d{5})\b', text)
    student_id = id_match.group(1) if id_match else "-"

    return {
        'student_id': student_id,
        'first_name': first_name or 'Unknown',
        'middle_name': middle_name,
        'last_name': last_name or 'Student',
        'address': raw_address or None,
        'course': raw_course or raw_major or None,
        'major': raw_major or None,
        'status': 'Regular',
    }


def extract_subject_rows_from_appraisal(text: str) -> List[dict]:
    """
    Parse the subject table rows from a UNP Curriculum Appraisal document.

    The document is divided into sections like:
        First Year - First Semester 
        ... 
        Second Year - Second Semester
        ...

    Within each section, lines either have grades (midterm + final are present)
    or are curriculum-only (no grades entered yet).

    We return *only* the rows that actually have grade data so the import is
    meaningful; curriculum rows without grades are skipped.
    """
    processed_lines = preprocess_appraisal_text(text)

    # Skip header / table-header noise lines
    _SKIP = re.compile(
        r'^(Subject|Code|Descriptive\s+Title|Units|Rating|Semester|Instructor|'
        r'Mid.?Term|Final|TOTAL|Adviser|Republic|University|Tamag|Ilocos|'
        r'College|Bachelor|Ladder|\d{4})',
        re.IGNORECASE,
    )
    
    # Subject code anchor to split chunks
    code_start_pattern = re.compile(r'\b(?:[A-Za-z]{2,}(?:\s+[A-Za-z0-9]+)?\s+\d+|ETHICS|RIZAL|STS|OJT|PCOM|PATHFIT)\b', re.IGNORECASE)

    rows: List[dict] = []
    current_sem = 1
    current_year = 1
    
    # Partition lines into chunks by subject start or section header
    chunks: List[List[str]] = []
    current_chunk: List[str] = []
    
    for line in processed_lines:
        sec_match = _SECTION_HEADER.search(line)
        is_new_subj = code_start_pattern.search(line) and not _SKIP.search(line)
        
        if sec_match or is_new_subj:
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = [line]
        else:
            current_chunk.append(line)
    if current_chunk:
        chunks.append(current_chunk)

    # Process chunks
    for chunk in chunks:
        first_line = chunk[0]
        sec_match = _SECTION_HEADER.search(first_line)
        if sec_match:
            current_year = _YEAR_ORDINAL.get(sec_match.group(1).lower(), 1)
            sem_word = sec_match.group(2).lower()
            current_sem = 1 if 'first' in sem_word or '1st' in sem_word else 2 if 'second' in sem_word or '2nd' in sem_word else 3
            # If there's subject data in the same chunk as header, parse it too
            if len(chunk) > 1 and code_start_pattern.search(" ".join(chunk[1:])):
                data = _parse_appraisal_chunk(chunk[1:], current_year, current_sem)
                if data: rows.append(data)
        else:
            data = _parse_appraisal_chunk(chunk, current_year, current_sem)
            if data: rows.append(data)

    return rows


def extract_student_info(text: str) -> dict:
    """Legacy OCR-text compatible student info extractor."""
    student_name = find_field(text, 'Name')
    student_address = find_field(text, 'Home Address')
    student_major = find_field(text, 'Major') or find_field(text, 'Course')

    first_name, middle_name, last_name = parse_name_field(student_name or '')
    
    # Extract student ID (format like 20-00000) if present in the text, else None
    id_match = re.search(r'\b(\d{2}-\d{5})\b', text)
    student_id = id_match.group(1) if id_match else "-"

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
    if 'summer' in token or '3rd' in token or token.strip() == '3':
        return 3
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
            'school_year': '',
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
                'school_year': '',
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
        'school_year': '',
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
        
    # Do not attempt to match on generic placeholder names to avoid accidental merges
    if first_name.lower() in ('unknown', 'student') or last_name.lower() in ('unknown', 'student'):
        return None
        
    # Ignore extremely short names which are likely OCR noise
    if len(first_name) < 2 or len(last_name) < 2:
        return None

    return db.query(Student).filter(
        Student.first_name.ilike(first_name),
        Student.last_name.ilike(last_name),
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
    if raw_sid == '-':
        raw_sid = ''

    # Sanitization: Ensure student status is 'Regular' or 'Irregular', never 'Active'.
    # 'Active' is an enrollment state, so we default it to 'Regular' for the student category.
    incoming_status = student_data.get('status')
    if incoming_status == 'Active' or not incoming_status:
        incoming_status = 'Regular'

    # 1. Look up by student_id first (unique column)
    if raw_sid:
        existing = db.query(Student).filter(Student.student_id == raw_sid).first()
        if existing:
            # Sync status if it is currently 'Active' (legacy) or if provided by import
            if existing.status == 'Active' or existing.status != incoming_status:
                existing.status = incoming_status
                db.commit()
                db.refresh(existing)
            return existing

    # 2. Fall back to name-based lookup
    existing = find_student_by_name(
        db,
        student_data.get('first_name', ''),
        student_data.get('last_name', ''),
    )
    if existing:
        if existing.status == 'Active' or existing.status != incoming_status:
            existing.status = incoming_status
            db.commit()
            db.refresh(existing)
        return existing

    import uuid
    generated_sid = raw_sid if raw_sid else f"TMP-{uuid.uuid4().hex[:8].upper()}"

    # 3. Build a proper StudentCreate schema so Pydantic validation passes
    schema = StudentCreate(
        student_id=generated_sid,
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
        status=incoming_status,
        major=student_data.get('major') or None,
    )
    return student_repo.create(db, schema)


def find_or_create_subject(db: Session, subject_code: str, subject_name: Optional[str], units: Optional[int]) -> Subject:
    code = subject_code.strip().upper()
    if not code:
        raise ValueError('Subject code is required')
    subject = db.query(Subject).filter(Subject.subject_code == code).first()
    
    if subject:
        # Update existing subject name if the provided one is more descriptive
        if subject_name and subject_name.strip():
            candidate_name = subject_name.strip()
            existing_name = (subject.subject_name or "").strip()            
            
            # Update if current name is empty OR is identical to the code 
            # AND the new candidate name is actually a real description (not just the code again)
            if (not existing_name or existing_name.upper() == code) and candidate_name.upper() != code:
                subject.subject_name = candidate_name
                db.commit()
        return subject

    # Creation path: Only fallback to code if subject_name is None or empty string
    final_name = subject_name if (subject_name and subject_name.strip()) else code
    subject = Subject(subject_code=code, subject_name=final_name, unit=units or 3)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


def sync_deficiency_from_grade(db: Session, student_id: str, subject_id: int, semester: int, remarks: str, school_year: str = None):
    remarks_upper = (remarks or "").upper()
    is_deficiency = False
    def_type = "Other"

    if "FAIL" in remarks_upper or remarks_upper == "5.0" or remarks_upper == "5":
        is_deficiency = True
        def_type = "Failed"
    elif "INC" in remarks_upper:
        is_deficiency = True
        def_type = "Incomplete"
    elif "UD" in remarks_upper or "UNOFFICIALLY" in remarks_upper:
        is_deficiency = True
        def_type = "Unofficially Dropped"
    elif "DROP" in remarks_upper:
        is_deficiency = True
        def_type = "Dropped"

    if is_deficiency:
        existing = db.query(Deficiency).filter(
            Deficiency.student_id == student_id,
            Deficiency.subject_id == subject_id,
        ).first()

        if not existing:
            new_defic = Deficiency(
                student_id=student_id,
                subject_id=subject_id,
                type=def_type,
                status="pending",
                semester=str(semester),
                school_year=school_year,
                remarks=f"Auto-detected from grade remark: {remarks}",
                date_recorded=str(date.today())
            )
            db.add(new_defic)
            db.commit()
        elif existing.status == "resolved":
            existing.status = "pending"
            existing.type = def_type
            existing.remarks = f"Auto-detected from grade remark: {remarks}"
            db.commit()


def create_grade_record(db: Session, student_id: str, row: dict) -> Grade:
    subject = find_or_create_subject(
        db,
        row['subject_code'],
        row.get('subject_name'), # Pass None if missing to avoid triggering code-fallback updates
        row.get('units'),
    )
    final_value = compute_final(row.get('midterm_grade'), row.get('final_grade'))
    semester    = row.get('semester') or 1
    school_year = row.get('school_year')
    
    # Use explicit remark if provided (like "UD", "Dropped"), else compute from grade
    explicit_remark = row.get('remark')
    final_remark = explicit_remark if explicit_remark else remarks_for_grade(final_value)

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
        existing.remarks    = final_remark
        existing.instructor = row.get('instructor')
        db.commit()
        db.refresh(existing)
        sync_deficiency_from_grade(db, student_id, subject.subject_id, semester, final_remark, school_year)
        return existing

    entry = Grade(
        student_id  = student_id,
        subject_id  = subject.subject_id,
        semester    = semester,
        school_year = school_year,
        midterm     = row.get('midterm_grade'),
        finals      = row.get('final_grade'),
        grade       = final_value if final_value is not None else 0.0,
        remarks     = final_remark,
        instructor  = row.get('instructor'),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    sync_deficiency_from_grade(db, student_id, subject.subject_id, semester, final_remark, school_year)
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
        data_bytes = file.file.read()
    except Exception as exc:
        raise HTTPException(status_code=400, detail='Failed to read uploaded file') from exc

    filename = (file.filename or '').lower()
    is_image = filename.endswith(('.jpg', '.jpeg', '.png', '.bmp', '.tiff'))
    is_pdf   = filename.endswith('.pdf') or (not is_image)

    extracted_text = ''
    used_native = False

    if is_image:
        # ── Image path: always OCR ──────────────────────────────────────────
        try:
            ensure_ocr_environment()
        except RuntimeError as exc:
            raise HTTPException(status_code=500, detail=str(exc))
        try:
            extracted_text = ocr_image_bytes(data_bytes)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f'Image OCR failed: {exc}') from exc
    else:
        # ── PDF path: native text first, OCR fallback ───────────────────────
        if pdfium is None:
            raise HTTPException(status_code=500, detail='Missing dependency: pypdfium2')
        try:
            native_text = extract_pdf_native_text(data_bytes)
            if len(native_text.strip()) > 100:
                extracted_text = native_text
                used_native = True
        except Exception:
            pass

        if not used_native:
            try:
                ensure_ocr_environment()
            except RuntimeError as exc:
                raise HTTPException(status_code=500, detail=str(exc))
            try:
                extracted_text = ocr_pdf_bytes(data_bytes)
            except Exception as exc:
                raise HTTPException(status_code=500, detail=f'PDF processing failed: {exc}') from exc

    # --- Extract student info and subject rows ---
    if used_native:
        student_info = extract_student_info_from_appraisal(extracted_text)
        subject_rows = extract_subject_rows_from_appraisal(extracted_text)
    else:
        student_info = extract_student_info(extracted_text)
        subject_rows = extract_subject_rows(extracted_text)

    if not subject_rows:
        raise HTTPException(
            status_code=400,
            detail=(
                'No graded subject rows could be extracted from the uploaded PDF. '
                'Make sure the document contains subjects with Midterm and Final grade entries.'
            ),
        )

    result = {
        'student': student_info,
        'rows': subject_rows,
        'commit': commit,
        'created_student': None,
        'created_grades': 0,
    }

    if commit:
        # Appraisal subjects must have a school year provided manually.
        # Since it's not in the PDF, automatic commit is not allowed.
        # The user must use the preview -> edit -> commit flow.
        raise HTTPException(
            status_code=400,
            detail="Automatic commit is not supported for Appraisals because School Year is required and must be added manually in the preview table."
        )
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
    data_bytes = file.file.read()
    filename = (file.filename or '').lower()

    is_image = filename.endswith(('.jpg', '.jpeg', '.png', '.bmp', '.tiff'))
    is_pdf   = filename.endswith('.pdf') or (not is_image)

    extracted_text = ''
    used_native = False

    if is_image:
        # ── Image path: always OCR ──────────────────────────────────────────
        try:
            ensure_ocr_environment()
        except RuntimeError as exc:
            raise HTTPException(status_code=500, detail=str(exc))
        try:
            extracted_text = ocr_image_bytes(data_bytes)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f'Image OCR failed: {exc}') from exc
    elif is_pdf:
        # ── PDF path: native text first, OCR fallback ───────────────────────
        if pdfium is None:
            raise HTTPException(status_code=500, detail='Missing dependency: pypdfium2')
        try:
            native_text = extract_pdf_native_text(data_bytes)
            if len(native_text.strip()) > 100:
                extracted_text = native_text
                used_native = True
        except Exception:
            pass

        if not used_native:
            try:
                ensure_ocr_environment()
            except RuntimeError as exc:
                raise HTTPException(status_code=500, detail=str(exc))
            try:
                extracted_text = ocr_pdf_bytes(data_bytes)
            except Exception as exc:
                raise HTTPException(status_code=500, detail=f'PDF processing failed: {exc}') from exc
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
            
            norm_course, norm_major = normalize_course(s.get('course'))
            student_payload = {
                'student_id': s['student_number'],
                'first_name': fn,
                'middle_name': mn,
                'last_name': ln,
                'course': norm_course,
                'major': norm_major,
                'status': s.get('student_status', 'Regular'),
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

    s = data.student
    # ── Field Validation ─────────────────────────────────────────────────────
    missing_fields = []
    if not s.get('first_name') or not s.get('last_name'): missing_fields.append("Student Name")
    if not s.get('course'): missing_fields.append("Course")

    if not data.rows:
        missing_fields.append("Subject List (cannot be empty)")
    else:
        for i, row in enumerate(data.rows):
            if not row.school_year or not str(row.school_year).strip():
                missing_fields.append(f"Row {i+1} School Year")

    if missing_fields:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot save Appraisal. Please fill in all missing fields: {', '.join(missing_fields)}"
        )

    student = create_or_find_student(db, data.student)
    count = 0
    for row in data.rows:
        row_dict = row.dict() if hasattr(row, 'dict') else row.model_dump()
        create_grade_record(db, student.student_id, row_dict)
        count += 1
        
    log = ImportLog(
        type='Appraisal',
        filename=f"Appraisal - {student.last_name}",
        imported_at=datetime.now().isoformat(),
        records_created=count,
        status='Success'
    )
    db.add(log)
    db.commit()
    
    return {
        "status": "success",
        "created_student": student_to_dict(student),
        "created_grades": count
    }

@router.post('/grade-report/commit')
def commit_grade_report(data: GradeReportCommitIn, db: Session = Depends(get_db)):
    """Saves edited grade report data to the database."""

    # ── Field Validation ─────────────────────────────────────────────────────
    # Ensure all required metadata and student information is present before saving.
    missing_fields = []
    m = data.metadata
    if not m.subject_code or not m.subject_code.strip(): missing_fields.append("Subject Code")
    if not m.instructor or not m.instructor.strip(): missing_fields.append("Instructor")
    if not m.school_year or not m.school_year.strip(): missing_fields.append("School Year")
    if m.semester is None: missing_fields.append("Semester")

    if not data.rows:
        missing_fields.append("Student Records (cannot be empty)")
    else:
        for i, row in enumerate(data.rows):
            if not row.student_number or not row.student_number.strip():
                missing_fields.append(f"Row {i+1} Student ID")
            if not row.student_name or not row.student_name.strip():
                missing_fields.append(f"Row {i+1} Student Name")

    if missing_fields:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot save Grade Report. Please fill in all missing fields: {', '.join(missing_fields)}"
        )

    subject = find_or_create_subject(
        db,
        m.subject_code or 'UNKNOWN',
        m.subject_description,
        None,
    )

    sem = m.semester or 1
    sy = m.school_year

    count = 0
    for s in data.rows:
        # Always re-parse from student_name which is in 'LASTNAME, FIRSTNAME MIDDLENAME' format.
        # This ensures consistent name storage regardless of any pre-split values sent by the frontend.
        fn, mn, ln = parse_name_field(s.student_name)
            
        norm_course, norm_major = normalize_course(s.course)
        student_payload = {
            'student_id': s.student_number,
            'first_name': fn,
            'middle_name': mn,
            'last_name': ln,
            'course': norm_course,
            'major': norm_major,
            'status': s.student_status,
        }
        student_obj = create_or_find_student(db, student_payload)
        grade_row = {
            'subject_code': subject.subject_code,
            'midterm_grade': s.midterm_grade,
            'final_grade': s.final_grade,
            'remark': s.remark,
            'semester': sem,
            'school_year': sy,
            'instructor': data.metadata.instructor
        }
        create_grade_record(db, student_obj.student_id, grade_row)
        count += 1
        
    log = ImportLog(
        type='Grade Report',
        filename=f"Grade Report - {subject.subject_code}",
        imported_at=datetime.now().isoformat(),
        records_created=count,
        status='Success'
    )
    db.add(log)
    db.commit()
    
    return {
        "status": "success",
        "created_grades": count
    }

@router.get('/logs')
def get_import_logs(db: Session = Depends(get_db)):
    logs = db.query(ImportLog).order_by(ImportLog.imported_at.desc()).limit(50).all()
    return logs

@router.post('/promote-students')
def promote_students(db: Session = Depends(get_db)):
    """
    Bulk promotes students to the next year level.
    Students who reach the end of their course duration (1, 2, or 4 years)
    are automatically marked as 'Graduated'.
    """
    # We only process students who haven't graduated yet
    students = db.query(Student).filter(Student.status != 'Graduated').all()
    promoted_count = 0
    graduated_count = 0

    for s in students:
        course_name = (s.course or "").upper()
        # Logic to determine course duration based on the canonical names
        if "ONE-YEAR" in course_name:
            max_years = 1
        elif "TWO-YEAR" in course_name or "ASSOCIATE" in course_name or "AMAT" in course_name:
            max_years = 2
        else:
            # Default to 4 years for Bachelor / BS programs
            max_years = 4
            
        if s.year_level < max_years:
            s.year_level += 1
            promoted_count += 1
        else:
            s.status = 'Graduated'
            graduated_count += 1
            
    db.commit()
    return {
        "status": "success",
        "message": f"Promotion complete: {promoted_count} students promoted, {graduated_count} marked as graduated.",
        "data": {
            "promoted": promoted_count,
            "graduated": graduated_count
        }
    }


# ─────────────────────────────────────────────────────────────────────────────
# COR (Certificate of Registration) IMPORT
# ─────────────────────────────────────────────────────────────────────────────

def _extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    """Extract text from PDF or image file."""
    ext = filename.lower().rsplit('.', 1)[-1] if '.' in filename else ''
    if ext == 'pdf':
        try:
            doc = pdfium.PdfDocument(file_bytes)
            pages_text = []
            for i in range(len(doc)):
                page = doc[i]
                tp = page.get_textpage()
                text = tp.get_text_range()
                if text.strip():
                    pages_text.append(text)
                else:
                    # Fallback: render page to image for OCR
                    if Image and pytesseract and is_tesseract_available():
                        bitmap = page.render(scale=2.0)
                        pil_img = bitmap.to_pil()
                        text = pytesseract.image_to_string(pil_img)
                        pages_text.append(text)
            return '\n'.join(pages_text)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f'PDF extraction failed: {e}')
    elif ext in ('jpg', 'jpeg', 'png', 'bmp', 'tiff', 'tif', 'webp'):
        if not Image or not pytesseract or not is_tesseract_available():
            raise HTTPException(status_code=400, detail='OCR not available')
        img = Image.open(io.BytesIO(file_bytes))
        return pytesseract.image_to_string(img)
    else:
        raise HTTPException(status_code=400, detail=f'Unsupported file type: {ext}')


def _parse_cor_text(text: str) -> dict:
    """Parse extracted COR text into structured data."""
    lines = [line.strip() for line in text.replace('\r', '').split('\n') if line.strip()]
    result = {
        'student': {
            'status': 'Regular'
        },
        'subjects': []
    }

    # ── Student header ──────────────────────────────────────────────────────
    # Name: CABANILLA, APRIL ANNE Period: 2nd Term 2025-2026
    # ID No: 23-00751 Course/Yr: BS COMSCI 3 Date: ...
    for line in lines[:8]:
        # Name
        nm = re.search(r'Name[:\s]+([A-Za-z\s,.\-]+?)(?:\s{2,}|Period:|$)', line, re.IGNORECASE)
        if nm and 'student_name' not in result['student']:
            result['student']['student_name'] = nm.group(1).strip()

        # Period / semester / school year
        period_m = re.search(r'Period[:\s]+([1-9][a-z]*)\s*(?:Term|Semester|Sem)\s*([\d]{4}-[\d]{4})', line, re.IGNORECASE)
        if period_m:
            sem_word = period_m.group(1).lower()
            sem_map = {'1st': 1, '1': 1, 'first': 1, '2nd': 2, '2': 2, 'second': 2, '3rd': 3, '3': 3, 'third': 3, 'summer': 3}
            result['student']['semester'] = sem_map.get(sem_word, 1)
            result['student']['school_year'] = period_m.group(2)

        # ID No
        id_m = re.search(r'ID\s*No[:\s]+([\d\-]+)', line, re.IGNORECASE)
        if id_m:
            result['student']['student_id'] = id_m.group(1).strip()

        # Course/Yr — e.g. "BS COMSCI 3" or "BSIT 2"
        course_m = re.search(r'Course[/\s]*Yr[:\s]+([A-Z\s0-9]+?)(?:\s{2,}|Date:|$)', line, re.IGNORECASE)
        if course_m:
            raw = course_m.group(1).strip()
            yr_m = re.search(r'\s*(\d)$', raw)
            extracted_course = raw
            if yr_m:
                result['student']['year_level'] = int(yr_m.group(1))
                extracted_course = raw[:yr_m.start()].strip()
            else:
                extracted_course = raw
            
            # Auto-detect and normalize program names (e.g. ELECTRO -> Two-Year Technical Course)
            norm_c, norm_m = normalize_course(extracted_course)
            result['student']['course'] = norm_c
            result['student']['major'] = norm_m

    # ── Subject rows ─────────────────────────────────────────────────────────
    # Pattern: starts with M<digits> or similar code, then subject code
    # e.g.: M40 CSP110 Software Engineering 2 3.0 3.0 3.0 0.0 ... C. Reotutar
    in_subjects = False
    for line in lines:
        # Detect header line
        if re.search(r'Code\s+Subject Code\s+Subject Description', line, re.IGNORECASE):
            in_subjects = True
            continue
        if in_subjects:
            # Stop at totals
            if re.search(r'^Total Units', line, re.IGNORECASE):
                break
            # Match subject row: optional leading code, subject code, description, numbers, instructor
            # Try matching: <sched_code?> <SUBJ_CODE> <Description> <float> ... <Instructor>
            m = re.match(
                r'^(?:[A-Z]\d+\s+)?([A-Z]{2,}[A-Z0-9\-]+(?:\-[A-Z0-9]+)?)\s+'
                r'(.+?)\s+'
                r'(\d+\.\d+)\s+\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+'
                r'\s+(.+?)\s+([A-Z][a-zA-Z\.\s]+)$',
                line
            )
            if not m:
                # Simpler fallback: SUBJ_CODE description units instructor
                m2 = re.match(
                    r'^(?:[A-Z]\d+\s+)?([A-Z]{2,}[A-Z0-9\-]+(?:\-[A-Z0-9]+)?)\s+'
                    r'(.+?)\s+(\d+\.\d+)(?:\s+.+?)?\s+([A-Z][a-zA-Z\.\s]+)$',
                    line
                )
                if m2:
                    result['subjects'].append({
                        'subject_code': m2.group(1).strip(),
                        'subject_name': m2.group(2).strip(),
                        'units': float(m2.group(3)),
                        'instructor': m2.group(4).strip(),
                        'schedule': ''
                    })
                continue
            # Full match
            # Schedule + instructor are mixed; extract instructor as last token(s)
            schedule_and_instr = m.group(4).strip() + ' ' + m.group(5).strip()
            # Instructor is typically the last 1-3 words that look like a name
            instr_m = re.search(r'([A-Z][a-zA-Z\.\s]{2,30})$', schedule_and_instr)
            instructor = instr_m.group(1).strip() if instr_m else ''

            result['subjects'].append({
                'subject_code': m.group(1).strip(),
                'subject_name': m.group(2).strip(),
                'units': float(m.group(3)),
                'instructor': instructor,
                'schedule': ''
            })

    return result


@router.post('/cor/preview')
async def preview_cor(file: UploadFile = File(...)):
    """Upload a COR file and return parsed preview data."""
    content = await file.read()
    text = _extract_text_from_file(content, file.filename)
    parsed = _parse_cor_text(text)
    if not parsed['student'].get('student_name') and not parsed['student'].get('student_id'):
        raise HTTPException(status_code=422, detail='Could not extract student information from the document.')
    
    # Parse the student name into first, middle, last for the preview
    raw_name = parsed['student'].get('student_name') or ''
    if raw_name:
        first, middle, last = parse_name_field(raw_name)
        parsed['student']['first_name'] = first
        parsed['student']['middle_name'] = middle or ''
        parsed['student']['last_name'] = last
        
    return {
        'filename': file.filename,
        'student': parsed['student'],
        'subjects': parsed['subjects'],
        'raw_text': text[:800]  # for debug preview
    }


class CORSubjectRow(BaseModel):
    subject_code: str
    subject_name: Optional[str] = None
    units: Optional[float] = None
    instructor: Optional[str] = None
    schedule: Optional[str] = None

class CORStudentInfo(BaseModel):
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    course: Optional[str] = None
    major: Optional[str] = None
    year_level: Optional[int] = None
    semester: Optional[int] = None
    school_year: Optional[str] = None
    status: Optional[str] = 'Regular'

class CORCommitIn(BaseModel):
    student: CORStudentInfo
    subjects: List[CORSubjectRow]


@router.post('/cor/commit')
def commit_cor(data: CORCommitIn, db: Session = Depends(get_db)):
    """Persist COR data: update/create student, upsert subjects, create enrollment records."""
    s = data.student

    # ── Field Validation ─────────────────────────────────────────────────────
    # Ensure all required student and subject information is present before saving.
    missing_fields = []
    if not s.student_id or not s.student_id.strip(): missing_fields.append("Student ID")
    if not s.student_name and not (s.first_name and s.last_name): missing_fields.append("Student Name")
    if not s.course or not s.course.strip(): missing_fields.append("Course")
    if s.year_level is None: missing_fields.append("Year Level")
    if s.semester is None: missing_fields.append("Semester")
    if not s.school_year or not s.school_year.strip(): missing_fields.append("School Year")
    
    if not data.subjects:
        missing_fields.append("Subject List (cannot be empty)")
    else:
        for i, subj in enumerate(data.subjects):
            if not subj.subject_code or not subj.subject_code.strip(): 
                missing_fields.append(f"Row {i+1} Subject Code")
            if not subj.subject_name or not subj.subject_name.strip(): 
                missing_fields.append(f"Row {i+1} Subject Title")
            if subj.units is None: 
                missing_fields.append(f"Row {i+1} Units")
            if not subj.instructor or not subj.instructor.strip():
                missing_fields.append(f"Row {i+1} Instructor")

    if missing_fields:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot save COR. Please fill in all missing fields: {', '.join(missing_fields)}"
        )

    semester = s.semester or 1
    school_year = s.school_year
    today = date.today().isoformat()
    
    # Normalize the course and major again in case of manual edits in the frontend
    norm_course, norm_major = normalize_course(s.course)
    # Favor a derived major from the course string, fallback to an explicitly provided major
    final_major = norm_major or s.major

    # ── Resolve student ──────────────────────────────────────────────────────
    student_obj = None
    target_sid = (s.student_id or '').strip()
    # Ignore placeholder characters commonly produced by OCR errors
    if target_sid == '-':
        target_sid = ''

    if target_sid:
        student_obj = db.query(Student).filter(Student.student_id == target_sid).first()

    if not student_obj:
        # Prioritize specific name fields if provided, fallback to parsing the raw name string
        fn = (s.first_name or '').strip()
        ln = (s.last_name or '').strip()
        if not fn and not ln:
            fn, _mn, ln = parse_name_field(s.student_name or '')
        
        # Only attempt name matching if the names aren't generic placeholders
        if fn and ln and fn.lower() != 'unknown' and ln.lower() != 'student':
            student_obj = find_student_by_name(db, fn, ln)

    if not student_obj:
        if s.first_name or s.last_name:
            first = s.first_name or ''
            middle = s.middle_name or None
            last = s.last_name or ''
        else:
            # Parse name using the unified parse_name_field function
            first, middle, last = parse_name_field(s.student_name or '')

        # Use sanitized ID or generate a unique temporary one to avoid conflicts
        import uuid
        final_sid = target_sid if target_sid else f"TMP-{uuid.uuid4().hex[:8].upper()}"

        from ..schemas.student_schema import StudentCreate as SC
        schema = SC(
            first_name=first or 'Unknown',
            last_name=last or 'Unknown',
            middle_name=middle,
            student_id=final_sid,
            course=norm_course,
            major=final_major,
            year_level=s.year_level,
            status=s.status or 'Regular'
        )
        student_obj = student_repo.create(db, schema)
    else:
        # Handle student_id change with manual record synchronization.
        # This is required for SQLite databases where ON UPDATE CASCADE isn't in the schema.
        new_sid = s.student_id.strip() if (s.student_id and s.student_id.strip()) else None
        old_sid = student_obj.student_id

        if new_sid and old_sid != new_sid:
            # Temporarily disable foreign keys to allow the multi-table ID swap
            db.commit() # End any active transaction first
            db.execute(text("PRAGMA foreign_keys = OFF"))
            try:
                target_old = (old_sid or "").strip()
                for model in [Grade, Deficiency, Enrollment]:
                    db.query(model).filter(
                        or_(model.student_id == old_sid, text("trim(student_id) = :oid"))
                    ).params(oid=target_old).update({model.student_id: new_sid}, synchronize_session=False)
                
                student_obj.student_id = new_sid
                if s.first_name: student_obj.first_name = s.first_name
                if s.last_name: student_obj.last_name = s.last_name
                if s.middle_name is not None: student_obj.middle_name = s.middle_name
                if norm_course: student_obj.course = norm_course
                if final_major: student_obj.major = final_major
                if s.year_level: student_obj.year_level = s.year_level
                if s.status: student_obj.status = s.status
                db.commit()
            finally:
                db.execute(text("PRAGMA foreign_keys = ON"))
        else:
            if s.first_name: student_obj.first_name = s.first_name
            if s.last_name: student_obj.last_name = s.last_name
            if s.middle_name is not None: student_obj.middle_name = s.middle_name
            if norm_course: student_obj.course = norm_course
            if final_major: student_obj.major = final_major
            if s.year_level: student_obj.year_level = s.year_level
            if s.status: student_obj.status = s.status
            db.commit()

        db.refresh(student_obj)

    # Prefer the real student_id; fall back to the auto-increment PK only as last resort
    student_id = student_obj.student_id or str(student_obj.student_number)

    # ── Upsert subjects and create enrollments ───────────────────────────────
    count = 0
    for row in data.subjects:
        # Use unified helper to handle creation and descriptive name 'healing'
        subject = find_or_create_subject(
            db, 
            row.subject_code, 
            row.subject_name, 
            int(row.units) if row.units else None
        )

        # Check for existing enrollment
        existing_enroll = db.query(Enrollment).filter(
            Enrollment.student_id == student_id,
            Enrollment.subject_id == subject.subject_id,
            Enrollment.school_year == school_year,
            Enrollment.semester == semester
        ).first()

        if not existing_enroll:
            enroll = Enrollment(
                student_id=student_id,
                subject_id=subject.subject_id,
                semester=semester,
                school_year=school_year,
                instructor=row.instructor,
                schedule=row.schedule,
                units=row.units,
                date_enrolled=today
            )
            db.add(enroll)
            db.commit()
            count += 1
        else:
            # Update instructor if provided
            if row.instructor:
                existing_enroll.instructor = row.instructor
            db.commit()

    log = ImportLog(
        type='COR',
        filename=f"COR - {s.student_name or s.student_id}",
        imported_at=datetime.now().isoformat(),
        records_created=count,
        status='Success'
    )
    db.add(log)
    db.commit()

    return {
        'status': 'success',
        'student_id': student_id,
        'student_name': f'{student_obj.first_name} {student_obj.last_name}',
        'enrollments_created': count,
        'student': student_to_dict(student_obj)
    }