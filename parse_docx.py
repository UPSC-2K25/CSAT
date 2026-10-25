import os
import re
import json
from docx import Document

def parse_question_block(qno, block_text, year):
    # Separate Explanation
    exp_split = re.split(r'\n\s*Explanation:\s*', block_text, flags=re.IGNORECASE)
    explanation = exp_split[1].strip() if len(exp_split) > 1 else ""
    body = exp_split[0]
    
    # Priority: Online-verified answer > Answer > Your uploaded key
    ans = ""
    ov = re.search(r'Online-verified answer:\s*\(?([A-D])\)?', body, re.IGNORECASE)
    if ov:
        ans = ov.group(1).upper()
    else:
        av = re.search(r'(?:Answer|Your uploaded key):\s*\(?([A-D])\)?', body, re.IGNORECASE)
        if av:
            ans = av.group(1).upper()

    is_dropped = bool(re.search(r'Question dropped by UPSC', body, re.IGNORECASE))

    # Strip answer metadata before extracting options
    body_clean = re.split(
        r'\n\s*(?:Answer:|Key discrepancy|Question dropped|Your uploaded key:|Official status:)', 
        body, 
        flags=re.IGNORECASE
    )[0]
    
    # Extract options (a), (b), (c), (d)
    lines = body_clean.split('\n')
    q_lines = []
    options = {}
    current_opt = None
    opt_regex = re.compile(r'^\s*\(([a-d])\)\s*(.*)', re.IGNORECASE)

    for line in lines:
        m = opt_regex.match(line)
        if m:
            current_opt = m.group(1).lower()
            options[current_opt] = m.group(2).strip()
        elif current_opt:
            options[current_opt] += " " + line.strip()
        else:
            q_lines.append(line)
            
    q_text = "\n".join(q_lines).strip()

    return {
        "id": f"{year}_Q{qno}",
        "year": int(year),
        "qno": int(qno),
        "question": q_text,
        "options": options,
        "answer": ans,
        "is_dropped": is_dropped,
        "explanation": explanation
    }

def process_all_documents():
    all_questions = []
    docx_files = [f for f in os.listdir('.') if f.endswith('.docx')]

    if not docx_files:
        print("No .docx files found in this directory.")
        # Writes an empty JSON list so the app correctly shows 'Data not found'
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump([], f)
        return

    for docx_file in sorted(docx_files):
        year_match = re.search(r'(20\d\d)', docx_file)
        year = int(year_match.group(1)) if year_match else 2022

        doc = Document(docx_file)
        full_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip() != ""])

        q_pattern = re.compile(r'(?:^|\n)Q(\d+)\.\s*(.*?)(?=(?:\nQ\d+\.|\Z))', re.DOTALL)
        matches = list(q_pattern.finditer(full_text))
        print(f"Read {docx_file}: Extracted {len(matches)} questions.")

        for m in matches:
            qno = m.group(1)
            block_text = m.group(2).strip()
            all_questions.append(parse_question_block(qno, block_text, year))

    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)

    print(f"\nSaved {len(all_questions)} questions across all years to 'data.json'.")

if __name__ == '__main__':
    process_all_documents()