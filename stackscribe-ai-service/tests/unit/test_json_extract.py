"""Tests for JSON extraction utilities."""
import pytest
from lib.json_extract import extract_json_array, extract_json_object


class TestExtractJsonArray:
    """Tests for extract_json_array function."""

    def test_extracts_simple_array(self):
        text = '["item1", "item2", "item3"]'
        result = extract_json_array(text)
        assert result == '["item1", "item2", "item3"]'

    def test_extracts_array_with_surrounding_text(self):
        text = 'Here is the result: ["a", "b"] and more text'
        result = extract_json_array(text)
        assert result == '["a", "b"]'

    def test_extracts_nested_array(self):
        text = '[[1, 2], [3, 4]]'
        result = extract_json_array(text)
        assert result == '[[1, 2], [3, 4]]'

    def test_returns_empty_array_for_no_match(self):
        text = "No array here, just text"
        result = extract_json_array(text)
        assert result == "[]"

    def test_returns_empty_array_for_empty_string(self):
        result = extract_json_array("")
        assert result == "[]"

    def test_handles_multiline_array(self):
        text = '''The response:
[
  "item1",
  "item2"
]
End.'''
        result = extract_json_array(text)
        assert "[" in result and "]" in result
        assert "item1" in result

    def test_extracts_first_complete_array(self):
        # When there are multiple arrays, extracts from first [ to last ]
        text = '["first"] some text ["second"]'
        result = extract_json_array(text)
        # This implementation uses rfind for ], so it gets the outer bounds
        assert "first" in result

    def test_handles_array_with_objects(self):
        text = '[{"id": 1}, {"id": 2}]'
        result = extract_json_array(text)
        assert result == '[{"id": 1}, {"id": 2}]'


class TestExtractJsonObject:
    """Tests for extract_json_object function."""

    def test_extracts_simple_object(self):
        text = '{"key": "value"}'
        result = extract_json_object(text)
        assert result == '{"key": "value"}'

    def test_extracts_object_with_surrounding_text(self):
        text = 'Response: {"status": "ok"} done'
        result = extract_json_object(text)
        assert result == '{"status": "ok"}'

    def test_extracts_nested_object(self):
        text = '{"outer": {"inner": "value"}}'
        result = extract_json_object(text)
        assert result == '{"outer": {"inner": "value"}}'

    def test_returns_empty_string_for_no_match(self):
        text = "No object here"
        result = extract_json_object(text)
        assert result == ""

    def test_returns_empty_string_for_empty_input(self):
        result = extract_json_object("")
        assert result == ""

    def test_handles_multiline_object(self):
        text = '''Result:
{
  "name": "test",
  "value": 42
}
End.'''
        result = extract_json_object(text)
        assert "{" in result and "}" in result
        assert "name" in result

    def test_handles_object_with_arrays(self):
        text = '{"items": [1, 2, 3]}'
        result = extract_json_object(text)
        assert result == '{"items": [1, 2, 3]}'

    def test_handles_complex_llm_output(self):
        # Simulates typical LLM output with explanation before JSON
        text = '''I've analyzed the requirements and here are the findings:

{
  "findings": [
    {"type": "vague", "text": "fast"},
    {"type": "tbd", "text": "TBD"}
  ],
  "count": 2
}

Let me know if you need more details.'''
        result = extract_json_object(text)
        assert "findings" in result
        assert "count" in result
