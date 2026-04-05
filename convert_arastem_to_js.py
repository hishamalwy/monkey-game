import json
import re
import ast
from datasets import load_dataset

OUTPUT_FILE = "survivalQuestions.js"

ANSWER_MAP = {
    "أ": 0, "ب": 1, "ج": 2, "د": 3,
    "A": 0, "B": 1, "C": 2, "D": 3,
    "a": 0, "b": 1, "c": 2, "d": 3,
    "1": 0, "2": 1, "3": 2, "4": 3,
    0: 0, 1: 1, 2: 2, 3: 3,
}

def s(x):
    return "" if x is None else str(x).strip()

def clean_text(text):
    text = s(text)
    text = text.replace("\r", " ").replace("\n", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text

def answer_to_index(raw):
    text = clean_text(raw)

    if text in ANSWER_MAP:
        return ANSWER_MAP[text]

    # لو النص فيه ضوضاء، خذ آخر رمز صالح
    for ch in reversed(text):
        if ch in ["أ", "ب", "ج", "د", "A", "B", "C", "D", "a", "b", "c", "d", "1", "2", "3", "4"]:
            return ANSWER_MAP[ch]

    return None

def parse_list_like_string(raw):
    if isinstance(raw, list):
        return [clean_text(x) for x in raw]

    text = s(raw)
    if not text:
        return None

    try:
        parsed = ast.literal_eval(text)
        if isinstance(parsed, list):
            return [clean_text(x) for x in parsed]
    except Exception:
        pass

    return None

def parse_arastem_choices(raw):
    text = clean_text(raw)
    if not text:
        return None

    # محاولة 1: string list
    parsed = parse_list_like_string(raw)
    if parsed and len(parsed) == 4:
        cleaned = []
        for opt in parsed:
            opt = re.sub(r"^\(?[أبجد]\)?\s*\)?\s*", "", opt)
            cleaned.append(clean_text(opt))
        if all(cleaned):
            return cleaned

    # محاولة 2: split بالنمط العربي
    patterns = [
        r"\(أ\)\s*\)?\s*(.*?)\s*\(ب\)\s*\)?\s*(.*?)\s*\(ج\)\s*\)?\s*(.*?)\s*\(د\)\s*\)?\s*(.*)",
        r"أ\)\s*(.*?)\s*ب\)\s*(.*?)\s*ج\)\s*(.*?)\s*د\)\s*(.*)",
    ]

    for pat in patterns:
        m = re.search(pat, text)
        if m:
            opts = [clean_text(x) for x in m.groups()]
            opts = [re.sub(r"^[\)\.\-\s]+|[\)\.\-\s]+$", "", x) for x in opts]
            if len(opts) == 4 and all(opts):
                return opts

    return None

def normalize_arastem(item):
    q = clean_text(item.get("question"))
    a = parse_arastem_choices(item.get("choices"))
    correct = answer_to_index(item.get("self_answer"))

    if not q or not a or len(a) != 4 or correct is None:
        return None

    return {"q": q, "a": a, "correct": correct}

def normalize_arabicmmlu(item):
    q = clean_text(item.get("Question"))
    if not q:
        return None

    options = [
        clean_text(item.get("Option 1")),
        clean_text(item.get("Option 2")),
        clean_text(item.get("Option 3")),
        clean_text(item.get("Option 4")),
    ]

    if not all(options):
        return None

    correct = answer_to_index(item.get("Answer Key"))
    if correct is None or correct >= 4:
        return None

    return {"q": q, "a": options, "correct": correct}

def normalize_arabculture_egypt(item):
    q = clean_text(item.get("first_statement"))
    if not q:
        return None

    options = parse_list_like_string(item.get("options"))
    if not options or len(options) != 4:
        return None

    options = [clean_text(x) for x in options]
    if not all(options):
        return None

    correct = answer_to_index(item.get("answer_key"))
    if correct is None or correct >= 4:
        return None

    return {"q": q, "a": options, "correct": correct}

def normalize_cidar(item):
    q = clean_text(item.get("Question"))
    options = [
        clean_text(item.get("A")),
        clean_text(item.get("B")),
        clean_text(item.get("C")),
        clean_text(item.get("D")),
    ]

    if not q or not all(options):
        return None

    correct = answer_to_index(item.get("answer"))
    if correct is None or correct >= 4:
        return None

    return {"q": q, "a": options, "correct": correct}

def normalize_nativeqa(item):
    q = clean_text(item.get("question_text"))
    if not q:
        return None

    options = parse_list_like_string(item.get("choices"))
    if not options or len(options) != 4:
        return None

    options = [clean_text(x) for x in options]
    if not all(options):
        return None

    correct = answer_to_index(item.get("correct_choice"))
    if correct is None or correct >= 4:
        return None

    return {"q": q, "a": options, "correct": correct}

def dedupe(items):
    seen = set()
    out = []
    for x in items:
        key = (x["q"], tuple(x["a"]), x["correct"])
        if key not in seen:
            seen.add(key)
            out.append(x)
    return out

def process_rows(rows, normalizer, label, all_questions):
    added = 0
    skipped = 0

    for item in rows:
        try:
            normalized = normalizer(item)
            if normalized:
                all_questions.append(normalized)
                added += 1
            else:
                skipped += 1
        except Exception:
            skipped += 1

    print(f"{label}")
    print(f"  Added   : {added}")
    print(f"  Skipped : {skipped}")

def write_js(data, filename):
    with open(filename, "w", encoding="utf-8") as f:
        f.write("export const survivalQuestions = [\n")
        for i, item in enumerate(data):
            comma = "," if i < len(data) - 1 else ""
            f.write(f"  {json.dumps(item, ensure_ascii=False)}{comma}\n")
        f.write("];\n\n")
        f.write("export function getRandomSurvivalQuestions(count) {\n")
        f.write("  const shuffled = [...survivalQuestions].sort(() => 0.5 - Math.random());\n")
        f.write("  return shuffled.slice(0, count);\n")
        f.write("}\n")

def main():
    all_questions = []

    # AraSTEM
    ds = load_dataset("we-z/Arabic-STEM-MCQ", split="test")
    process_rows(ds, normalize_arastem, "AraSTEM/test", all_questions)

    # ArabicMMLU - All
    ds = load_dataset("MBZUAI/ArabicMMLU", "All")
    for split in ds:
        process_rows(ds[split], normalize_arabicmmlu, f"ArabicMMLU/{split}", all_questions)

    # ArabCulture - Egypt only
    ds = load_dataset("MBZUAI/ArabCulture", "Egypt")
    for split in ds:
        process_rows(ds[split], normalize_arabculture_egypt, f"ArabCulture/Egypt/{split}", all_questions)

    # CIDAR
    ds = load_dataset("arbml/CIDAR-MCQ-100")
    for split in ds:
        process_rows(ds[split], normalize_cidar, f"CIDAR/{split}", all_questions)

    # NativeQA
    ds = load_dataset("tiiuae/NativeQA")
    for split in ds:
        process_rows(ds[split], normalize_nativeqa, f"NativeQA/{split}", all_questions)

    all_questions = dedupe(all_questions)

    print("\n========== FINAL ==========")
    print("Total unique MCQ questions:", len(all_questions))

    write_js(all_questions, OUTPUT_FILE)
    print("Saved file:", OUTPUT_FILE)

if __name__ == "__main__":
    main()