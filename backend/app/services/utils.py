import json
from typing import Dict, Any

def parse_care_plan_text(raw: str) -> Dict[str, Any]:
    """
    Parses the raw JSON string from Gemini into structured lists for the UI.
    Equivalent to the TypeScript parseCarePlanText function.
    """
    # 1. Handle empty or None values (Your exact TS snippet logic)
    trimmed = (raw or "").strip()
    if not trimmed:
        return {"planLines": [], "summaryLines": [], "rawText": ""}

    # 2. Parse the JSON and extract the arrays
    try:
        # Clean up Markdown formatting just in case Gemini ignored the prompt
        clean_text = trimmed
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        if clean_text.startswith("```"):
            clean_text = clean_text[3:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
        clean_text = clean_text.strip()

        parsed_data = json.loads(clean_text)
        
        # Format the dictionary into a list of strings: "Morning: Take medicine"
        care_plan_dict = parsed_data.get("care_plan", {})
        plan_lines = [f"{time}: {task}" for time, task in care_plan_dict.items()]
        
        summary_lines = parsed_data.get("summarization", [])

        return {
            "planLines": plan_lines,
            "summaryLines": summary_lines,
            "rawText": clean_text
        }

    except json.JSONDecodeError:
        # Fallback if Gemini returned plain text instead of JSON
        return {
            "planLines": [],
            "summaryLines": [],
            "rawText": trimmed
        }