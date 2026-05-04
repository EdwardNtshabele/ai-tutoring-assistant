import PyPDF2
import re
import mysql.connector

# ── Connect ───────────────────────────────────────────────────────
try:
    db = mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="ai_tutor_db"
    )
    cursor = db.cursor()
    print("Connected to MySQL!\n")
except mysql.connector.Error as err:
    print(f"MySQL Error: {err}")
    exit()

SUBJECTS = [
    {"subject": "Biology",   "pdf": "0573_Biology.pdf"},
    {"subject": "Chemistry", "pdf": "0570_Chemistry.pdf"},
    # {"subject": "Physics",  "pdf": "0625_Physics.pdf"},
]

# ── Helpers ───────────────────────────────────────────────────────

def fix_spaced_numbers(text):
    """Fix PDF artifact spaces in numbers: '1.1.1 .1.' → '1.1.1.1.'"""
    text = re.sub(r'(\d+\.\d+\.\d+)\s+\.(\d+)', r'\1.\2', text)
    text = re.sub(r'(\d+\.\d+)\s+\.(\d+)', r'\1.\2', text)
    return text

def clean_whitespace(text):
    """Collapse multiple spaces and newlines into single space."""
    return re.sub(r'\s+', ' ', text).strip()

def get_full_text(reader, start_page, end_trigger='MATHEMATICAL SKILLS'):
    """Join all content pages into one string for regex parsing."""
    full = ''
    for i in range(start_page, len(reader.pages)):
        raw = reader.pages[i].extract_text()
        if not raw:
            continue
        if end_trigger in raw:
            break
        full += '\n' + raw
    return fix_spaced_numbers(full)

def find_content_start(reader):
    """Find the page where actual syllabus content begins."""
    for i in range(len(reader.pages)):
        text = reader.pages[i].extract_text() or ''
        # Content starts when we see topic patterns
        if re.search(r'\d+\.\s+MATTER|\d+\.\s+CELL|EXPERIMENTAL.*SKILLS', text):
            return i
    return 8  # fallback

def parse_chemistry_style(full_text):
    """
    Parse PDFs where the table spans 3 columns:
    Topic | General Objective | Specific Objectives
    Subtopic names wrap across multiple lines.
    Uses full-text regex to reconstruct names correctly.
    """
    syllabus_data = []

    # ── Find main topics ──────────────────────────────────────────
    # e.g. "1.  MATTER" "2 CHEMICAL REACTIONS"
    main_topic_pattern = re.finditer(
        r'\b(\d+)\.\s+([A-Z][A-Z\s\-\/]{3,}?)(?=\n|\s{2,}|\d+\.)',
        full_text
    )

    # Collect topic positions
    topics_raw = []
    for m in main_topic_pattern:
        name = clean_whitespace(m.group(2))
        # Skip non-content sections
        if name in ['CONTENT', 'OTHER INFORMATION', 'INTRODUCTION',
                    'SCHEME OF ASSESSMENT', 'APPENDICES', 'GRADING AND REPORTING',
                    'ASSESSMENT CRITERIA FOR PRACTICALS SKILLS']:
            continue
        topics_raw.append((m.start(), name))

    # ── Find subtopics ────────────────────────────────────────────
    # Pattern: X.X. or X.X.X. followed by a name
    # Name may span multiple lines before the general objective number appears
    subtopic_iter = re.finditer(
        r'(\d+\.\d+\.?\d*\.?)\s+((?:[A-Za-z][a-zA-Z\s\-\/\(\)]+?)\s+)'
        r'(?=\d+\.\d+\.?\d*\.?\s+(?:understand|acquire|be aware|investigate|'
        r'apply|know|appreciate|perform|use|recognise))',
        full_text
    )

    subtopics_raw = []
    for m in subtopic_iter:
        num  = m.group(1).strip()
        name = clean_whitespace(m.group(2))
        # Skip if name looks like an objective text
        if len(name.split()) > 8:
            name = ' '.join(name.split()[:6])
        subtopics_raw.append((m.start(), num, name))

    # ── Find specific objectives ──────────────────────────────────
    # Pattern: 4-level number + text, OR dash bullet + text
    objectives_raw = []
    for m in re.finditer(
        r'(\d+\.\d+\.\d+\.\d+)\.?\s+(.+?)(?=\d+\.\d+\.\d+\.\d+|$)',
        full_text, re.DOTALL
    ):
        obj_text = clean_whitespace(m.group(2))
        # Stop at next subtopic number
        obj_text = re.split(r'\d+\.\d+\.?\d*\.?\s+[A-Z]', obj_text)[0]
        obj_text = obj_text.strip()
        if obj_text and len(obj_text) > 5:
            objectives_raw.append((m.start(), m.group(1), obj_text))

    # Also catch dash-bullet objectives
    for m in re.finditer(r'-\s+([a-z].{10,}?)(?=\n-\s+|\n\d+\.|\Z)', full_text):
        obj_text = clean_whitespace(m.group(1))
        if obj_text and len(obj_text) > 5:
            objectives_raw.append((m.start(), 'dash', obj_text))

    objectives_raw.sort(key=lambda x: x[0])

    # ── Associate objectives with subtopics ───────────────────────
    # Build a sorted list of all anchors
    all_anchors = []
    for pos, name in topics_raw:
        all_anchors.append(('topic', pos, name))
    for pos, num, name in subtopics_raw:
        all_anchors.append(('subtopic', pos, num, name))
    all_anchors.sort(key=lambda x: x[1])

    current_topic    = None
    current_subtopic = None

    for anchor in all_anchors:
        if anchor[0] == 'topic':
            topic_name = anchor[2]
            current_topic = {
                'name':      topic_name,
                'subtopics': []
            }
            syllabus_data.append(current_topic)
            current_subtopic = None
            print(f"  TOPIC: {topic_name}")
        elif anchor[0] == 'subtopic' and current_topic:
            num, name = anchor[2], anchor[3]
            current_subtopic = {
                'id':         num,
                'name':       name,
                'objectives': []
            }
            current_topic['subtopics'].append(current_subtopic)
            print(f"    Subtopic: {num} — {name}")

    # Now assign objectives by position
    anchors_sorted = [(a[1], a) for a in all_anchors]

    for obj_pos, obj_num, obj_text in objectives_raw:
        # Find which subtopic this objective belongs to
        # (last subtopic anchor before this position)
        last_subtopic = None
        last_topic    = None
        for anchor_pos, anchor in anchors_sorted:
            if anchor_pos > obj_pos:
                break
            if anchor[0] == 'subtopic':
                last_subtopic = anchor
            elif anchor[0] == 'topic':
                last_topic = anchor

        if last_subtopic:
            # Find the actual subtopic object
            st_num  = last_subtopic[2]
            st_name = last_subtopic[3]
            for topic in syllabus_data:
                for st in topic['subtopics']:
                    if st['id'] == st_num and st['name'] == st_name:
                        st['objectives'].append(obj_text)
                        break

    return syllabus_data


def parse_biology_style(full_text):
    """
    Parse Biology-style PDFs where objectives use bullet points
    and subtopics are cleaner single lines.
    """
    syllabus_data    = []
    current_topic    = None
    current_subtopic = None

    for line in full_text.split('\n'):
        line = line.strip()
        if not line:
            continue

        # Skip noise
        if re.search(r'Assessment Syllabus.*Page \d+', line):
            continue

        # Main topic
        if re.match(r'^\d+\.?\s+[A-Z][A-Z\s]{3,}$', line):
            name = re.sub(r'^\d+\.?\s+', '', line).strip()
            if name in ['CONTENT', 'OTHER INFORMATION', 'INTRODUCTION']:
                continue
            current_topic = {'name': name, 'subtopics': []}
            syllabus_data.append(current_topic)
            current_subtopic = None
            print(f"  TOPIC: {name}")
            continue

        # Subtopic
        m = re.match(r'^(\d+\.\d+\.?\d*\.?)\s+([A-Z][a-zA-Z\s\-\/\(\)]+)', line)
        if m and current_topic:
            num, name = m.group(1).strip(), m.group(2).strip()
            current_subtopic = {'id': num, 'name': name, 'objectives': []}
            current_topic['subtopics'].append(current_subtopic)
            print(f"    Subtopic: {num} — {name}")
            continue

        # Objective (bullet or numbered)
        if current_subtopic:
            obj = None
            if re.match(r'^[•\-]\s+', line):
                obj = re.sub(r'^[•\-]\s+', '', line).strip()
            elif re.match(r'^\d+\.\d+\.\d+\.\d+', line):
                obj = re.sub(r'^\d+\.\d+\.\d+\.\d+\.?\s+', '', line).strip()
            if obj and len(obj) > 5:
                current_subtopic['objectives'].append(obj)

    return syllabus_data


# ── Main ──────────────────────────────────────────────────────────
total_imported = 0

for entry in SUBJECTS:
    subject  = entry["subject"]
    pdf_path = entry["pdf"]

    print(f"\n{'='*60}")
    print(f"Subject: {subject}  |  File: {pdf_path}")
    print(f"{'='*60}")

    try:
        pdf_file   = open(pdf_path, 'rb')
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        print(f"Loaded — {len(pdf_reader.pages)} pages")
    except FileNotFoundError:
        print(f"ERROR: '{pdf_path}' not found — skipping.\n")
        continue

    # Clear old rows
    cursor.execute("DELETE FROM syllabus WHERE subject = %s", (subject,))
    print(f"Cleared old {subject} rows.")

    # Find where content starts
    start_page = find_content_start(pdf_reader)
    print(f"Content starts at page {start_page + 1}")

    # Get full text
    full_text = get_full_text(pdf_reader, start_page)

    # Use Chemistry-specific parser for Chemistry, Biology parser for others
    if subject == "Chemistry":
        print("Using Chemistry parser (multi-line table format)...")
        syllabus_data = parse_chemistry_style(full_text)
    else:
        print("Using Biology parser (bullet-point format)...")
        syllabus_data = parse_biology_style(full_text)

    # ── Insert into DB ────────────────────────────────────────────
    print(f"\nInserting into DB...")
    insert_count = 0

    for topic in syllabus_data:
        if not topic.get('name'):
            continue

        cursor.execute("""
            INSERT INTO syllabus (subject, topic_name, general_objective)
            VALUES (%s, %s, %s)
        """, (subject, topic['name'], ''))
        topic_db_id  = cursor.lastrowid
        insert_count += 1

        for st in topic.get('subtopics', []):
            if not st.get('name') or len(st['name']) < 2:
                continue
            obj_text = '\n'.join(st.get('objectives', []))
            cursor.execute("""
                INSERT INTO syllabus
                    (subject, topic_name, subtopic_name, objectives, parent_topic_id)
                VALUES (%s, %s, %s, %s, %s)
            """, (subject, topic['name'], st['name'], obj_text, topic_db_id))
            insert_count += 1

    db.commit()
    pdf_file.close()
    total_imported += insert_count

    topics_count    = len(syllabus_data)
    subtopics_count = sum(len(t.get('subtopics', [])) for t in syllabus_data)
    objectives_count = sum(
        len(st.get('objectives', []))
        for t in syllabus_data
        for st in t.get('subtopics', [])
    )

    print(f"\n✅ {subject} complete!")
    print(f"   Main topics : {topics_count}")
    print(f"   Subtopics   : {subtopics_count}")
    print(f"   Objectives  : {objectives_count}")
    print(f"   DB rows     : {insert_count}")

cursor.close()
db.close()
print(f"\n{'='*60}")
print(f"ALL DONE — Total rows inserted: {total_imported}")
print(f"{'='*60}")