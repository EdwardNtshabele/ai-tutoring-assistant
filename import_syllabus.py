import PyPDF2
import re
import mysql.connector

# Connect to MySQL
try:
    db = mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="ai_tutor_db"
    )
    cursor = db.cursor()
    print("Connected to MySQL successfully!")
except mysql.connector.Error as err:
    print(f"MySQL Connection Error: {err}")
    exit()

# Read PDF
try:
    pdf_file = open('0573_Biology.pdf', 'rb')
    pdf_reader = PyPDF2.PdfReader(pdf_file)
    print(f"PDF loaded successfully! Pages: {len(pdf_reader.pages)}")
except FileNotFoundError:
    print("PDF file not found!")
    exit()

# Clear existing data
cursor.execute("DELETE FROM syllabus WHERE subject = 'Biology'")
print("Cleared existing Biology syllabus")

# Store all syllabus data
syllabus_data = []
current_topic = None
current_subtopic = None

for page_num in range(len(pdf_reader.pages)):
    page = pdf_reader.pages[page_num]
    text = page.extract_text()
    
    if not text:
        continue
    
    lines = text.split('\n')
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        
        # Find TOPICS (e.g., "3. Nutrition" or "1.0 CELL PROCESSES")
        topic_match = re.match(r'^(\d+\.\d+|\d+\.)\s+([A-Z][A-Z\s]+)', line)
        if topic_match:
            topic_id = topic_match.group(1).strip()
            topic_name = topic_match.group(2).strip()
            current_topic = {
                'id': topic_id,
                'name': topic_name,
                'general_objective': '',
                'subtopics': []
            }
            syllabus_data.append(current_topic)
            print(f"Topic: {topic_id} - {topic_name}")
            continue
        
        # Find GENERAL OBJECTIVES
        if current_topic and ('general objective' in line.lower() or 'general objectives' in line.lower()):
            # Look ahead to get the full general objective
            go_text = line
            j = i + 1
            while j < len(lines) and not re.match(r'^\d+\.', lines[j]) and 'specific objective' not in lines[j].lower():
                if lines[j].strip():
                    go_text += ' ' + lines[j].strip()
                j += 1
            current_topic['general_objective'] = go_text
            print(f"  General: {go_text[:80]}...")
            continue
        
        # Find SUBTOPICS (e.g., "3.3 Plant nutrition")
        subtopic_match = re.match(r'^(\d+\.\d+\.\d+|\d+\.\d+)\s+([A-Z][a-zA-Z\s]+)', line)
        if subtopic_match and current_topic:
            subtopic_id = subtopic_match.group(1).strip()
            subtopic_name = subtopic_match.group(2).strip()
            current_subtopic = {
                'id': subtopic_id,
                'name': subtopic_name,
                'objectives': []
            }
            current_topic['subtopics'].append(current_subtopic)
            print(f"  Subtopic: {subtopic_id} - {subtopic_name}")
            continue
        
        # Find SPECIFIC OBJECTIVES (bullet points)
        if current_subtopic and re.match(r'^[•\-]\s*', line):
            objective = re.sub(r'^[•\-]\s*', '', line)
            current_subtopic['objectives'].append(objective)
            print(f"    - {objective[:60]}...")
            continue
        
        # Also catch objectives numbered like "3.3.1.1 define photosynthesis"
        if current_subtopic and re.match(r'^\d+\.\d+\.\d+\.\d+\s+', line):
            objective = re.sub(r'^\d+\.\d+\.\d+\.\d+\s+', '', line)
            current_subtopic['objectives'].append(objective)
            print(f"    - {objective[:60]}...")
            continue

# Insert into database
print("\nInserting data into database...")
insert_count = 0

for topic in syllabus_data:
    # Insert topic with general objective
    sql = """INSERT INTO syllabus 
             (subject, topic_name, general_objective) 
             VALUES (%s, %s, %s)"""
    cursor.execute(sql, ('Biology', topic['name'], topic['general_objective']))
    topic_db_id = cursor.lastrowid
    insert_count += 1
    
    # Insert subtopics with specific objectives
    for subtopic in topic['subtopics']:
        objectives_text = '\n'.join(subtopic['objectives'])
        sql = """INSERT INTO syllabus 
                 (subject, topic_name, subtopic_name, objectives, parent_topic_id) 
                 VALUES (%s, %s, %s, %s, %s)"""
        cursor.execute(sql, (
            'Biology', 
            topic['name'], 
            subtopic['name'], 
            objectives_text,
            topic_db_id
        ))
        insert_count += 1

db.commit()
cursor.close()
db.close()

print(f"\nDone! Imported {insert_count} syllabus items.")
print(f"Total topics found: {len(syllabus_data)}")