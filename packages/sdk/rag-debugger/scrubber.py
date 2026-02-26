"""PII scrubber — redacts emails, phone numbers, SSNs from event payloads."""
import re

_PATTERNS = [
    (re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'), "[EMAIL]"),
    (re.compile(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'), "[PHONE]"),
    (re.compile(r'\b\d{3}-\d{2}-\d{4}\b'), "[SSN]"),
    (re.compile(r'\bsk-[a-zA-Z0-9]{20,}\b'), "[API_KEY]"),
]


def scrub(value):
    """Recursively scrub PII from strings, dicts, and lists."""
    if isinstance(value, str):
        if not value:
            return value
        for pattern, replacement in _PATTERNS:
            value = pattern.sub(replacement, value)
        return value
    elif isinstance(value, dict):
        return {k: scrub(v) for k, v in value.items()}
    elif isinstance(value, list):
        return [scrub(item) for item in value]
    return value


def scrub_event(event: dict) -> dict:
    """Scrub PII from all string fields recursively in an event dict."""
    return scrub(event)
