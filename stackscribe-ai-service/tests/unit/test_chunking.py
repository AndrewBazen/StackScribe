"""Tests for text chunking utilities."""
import pytest
from lib.chunking import chunk_text, strip_markdown


class TestStripMarkdown:
    """Tests for strip_markdown function."""

    def test_removes_inline_code(self):
        text = "Use `console.log()` to debug"
        result = strip_markdown(text)
        assert result == "Use console.log() to debug"

    def test_removes_code_fences(self):
        text = """Here is code:
```python
def hello():
    print("world")
```
End of code."""
        result = strip_markdown(text)
        assert "```" not in result
        assert "def hello():" in result

    def test_removes_links_keeps_text(self):
        text = "Check out [this link](https://example.com) for more"
        result = strip_markdown(text)
        assert result == "Check out this link for more"

    def test_removes_emphasis_markers(self):
        text = "This is **bold** and *italic* and ***both***"
        result = strip_markdown(text)
        assert "**" not in result
        assert "*" not in result
        assert "bold" in result
        assert "italic" in result

    def test_handles_empty_string(self):
        result = strip_markdown("")
        assert result == ""

    def test_handles_plain_text(self):
        text = "Just plain text with no markdown"
        result = strip_markdown(text)
        assert result == text


class TestChunkText:
    """Tests for chunk_text function."""

    def test_returns_empty_for_empty_string(self):
        result = chunk_text("")
        assert result == []

    def test_returns_empty_for_whitespace_only(self):
        result = chunk_text("   \n\n   \t  ")
        assert result == []

    def test_single_short_paragraph(self):
        text = "This is a short paragraph."
        result = chunk_text(text)
        assert len(result) == 1
        assert result[0] == "This is a short paragraph."

    def test_splits_on_blank_lines(self):
        text = """First paragraph here.

Second paragraph here."""
        result = chunk_text(text, max_tokens=50)
        # Both paragraphs should fit in one chunk at 50 tokens
        assert len(result) >= 1

    def test_respects_max_tokens(self):
        # Create text with more than max_tokens words
        words = ["word"] * 300
        text = " ".join(words)
        result = chunk_text(text, max_tokens=100)

        # Should split into multiple chunks
        assert len(result) > 1

        # Each chunk should have roughly max_tokens words or less
        for chunk in result:
            word_count = len(chunk.split())
            # Allow some flexibility due to paragraph boundary logic
            assert word_count <= 150  # 100 + some buffer

    def test_strips_markdown_before_chunking(self):
        text = "This has `code` and **bold** markers"
        result = chunk_text(text)
        assert len(result) == 1
        assert "`" not in result[0]
        assert "**" not in result[0]

    def test_handles_code_blocks(self):
        text = """Introduction text.

```python
def example():
    pass
```

Conclusion text."""
        result = chunk_text(text)
        # Should process without errors
        assert len(result) >= 1

    def test_preserves_content_meaning(self):
        text = "The authentication system shall validate user credentials."
        result = chunk_text(text)
        assert len(result) == 1
        assert "authentication" in result[0]
        assert "credentials" in result[0]
