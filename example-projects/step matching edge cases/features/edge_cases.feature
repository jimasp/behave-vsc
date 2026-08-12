Feature: Step matching edge cases

  This description block deliberately wraps across multiple lines, including one
  and this line starts with the word "and" but is still just feature description text,
  not a step - it appears before any Scenario and must never be treated as one.

  Scenario: multi-line decorator with a trailing comment on its closing paren
    Given a multiline decorated step with a trailing comment
    And a second step defined after the commented decorator

  Scenario: mixed quote implicit string concatenation
    Given a step built from two string literals with different quote characters

  Scenario: trailing colon on the step definition itself
    Given a step definition that itself ends with a colon:

  Scenario Outline: scenario outline placeholder matches a fixed word in the step definition
    Given a step fixed to the word <Word>

    Examples:
      | Word           |
      | specific-value |

  Scenario: docstring containing an and-prefixed line
    Given a step with a docstring argument
      """
      first line of the docstring
      and this line starts with "and" but is inside the docstring, not a step
      """

  Scenario: multi-line decorator whose literal ends in a quoted parameter
    Given a step whose literal ends with a quoted parameter "some-value"
