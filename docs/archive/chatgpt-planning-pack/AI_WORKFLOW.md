# Boogle Dox — AI Workflow & My Engineering Judgment

**Status:** Draft. Replace all bracketed items with specific, truthful examples from the implementation before submitting.

## How I approached AI use

I used AI as a development tool, not as a substitute for deciding what the product should be. My first step was deciding what I wanted Boogle Dox to feel like: a recognizable document editor with naming, useful formatting, a familiar menu bar, and reliable sharing. I specifically considered a controlled editing experience because simultaneous editing can become confusing. I also decided that reliable saving and access permissions matter more than trying to recreate Google Docs in a few hours.

## Tools I used

- ChatGPT: helped me organize requirements, evaluate tradeoffs, and draft the planning documents. I reviewed and customized the product direction.
- [Add Claude Desktop if used for this implementation, with a concrete example.]
- [Add Cursor if used for this implementation, with a concrete example.]

## Where AI saved time

[Replace with concrete examples after the build: e.g., generating the first pass of a Tiptap toolbar, suggesting a schema, proposing test cases, or debugging a specific issue. Only include work that actually happened.]

## What I changed or rejected

[Replace with one or two actual examples. For instance, if AI suggested building live simultaneous editing, explain that you intentionally postponed it because access control and persistence were more important within the timebox. Do not claim to have rejected generated code unless you did.]

## How I verified the output

I planned to verify behavior through running the application and tests rather than assuming generated code was correct. My verification checklist includes creating and reopening a formatted document; importing files; logging in as different users; checking that viewers cannot send write requests; checking that unauthorized document links are denied; and using the deployed version in a clean browser session.

**Actual tests performed:** [Add tests run, result, and any failures fixed.]  
**Manual verification performed:** [Add concrete flows verified and browser/device.]  
**Known issues:** [Add truthful outstanding limitations.]

## My view of AI in engineering

AI can help move through repetitive setup, documentation, test ideas, and debugging faster. I still need to understand the code I ship, decide which features matter, verify edge cases, and own the final implementation. For this assignment, I want the reviewer to see my prioritization and reasoning as clearly as the product itself.
