from rag_debugger.scrubber import scrub


def test_email_redacted():
    assert scrub("Email user@example.com here") == "Email [EMAIL] here"


def test_ssn_redacted():
    assert "[SSN]" in scrub("SSN: 123-45-6789")


def test_api_key_redacted():
    assert "[API_KEY]" in scrub("key=sk-abc123def456ghi789jkl012")


def test_jwt_redacted():
    jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
    assert "[JWT]" in scrub(jwt)


def test_aws_key_redacted():
    assert "[AWS_KEY]" in scrub("AKIAIOSFODNN7EXAMPLE")


def test_anthropic_key_redacted():
    assert "[API_KEY]" in scrub("sk-ant-api01-abc123def456ghi789")


def test_huggingface_token_redacted():
    assert "[API_KEY]" in scrub("token: hf_FakeToken1234567890")


def test_credit_card_redacted():
    assert "[CREDIT_CARD]" in scrub("card: 4111111111111111")


def test_nested_dict_scrubbed():
    data = {"user": {"email": "a@b.com", "text": "normal"}}
    result = scrub(data)
    assert result["user"]["email"] == "[EMAIL]"
    assert result["user"]["text"] == "normal"


def test_list_scrubbed():
    assert "[EMAIL]" in scrub(["hello", "user@example.com"])[1]


def test_clean_string_unchanged():
    assert scrub("The quick brown fox") == "The quick brown fox"
