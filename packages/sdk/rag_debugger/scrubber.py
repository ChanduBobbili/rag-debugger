"""PII scrubber — redacts emails, phone numbers, SSNs from event payloads."""
import re

_PATTERNS = [
    (re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'), "[EMAIL]"),
    (re.compile(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'), "[PHONE]"),
    (re.compile(r'\b\d{3}-\d{2}-\d{4}\b'), "[SSN]"),
    (re.compile(r'\bsk-[a-zA-Z0-9]{20,}\b'), "[API_KEY]"),
    # JWT (three base64url segments)
    (re.compile(
        r'\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b'
    ), "[JWT]"),
    # AWS access key
    (re.compile(r'\bAKIA[0-9A-Z]{16}\b'), "[AWS_KEY]"),
    # Anthropic API key
    (re.compile(r'\bsk-ant-[a-zA-Z0-9\-_]{20,}\b'), "[API_KEY]"),
    # HuggingFace token
    (re.compile(r'\bhf_[a-zA-Z0-9]{20,}\b'), "[API_KEY]"),
    # Generic Bearer token (Authorization header value)
    (re.compile(r'(?i)bearer\s+[A-Za-z0-9\-._~+/]+=*'), "[BEARER_TOKEN]"),
    # Credit card (Visa, Mastercard, Amex, Discover)
    (re.compile(
        r'\b(?:4[0-9]{12}(?:[0-9]{3})?'    # Visa
        r'|5[1-5][0-9]{14}'                 # Mastercard
        r'|3[47][0-9]{13}'                  # Amex
        r'|6(?:011|5[0-9]{2})[0-9]{12})\b'  # Discover
    ), "[CREDIT_CARD]"),
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
