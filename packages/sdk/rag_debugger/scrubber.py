"""PII scrubber — redacts emails, phone numbers, SSNs from event payloads."""
import re

_PATTERNS = [
    (re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'), "[EMAIL]"),
    (re.compile(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'), "[PHONE]"),
    (re.compile(r'\b\d{3}-\d{2}-\d{4}\b'), "[SSN]"),
    (re.compile(r'\bsk-[a-zA-Z0-9]{20,}\b'), "[API_KEY]"),
]


def scrub(text: str | None) -> str | None:
    if not text:
        return text
    for pattern, replacement in _PATTERNS:
        text = pattern.sub(replacement, text)
    return text


def scrub_event(event: dict) -> dict:
    """Scrub PII from string fields in an event dict."""
    scrubbed = dict(event)
    for field in ["query_text", "generated_answer", "error"]:
        if field in scrubbed:
            scrubbed[field] = scrub(scrubbed[field])
    return scrubbed
